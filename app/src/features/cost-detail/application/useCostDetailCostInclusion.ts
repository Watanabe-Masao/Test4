/**
 * @responsibility R:unclassified
 */

import { useMemo } from 'react'
import type { DailyRecord } from '@/domain/models/record'
import type { Store } from '@/domain/models/Store'
import type { StoreResult } from '@/domain/models/storeTypes'
import {
  aggregateByItem,
  aggregateByAccount,
  buildItemDetailData,
  buildDailyCostInclusionData,
} from './useCostDetailData.helpers'

type DayEntry = [number, DailyRecord]

export function useCostDetailCostInclusion(
  days: readonly DayEntry[],
  selectedItem: string | null,
  selectedResults: readonly StoreResult[],
  stores: ReadonlyMap<string, Store>,
) {
  const { itemAggregates, accountAggregates } = useMemo(() => {
    const items = aggregateByItem([...days])
    return { itemAggregates: items, accountAggregates: aggregateByAccount(items) }
  }, [days])

  const itemDetailData = useMemo(
    () => buildItemDetailData(selectedItem, selectedResults, stores),
    [selectedItem, selectedResults, stores],
  )

  const dailyCostInclusionData = useMemo(() => buildDailyCostInclusionData(days), [days])

  return { itemAggregates, accountAggregates, itemDetailData, dailyCostInclusionData } as const
}
