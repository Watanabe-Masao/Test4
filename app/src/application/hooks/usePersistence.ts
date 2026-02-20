/**
 * データ永続化フック
 *
 * IndexedDB への保存・読み込み・差分チェックを提供する。
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppState, useAppDispatch } from '../context/AppStateContext'
import {
  saveImportedData,
  loadImportedData,
  getPersistedMeta,
  clearMonthData,
  clearAllData,
  isIndexedDBAvailable,
} from '@/infrastructure/storage/IndexedDBStore'
import type { PersistedMeta } from '@/infrastructure/storage/IndexedDBStore'
import { calculateDiff } from '@/infrastructure/storage/diffCalculator'
import type { DiffResult } from '@/infrastructure/storage/diffCalculator'
import type { ImportedData } from '@/domain/models'
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
  const state = useAppState()
  const dispatch = useAppDispatch()

  const [available] = useState(() => isIndexedDBAvailable())
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
    getPersistedMeta().then((meta) => {
      if (cancelled) return
      if (meta) {
        setRestoreMeta(meta)
        setShowRestoreDialog(true)
      }
    }).catch(() => {
      // IndexedDB アクセスエラーは無視
    })
    return () => { cancelled = true }
  }, [available])

  const saveCurrentData = useCallback(async () => {
    if (!available) return
    setIsSaving(true)
    try {
      await saveImportedData(
        state.data,
        state.settings.targetYear,
        state.settings.targetMonth,
      )
    } finally {
      setIsSaving(false)
    }
  }, [available, state.data, state.settings.targetYear, state.settings.targetMonth])

  const restoreData = useCallback(async () => {
    if (!available || !restoreMeta) return
    try {
      const data = await loadImportedData(restoreMeta.year, restoreMeta.month)
      if (data) {
        dispatch({ type: 'SET_IMPORTED_DATA', payload: data })
        dispatch({
          type: 'UPDATE_SETTINGS',
          payload: { targetYear: restoreMeta.year, targetMonth: restoreMeta.month },
        })
      }
    } finally {
      setShowRestoreDialog(false)
    }
  }, [available, restoreMeta, dispatch])

  const discardSavedData = useCallback(async () => {
    if (!available || !restoreMeta) {
      setShowRestoreDialog(false)
      return
    }
    try {
      await clearMonthData(restoreMeta.year, restoreMeta.month)
      await clearAllData()
    } finally {
      setShowRestoreDialog(false)
    }
  }, [available, restoreMeta])

  const dismissRestoreDialog = useCallback(() => {
    setShowRestoreDialog(false)
  }, [])

  const checkDiffBeforeImport = useCallback(
    async (
      incoming: ImportedData,
      importedTypes: ReadonlySet<string>,
    ): Promise<DiffResult | null> => {
      if (!available) return null

      const { targetYear, targetMonth } = state.settings
      const existing = await loadImportedData(targetYear, targetMonth)
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
    [available, state.settings],
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
    await clearMonthData(state.settings.targetYear, state.settings.targetMonth)
  }, [available, state.settings.targetYear, state.settings.targetMonth])

  const clearAllFn = useCallback(async () => {
    if (!available) return
    await clearAllData()
  }, [available])

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
