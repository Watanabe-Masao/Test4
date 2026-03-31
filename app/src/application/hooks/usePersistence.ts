/**
 * データ永続化フック — state/command 分離。
 * usePersistenceState(): readonly / usePersistence(): 既存互換 façade。
 * 復元状態の正本は PersistenceContext（PersistenceProvider が管理）。
 */
import { useCallback, useContext, useState } from 'react'
import { useDataStore } from '@/application/stores/dataStore'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { useRepository } from '../context/useRepository'
import { PersistenceContext } from '../context/persistenceContextDef'
import { calculateDiff } from '@/application/services/diffCalculator'
import type { DiffResult } from '@/domain/models/analysis'
import type { ImportedData } from '@/domain/models/storeTypes'
import { toMonthlyData, toLegacyImportedData } from '@/domain/models/monthlyDataAdapter'
import { mergeInsertsOnly } from './useImport'

// ─── 型定義 ──────────────────────────────────────────────

/** Persistence の readonly 状態（AppLifecycle 用） */
export interface PersistenceStatusInfo {
  /** データ復元中 */
  readonly isRestoring: boolean
  /** 自動復元済み */
  readonly autoRestored: boolean
  /** 復元エラー */
  readonly restoreError: string | null
}

export interface PersistenceState extends PersistenceStatusInfo {
  /** IndexedDB 利用可能か */
  readonly available: boolean
  /** 差分確認ダイアログ表示中 */
  readonly showDiffDialog: boolean
  /** 差分結果 */
  readonly diffResult: DiffResult | null
  /** 保存中 */
  readonly isSaving: boolean
}

export interface PersistenceActions {
  /** データを IndexedDB に保存する */
  saveCurrentData: () => Promise<void>
  /**
   * インポートデータと既存保存データの差分をチェックする。
   * 差分がある場合は diffResult を返す。
   * 差分がない or 既存データなしの場合は null を返す。
   */
  checkDiffBeforeImport: (
    incoming: ImportedData,
    importedTypes: ReadonlySet<string>,
  ) => Promise<DiffResult | null>
  /** 差分確認の結果を処理する（overwrite → 新データで保存、keep-existing → 挿入のみ適用） */
  applyDiffDecision: (
    action: 'overwrite' | 'keep-existing',
    incoming: ImportedData,
    existing: ImportedData,
    importedTypes: ReadonlySet<string>,
  ) => ImportedData
  /** 差分ダイアログを閉じる */
  dismissDiffDialog: () => void
  /** 当月データを削除 */
  clearCurrentMonth: () => Promise<void>
  /** 全データ削除 */
  clearAll: () => Promise<void>
}

// ─── usePersistenceState: readonly 状態フック ───────────

/**
 * Persistence の readonly 状態のみ返す。
 * PersistenceContext から復元状態を取得する。
 * AppLifecycleProvider がこのフックを使い、usePersistence の command には依存しない。
 */
export function usePersistenceState(): PersistenceStatusInfo {
  return useContext(PersistenceContext)
}

// ─── usePersistence: 既存互換 façade ───────────────────

export function usePersistence(): PersistenceState & PersistenceActions {
  const data = useDataStore((s) => s.data)
  const settings = useSettingsStore((s) => s.settings)
  const repo = useRepository()

  const [available] = useState(() => repo.isAvailable())
  const [showDiffDialog, setShowDiffDialog] = useState(false)
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // readonly 状態は Context から取得
  const status = usePersistenceState()

  const saveCurrentData = useCallback(async () => {
    if (!available) return
    setIsSaving(true)
    try {
      const monthly = toMonthlyData(data, {
        year: settings.targetYear,
        month: settings.targetMonth,
        importedAt: new Date().toISOString(),
      })
      await repo.saveMonthlyData(monthly, settings.targetYear, settings.targetMonth)
    } finally {
      setIsSaving(false)
    }
  }, [available, repo, data, settings.targetYear, settings.targetMonth])

  const checkDiffBeforeImport = useCallback(
    async (
      incoming: ImportedData,
      importedTypes: ReadonlySet<string>,
    ): Promise<DiffResult | null> => {
      if (!available) return null

      const { targetYear, targetMonth } = settings
      const existingMonthly = await repo.loadMonthlyData(targetYear, targetMonth)
      if (!existingMonthly) return null
      // diff 計算は ImportedData ベース — compat adapter 経由（Phase 2 完了まで維持）
      const existing = toLegacyImportedData({ current: existingMonthly, prevYear: null })

      const diff = calculateDiff(existing, incoming, importedTypes)
      if (diff.needsConfirmation) {
        setDiffResult(diff)
        setShowDiffDialog(true)
        return diff
      }

      // 確認不要 → 自動的に保存
      return null
    },
    [available, repo, settings],
  )

  const applyDiffDecision = useCallback(
    (
      action: 'overwrite' | 'keep-existing',
      incoming: ImportedData,
      existing: ImportedData,
      importedTypes: ReadonlySet<string>,
    ): ImportedData => {
      if (action === 'overwrite') {
        return incoming
      }
      // keep-existing: 挿入のみマージ
      return mergeInsertsOnly(existing, incoming, importedTypes)
    },
    [],
  )

  const dismissDiffDialog = useCallback(() => {
    setShowDiffDialog(false)
    setDiffResult(null)
  }, [])

  const clearCurrentMonth = useCallback(async () => {
    if (!available) return
    await repo.clearMonth(settings.targetYear, settings.targetMonth)
  }, [available, repo, settings.targetYear, settings.targetMonth])

  const clearAllFn = useCallback(async () => {
    if (!available) return
    await repo.clearAll()
  }, [available, repo])

  return {
    available,
    showDiffDialog,
    diffResult,
    isSaving,
    isRestoring: status.isRestoring,
    autoRestored: status.autoRestored,
    restoreError: status.restoreError,
    saveCurrentData,
    checkDiffBeforeImport,
    applyDiffDecision,
    dismissDiffDialog,
    clearCurrentMonth,
    clearAll: clearAllFn,
  }
}
