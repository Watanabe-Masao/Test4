import { useCallback, useMemo } from 'react'
import { useDataStore } from '@/application/stores/dataStore'
import { useUiStore } from '@/application/stores/uiStore'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { aggregateStoreResults } from '@/application/usecases/calculation'
import { getDaysInMonth } from '@/domain/constants/defaults'
import type { Store } from '@/domain/models/Store'
import type { StoreResult } from '@/domain/models/storeTypes'

const EMPTY_STORES: ReadonlyMap<string, Store> = new Map()

/** 店舗選択フック（複数選択対応） */
export function useStoreSelection() {
  const stores = useDataStore((s) => s.currentMonthData?.stores ?? EMPTY_STORES)
  const storeResults = useDataStore((s) => s.storeResults)
  const selectedStoreIds = useUiStore((s) => s.selectedStoreIds)
  const settings = useSettingsStore((s) => s.settings)
  const daysInMonth = getDaysInMonth(settings.targetYear, settings.targetMonth)

  const toggleStore = useCallback((storeId: string) => {
    useUiStore.getState().toggleStore(storeId)
  }, [])

  const selectAllStores = useCallback(() => {
    useUiStore.getState().selectAllStores()
  }, [])

  const isAllStores = selectedStoreIds.size === 0

  // 選択中の単一 or 集計結果（常に aggregateStoreResults を通す）
  const currentResult = useMemo(() => {
    if (storeResults.size === 0) return null

    let targets: StoreResult[]

    if (isAllStores) {
      targets = Array.from(storeResults.values())
    } else {
      targets = Array.from(selectedStoreIds)
        .map((id) => storeResults.get(id))
        .filter((r): r is NonNullable<typeof r> => r != null)
    }

    if (targets.length === 0) return null
    return aggregateStoreResults(targets, daysInMonth)
  }, [storeResults, selectedStoreIds, isAllStores, daysInMonth])

  // 選択中の個別結果（比較モード用）
  const selectedResults = useMemo(() => {
    if (isAllStores) return Array.from(storeResults.values())
    return Array.from(selectedStoreIds)
      .map((id) => storeResults.get(id))
      .filter((r): r is NonNullable<typeof r> => r != null)
  }, [storeResults, selectedStoreIds, isAllStores])

  // 店舗名ラベル
  const storeName = useMemo(() => {
    if (isAllStores) return '全店合計'
    if (selectedStoreIds.size === 1) {
      const id = Array.from(selectedStoreIds)[0]
      return stores.get(id)?.name ?? id
    }
    return `${selectedStoreIds.size}店舗合計`
  }, [isAllStores, selectedStoreIds, stores])

  return {
    selectedStoreIds,
    isAllStores,
    currentResult,
    selectedResults,
    storeName,
    stores,
    toggleStore,
    selectAllStores,
  }
}
