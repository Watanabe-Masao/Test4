/**
 * PersistenceProvider — 復元状態の正本を Context で管理する。
 *
 * モジュールスコープ変数（restoreState / restoreListeners / restoreExecuted）を排除し、
 * React の状態管理に一元化する。テストでは Provider ごとに自然にリセットされる。
 *
 * RepositoryProvider の後に配置すること（useRepository に依存）。
 */
import { type ReactNode, useReducer, useState, useEffect, useRef } from 'react'
import { useDataStore } from '@/application/stores/dataStore'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { invalidateAfterStateChange } from '@/application/services/stateInvalidation'
import { useRepository } from './useRepository'
import {
  PersistenceContext,
  INITIAL_RESTORE_STATE,
  type RestoreState,
} from './persistenceContextDef'

// ── Reducer ──

type RestoreAction =
  | { type: 'RESTORE_START' }
  | { type: 'RESTORE_COMPLETE' }
  | { type: 'RESTORE_SKIP' }
  | { type: 'RESTORE_ERROR'; message: string }

function restoreReducer(_state: RestoreState, action: RestoreAction): RestoreState {
  switch (action.type) {
    case 'RESTORE_START':
      return { isRestoring: true, autoRestored: false, restoreError: null }
    case 'RESTORE_COMPLETE':
      return { isRestoring: false, autoRestored: true, restoreError: null }
    case 'RESTORE_SKIP':
      return { isRestoring: false, autoRestored: true, restoreError: null }
    case 'RESTORE_ERROR':
      return { isRestoring: false, autoRestored: false, restoreError: action.message }
  }
}

// ── Provider ──

interface Props {
  readonly children: ReactNode
}

export function PersistenceProvider({ children }: Props) {
  const repo = useRepository()
  const [available] = useState(() => repo.isAvailable())
  const [restoreState, dispatch] = useReducer(restoreReducer, INITIAL_RESTORE_STATE)
  const restoreExecutedRef = useRef(false)

  useEffect(() => {
    if (restoreExecutedRef.current) return
    restoreExecutedRef.current = true

    // IndexedDB 利用不可 → 復元スキップ（完了扱い）
    if (!available) {
      dispatch({ type: 'RESTORE_SKIP' })
      return
    }

    dispatch({ type: 'RESTORE_START' })

    let cancelled = false
    repo
      .getSessionMeta()
      .then(async (meta) => {
        if (cancelled || !meta) {
          if (!cancelled) dispatch({ type: 'RESTORE_COMPLETE' })
          return
        }
        // 当月データを優先ロード。なければ lastSession のデータをロード。
        const { targetYear, targetMonth } = useSettingsStore.getState().settings
        const currentMonthData = await repo.loadMonthlyData(targetYear, targetMonth)
        if (cancelled) return

        if (currentMonthData) {
          useDataStore.getState().setImportedData(currentMonthData)
          invalidateAfterStateChange()
        } else if (meta.year !== targetYear || meta.month !== targetMonth) {
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
        }
        dispatch({ type: 'RESTORE_COMPLETE' })
      })
      .catch((err) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : String(err)
          console.warn('[PersistenceProvider] ストレージアクセスエラー:', err)
          dispatch({ type: 'RESTORE_ERROR', message })
        }
      })
    return () => {
      cancelled = true
    }
  }, [available, repo])

  return <PersistenceContext.Provider value={restoreState}>{children}</PersistenceContext.Provider>
}
