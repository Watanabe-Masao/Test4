import { useCallback, useMemo } from 'react'
import { useAppState, useAppDispatch } from '../context/AppStateContext'
import { aggregateStoreResults } from '../services/CalculationOrchestrator'

/** 店舗選択フック（複数選択対応） */
export function useStoreSelection() {
  const state = useAppState()
  const dispatch = useAppDispatch()

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

  // 選択中の単一 or 集計結果
  const currentResult = useMemo(() => {
    if (state.storeResults.size === 0) return null

    if (isAllStores) {
      // 全店舗集計
      return aggregateStoreResults(Array.from(state.storeResults.values()))
    }

    if (selectedStoreIds.size === 1) {
      const id = Array.from(selectedStoreIds)[0]
      return state.storeResults.get(id) ?? null
    }

    // 複数店舗集計
    const selected = Array.from(selectedStoreIds)
      .map((id) => state.storeResults.get(id))
      .filter((r): r is NonNullable<typeof r> => r != null)
    if (selected.length === 0) return null
    return aggregateStoreResults(selected)
  }, [state.storeResults, selectedStoreIds, isAllStores])

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
