/**
 * データ永続化フック
 *
 * DataRepository 経由での保存・読み込み・差分チェックを提供する。
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useDataStore } from '@/application/stores/dataStore'
import { useUiStore } from '@/application/stores/uiStore'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { calculationCache } from '@/application/services/calculationCache'
import { useRepository } from '../context/useRepository'
import { calculateDiff } from '@/application/services/diffCalculator'
import type { ImportedData, DiffResult } from '@/domain/models'
import { mergeInsertsOnly } from './useImport'

// ─── 型定義 ──────────────────────────────────────────────

export interface PersistenceState {
  /** IndexedDB 利用可能か */
  readonly available: boolean
  /** 差分確認ダイアログ表示中 */
  readonly showDiffDialog: boolean
  /** 差分結果 */
  readonly diffResult: DiffResult | null
  /** 保存中 */
  readonly isSaving: boolean
  /** 自動復元済み */
  readonly autoRestored: boolean
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

// ─── フック本体 ──────────────────────────────────────────

export function usePersistence(): PersistenceState & PersistenceActions {
  const data = useDataStore((s) => s.data)
  const settings = useSettingsStore((s) => s.settings)
  const repo = useRepository()

  const [available] = useState(() => repo.isAvailable())
  const [showDiffDialog, setShowDiffDialog] = useState(false)
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [autoRestored, setAutoRestored] = useState(false)

  // 初回のみ実行: 保存データがあれば自動復元（ダイアログなし）
  const checkedRef = useRef(false)
  useEffect(() => {
    if (!available || checkedRef.current) return
    checkedRef.current = true

    let cancelled = false
    repo
      .getSessionMeta()
      .then(async (meta) => {
        if (cancelled || !meta) return
        const restoredData = await repo.loadMonthlyData(meta.year, meta.month)
        if (cancelled || !restoredData) return
        useDataStore.getState().setImportedData(restoredData)
        useSettingsStore.getState().updateSettings({
          targetYear: meta.year,
          targetMonth: meta.month,
        })
        calculationCache.clear()
        useUiStore.getState().invalidateCalculation()
        setAutoRestored(true)
      })
      .catch((err) => {
        console.warn('[usePersistence] ストレージアクセスエラー:', err)
      })
    return () => {
      cancelled = true
    }
  }, [available, repo])

  const saveCurrentData = useCallback(async () => {
    if (!available) return
    setIsSaving(true)
    try {
      await repo.saveMonthlyData(data, settings.targetYear, settings.targetMonth)
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
      const existing = await repo.loadMonthlyData(targetYear, targetMonth)
      if (!existing) return null

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
    autoRestored,
    saveCurrentData,
    checkDiffBeforeImport,
    applyDiffDecision,
    dismissDiffDialog,
    clearCurrentMonth,
    clearAll: clearAllFn,
  }
}
