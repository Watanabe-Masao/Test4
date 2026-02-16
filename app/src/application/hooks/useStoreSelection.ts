import { useCallback } from 'react'
import { useAppState, useAppDispatch } from '../context/AppStateContext'
import { ALL_STORES_ID } from '@/domain/constants/defaults'

/** 店舗選択フック */
export function useStoreSelection() {
  const state = useAppState()
  const dispatch = useAppDispatch()

  const selectStore = useCallback(
    (storeId: string) => {
      dispatch({ type: 'SET_CURRENT_STORE', payload: storeId })
    },
    [dispatch],
  )

  const selectAllStores = useCallback(() => {
    dispatch({ type: 'SET_CURRENT_STORE', payload: ALL_STORES_ID })
  }, [dispatch])

  const currentStoreId = state.ui.currentStoreId
  const isAllStores = currentStoreId === ALL_STORES_ID
  const currentStore = isAllStores ? null : state.data.stores.get(currentStoreId) ?? null
  const currentResult = state.storeResults.get(currentStoreId) ?? null

  return {
    currentStoreId,
    isAllStores,
    currentStore,
    currentResult,
    stores: state.data.stores,
    selectStore,
    selectAllStores,
  }
}
