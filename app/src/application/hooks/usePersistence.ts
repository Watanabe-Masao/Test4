/**
 * データ永続化フック
 *
 * DataRepository 経由での保存・読み込み・差分チェックを提供する。
 *
 * state/command 分離:
 * - usePersistenceState(): readonly 状態のみ（AppLifecycle 用）
 * - usePersistenceActions(): command のみ
 * - usePersistence(): 上記2つを束ねる既存互換 façade
 *
 * 内部正本: persistenceStateRef + React state の組で一箇所に集約。
 * usePersistenceState / usePersistence どちらから読んでも同じ source を参照する。
 */
import { useCallback, useEffect, useState } from 'react'
import { useDataStore } from '@/application/stores/dataStore'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { invalidateAfterStateChange } from '@/application/services/stateInvalidation'
import { useRepository } from '../context/useRepository'
import { calculateDiff } from '@/application/services/diffCalculator'
import type { DiffResult } from '@/domain/models/analysis'
import type { ImportedData } from '@/domain/models/storeTypes'
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

// ─── 内部正本: 復元状態の共有 ────────────────────────────

interface RestoreState {
  isRestoring: boolean
  autoRestored: boolean
  restoreError: string | null
}

type RestoreListener = () => void

/**
 * モジュールスコープの正本。
 * usePersistence と usePersistenceState の両方がこの source を参照する。
 */
let restoreState: RestoreState = {
  isRestoring: false,
  autoRestored: false,
  restoreError: null,
}

const restoreListeners = new Set<RestoreListener>()
let restoreExecuted = false

function setRestoreState(update: Partial<RestoreState>): void {
  restoreState = { ...restoreState, ...update }
  for (const listener of restoreListeners) {
    listener()
  }
}

function subscribeRestoreState(listener: RestoreListener): () => void {
  restoreListeners.add(listener)
  return () => {
    restoreListeners.delete(listener)
  }
}

function getRestoreStateSnapshot(): RestoreState {
  return restoreState
}

/** テスト用: 正本をリセットする */
export function resetPersistenceState(): void {
  restoreState = { isRestoring: false, autoRestored: false, restoreError: null }
  restoreExecuted = false
  restoreListeners.clear()
}

// ─── usePersistenceState: readonly 状態フック ───────────

/**
 * Persistence の readonly 状態のみ返す。
 * AppLifecycleProvider がこのフックを使い、usePersistence の command には依存しない。
 */
export function usePersistenceState(): PersistenceStatusInfo {
  const [, forceUpdate] = useState(0)
  const repo = useRepository()
  const available = useState(() => repo.isAvailable())[0]

  // 正本を購読して再レンダリングをトリガー
  useEffect(() => {
    const unsubscribe = subscribeRestoreState(() => {
      forceUpdate((c) => c + 1)
    })
    return unsubscribe
  }, [])

  // 初回復元を実行（usePersistence と共通ロジック）
  useEffect(() => {
    if (!available || restoreExecuted) return
    restoreExecuted = true

    setRestoreState({ isRestoring: true })

    let cancelled = false
    repo
      .getSessionMeta()
      .then(async (meta) => {
        if (cancelled || !meta) {
          if (!cancelled) {
            setRestoreState({ isRestoring: false, autoRestored: true })
          }
          return
        }
        const restoredData = await repo.loadMonthlyData(meta.year, meta.month)
        if (cancelled) return
        if (restoredData) {
          useDataStore.getState().setImportedData(restoredData)
          useSettingsStore.getState().updateSettings({
            targetYear: meta.year,
            targetMonth: meta.month,
          })
          invalidateAfterStateChange()
        }
        setRestoreState({ isRestoring: false, autoRestored: true })
      })
      .catch((err) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : String(err)
          console.warn('[usePersistence] ストレージアクセスエラー:', err)
          setRestoreState({ isRestoring: false, restoreError: message })
        }
      })
    return () => {
      cancelled = true
    }
  }, [available, repo])

  const snapshot = getRestoreStateSnapshot()
  return {
    isRestoring: snapshot.isRestoring,
    autoRestored: snapshot.autoRestored,
    restoreError: snapshot.restoreError,
  }
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

  // readonly 状態は正本から取得
  const status = usePersistenceState()

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
