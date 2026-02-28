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
import type { ImportedData, PersistedMeta, DiffResult } from '@/domain/models'
import { mergeInsertsOnly } from './useImport'

// ─── 型定義 ──────────────────────────────────────────────

export interface PersistenceState {
  /** IndexedDB 利用可能か */
  readonly available: boolean
  /** 復元ダイアログ表示中 */
  readonly showRestoreDialog: boolean
  /** 復元メタデータ */
  readonly restoreMeta: PersistedMeta | null
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
  /** 保存データを復元してstateに反映する */
  restoreData: () => Promise<void>
  /** 保存データを破棄する */
  discardSavedData: () => Promise<void>
  /** 復元ダイアログを閉じる（破棄扱い） */
  dismissRestoreDialog: () => void
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
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)
  const [restoreMeta, setRestoreMeta] = useState<PersistedMeta | null>(null)
  const [showDiffDialog, setShowDiffDialog] = useState(false)
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // 初回のみ実行: 保存データの有無をチェック
  const checkedRef = useRef(false)
  useEffect(() => {
    if (!available || checkedRef.current) return
    checkedRef.current = true

    let cancelled = false
    repo
      .getSessionMeta()
      .then((meta) => {
        if (cancelled) return
        if (meta) {
          setRestoreMeta(meta)
          setShowRestoreDialog(true)
        }
      })
      .catch(() => {
        // ストレージアクセスエラーは無視
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

  const restoreData = useCallback(async () => {
    if (!available || !restoreMeta) return
    try {
      const restoredData = await repo.loadMonthlyData(restoreMeta.year, restoreMeta.month)
      if (restoredData) {
        // SET_IMPORTED_DATA side effects: calculationCache.clear() + invalidateCalculation()
        useDataStore.getState().setImportedData(restoredData)
        calculationCache.clear()
        useUiStore.getState().invalidateCalculation()
        // UPDATE_SETTINGS side effects: calculationCache.clear() + invalidateCalculation()
        useSettingsStore.getState().updateSettings({
          targetYear: restoreMeta.year,
          targetMonth: restoreMeta.month,
        })
        calculationCache.clear()
        useUiStore.getState().invalidateCalculation()
      }
    } finally {
      setShowRestoreDialog(false)
    }
  }, [available, repo, restoreMeta])

  const discardSavedData = useCallback(async () => {
    if (!available || !restoreMeta) {
      setShowRestoreDialog(false)
      return
    }
    try {
      await repo.clearMonth(restoreMeta.year, restoreMeta.month)
    } finally {
      setShowRestoreDialog(false)
    }
  }, [available, repo, restoreMeta])

  const dismissRestoreDialog = useCallback(() => {
    setShowRestoreDialog(false)
  }, [])

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
    showRestoreDialog,
    restoreMeta,
    showDiffDialog,
    diffResult,
    isSaving,
    saveCurrentData,
    restoreData,
    discardSavedData,
    dismissRestoreDialog,
    checkDiffBeforeImport,
    applyDiffDecision,
    dismissDiffDialog,
    clearCurrentMonth,
    clearAll: clearAllFn,
  }
}
