/**
 * デバイス間同期フック
 *
 * 設定をテキストコード（Base64）としてエクスポート/インポートし、
 * クリップボードやメッセージアプリ経由でデバイス間同期を実現する。
 *
 * Chrome はブラウザ同期で localStorage/IndexedDB を同期しないため、
 * アプリレベルで設定転送の仕組みを提供する。
 *
 * @responsibility R:unclassified
 */
import { useState, useCallback } from 'react'
import { z } from 'zod'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { useUiStore } from '@/application/stores/uiStore'
import type { AppSettings } from '@/domain/models/storeTypes'

/** 設定コードのプレフィックス（バリデーション用） */
const SETTINGS_CODE_PREFIX = 'SHIIRE_SETTINGS:'

/** 設定コード生成結果 */
export interface SettingsCodeResult {
  readonly code: string
  readonly byteSize: number
}

/** 設定コードインポート結果 */
export interface SettingsImportResult {
  readonly success: boolean
  readonly error?: string
  readonly keysUpdated?: number
}

/**
 * Unicode 対応 Base64 エンコード
 * btoa は Latin1 のみ対応のため、TextEncoder 経由でエンコードする。
 */
function unicodeToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  for (const b of bytes) {
    binary += String.fromCharCode(b)
  }
  return btoa(binary)
}

/**
 * Unicode 対応 Base64 デコード
 */
function base64ToUnicode(base64: string): string {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder().decode(bytes)
}

/**
 * AppSettings を転送用テキストコードにエンコードする。
 * targetYear / targetMonth は転送先で意味が異なるため除外する。
 */
export function encodeSettingsCode(settings: AppSettings): SettingsCodeResult {
  // 年月はデバイス固有なので除外
  const transferable: Record<string, unknown> = { ...settings }
  delete transferable.targetYear
  delete transferable.targetMonth
  const json = JSON.stringify(transferable)
  const base64 = unicodeToBase64(json)
  const code = SETTINGS_CODE_PREFIX + base64
  return { code, byteSize: new TextEncoder().encode(code).length }
}

/**
 * 転送可能な AppSettings フィールドの Zod スキーマ。
 * targetYear / targetMonth はデバイス固有のため除外。
 * 未知キーは strip される（strict ではなく passthrough でもない）。
 */
const TransferableSettingsSchema = z
  .object({
    targetGrossProfitRate: z.number(),
    warningThreshold: z.number(),
    flowerCostRate: z.number(),
    directProduceCostRate: z.number(),
    defaultMarkupRate: z.number(),
    defaultBudget: z.number(),
    dataEndDay: z.number().nullable(),
    gpDiffBlueThreshold: z.number(),
    gpDiffYellowThreshold: z.number(),
    gpDiffRedThreshold: z.number(),
    discountBlueThreshold: z.number(),
    discountYellowThreshold: z.number(),
    discountRedThreshold: z.number(),
    supplierCategoryMap: z.record(z.string(), z.string()),
    userCategoryLabels: z.record(z.string(), z.string()),
    prevYearSourceYear: z.number().nullable(),
    prevYearSourceMonth: z.number().nullable(),
    prevYearDowOffset: z.number().nullable(),
    alignmentPolicy: z.enum(['sameDate', 'sameDayOfWeek']),
    conditionConfig: z.object({
      global: z.record(z.string(), z.unknown()),
      storeOverrides: z.record(z.string(), z.unknown()),
    }),
    storeLocations: z.record(z.string(), z.unknown()),
  })
  .partial()

/**
 * テキストコードから AppSettings（部分）をデコードする。
 * Zod スキーマで未知キー除去と型検証を行う。
 */
export function decodeSettingsCode(code: string): Partial<AppSettings> {
  const trimmed = code.trim()
  if (!trimmed.startsWith(SETTINGS_CODE_PREFIX)) {
    throw new Error('無効な設定コードです。SHIIRE_SETTINGS: で始まるコードを入力してください。')
  }
  const base64 = trimmed.slice(SETTINGS_CODE_PREFIX.length)
  const json = base64ToUnicode(base64)
  const raw: unknown = JSON.parse(json)
  // 基本的な型チェック
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('設定コードの形式が不正です。')
  }
  const result = TransferableSettingsSchema.safeParse(raw)
  if (!result.success) {
    throw new Error(`設定コードの内容が不正です: ${result.error.issues[0]?.message ?? '型不一致'}`)
  }
  return result.data as Partial<AppSettings>
}

export function useDeviceSync() {
  const [isCopied, setIsCopied] = useState(false)
  const [importResult, setImportResult] = useState<SettingsImportResult | null>(null)

  /** 現在の設定をテキストコードとしてクリップボードにコピー */
  const copySettingsCode = useCallback(async (): Promise<SettingsCodeResult | null> => {
    try {
      const settings = useSettingsStore.getState().settings
      const result = encodeSettingsCode(settings)
      await navigator.clipboard.writeText(result.code)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 3000)
      return result
    } catch {
      return null
    }
  }, [])

  /** クリップボードから設定コードを読み取って適用 */
  const importFromClipboard = useCallback(async (): Promise<SettingsImportResult> => {
    try {
      const text = await navigator.clipboard.readText()
      const partial = decodeSettingsCode(text)
      const keysUpdated = Object.keys(partial).length
      useSettingsStore.getState().updateSettings(partial)
      useUiStore.getState().invalidateCalculation()
      const result: SettingsImportResult = { success: true, keysUpdated }
      setImportResult(result)
      return result
    } catch (err) {
      const result: SettingsImportResult = {
        success: false,
        error: err instanceof Error ? err.message : '設定コードの読み取りに失敗しました。',
      }
      setImportResult(result)
      return result
    }
  }, [])

  /** テキスト入力から設定コードを適用（クリップボード API 非対応時のフォールバック） */
  const importFromText = useCallback((text: string): SettingsImportResult => {
    try {
      const partial = decodeSettingsCode(text)
      const keysUpdated = Object.keys(partial).length
      useSettingsStore.getState().updateSettings(partial)
      useUiStore.getState().invalidateCalculation()
      const result: SettingsImportResult = { success: true, keysUpdated }
      setImportResult(result)
      return result
    } catch (err) {
      const result: SettingsImportResult = {
        success: false,
        error: err instanceof Error ? err.message : '設定コードの読み取りに失敗しました。',
      }
      setImportResult(result)
      return result
    }
  }, [])

  /** Web Share API が利用可能か */
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator

  /** Web Share API でバックアップファイルを共有する */
  const shareBackupFile = useCallback(
    async (blob: Blob): Promise<boolean> => {
      if (!canShare) return false
      try {
        const isGz = blob.type !== 'application/json'
        const ext = isGz ? '.json.gz' : '.json'
        const fileName = `shiire-arari-backup-${new Date().toISOString().slice(0, 10)}${ext}`
        const file = new File([blob], fileName, { type: blob.type || 'application/json' })
        await navigator.share({
          title: '仕入荒利バックアップ',
          files: [file],
        })
        return true
      } catch {
        // User cancelled or share failed
        return false
      }
    },
    [canShare],
  )

  /** Web Share API でファイル共有がサポートされているか */
  const canShareFiles =
    canShare && typeof navigator !== 'undefined' && 'canShare' in navigator
      ? (() => {
          try {
            return navigator.canShare({
              files: [new File(['test'], 'test.json', { type: 'application/json' })],
            })
          } catch {
            return false
          }
        })()
      : false

  return {
    isCopied,
    importResult,
    copySettingsCode,
    importFromClipboard,
    importFromText,
    canShare,
    canShareFiles,
    shareBackupFile,
  }
}
