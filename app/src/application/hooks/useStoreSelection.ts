import { useCallback, useMemo } from 'react'
import { useAppState, useAppDispatch } from '../context/AppStateContext'
import { aggregateStoreResults } from '../services/CalculationOrchestrator'
import { getDaysInMonth } from '@/domain/constants/defaults'
import type { StoreResult } from '@/domain/models'

/** 店舗選択フック（複数選択対応） */
export function useStoreSelection() {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const daysInMonth = getDaysInMonth(state.settings.targetYear, state.settings.targetMonth)

  const toggleStore = useCallback(
    (storeId: string) => {
      dispatch({ type: 'TOGGLE_STORE', payload: storeId })
    },
    [dispatch],
  )

  const selectAllStores = useCallback(() => {
    dispatch({ type: 'SELECT_ALL_STORES' })
  }, [dispatch])

  const selectedStoreIds = state.ui.selectedStoreIds
  const isAllStores = selectedStoreIds.size === 0

  // 選択中の単一 or 集計結果（常に aggregateStoreResults を通す）
  const currentResult = useMemo(() => {
    if (state.storeResults.size === 0) return null

    let targets: StoreResult[]

    if (isAllStores) {
      targets = Array.from(state.storeResults.values())
    } else {
      targets = Array.from(selectedStoreIds)
        .map((id) => state.storeResults.get(id))
        .filter((r): r is NonNullable<typeof r> => r != null)
    }

    if (targets.length === 0) return null
    return aggregateStoreResults(targets, daysInMonth)
  }, [state.storeResults, selectedStoreIds, isAllStores, daysInMonth])

  // 選択中の個別結果（比較モード用）
  const selectedResults = useMemo(() => {
    if (isAllStores) return Array.from(state.storeResults.values())
    return Array.from(selectedStoreIds)
      .map((id) => state.storeResults.get(id))
      .filter((r): r is NonNullable<typeof r> => r != null)
  }, [state.storeResults, selectedStoreIds, isAllStores])

  // 店舗名ラベル
  const storeName = useMemo(() => {
    if (isAllStores) return '全店合計'
    if (selectedStoreIds.size === 1) {
      const id = Array.from(selectedStoreIds)[0]
      return state.data.stores.get(id)?.name ?? id
    }
    return `${selectedStoreIds.size}店舗合計`
  }, [isAllStores, selectedStoreIds, state.data.stores])

  return {
    selectedStoreIds,
    isAllStores,
    currentResult,
    selectedResults,
    storeName,
    stores: state.data.stores,
    toggleStore,
    selectAllStores,
  }
}
