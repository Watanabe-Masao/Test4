/**
 * useCostDetailCostInclusion — 原価算入データの集計
 *
 * useCostDetailData から cost inclusion 関連の 4 useMemo を分離。
 * @guard G5 useMemo 上限分離
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
import type {
  ItemAggregate,
  AccountAggregate,
  ItemDetail,
  DailyCostInclusionEntry,
} from './useCostDetailData.types'

export interface CostDetailCostInclusionResult {
  readonly itemAggregates: ItemAggregate[]
  readonly accountAggregates: AccountAggregate[]
  readonly itemDetailData: ItemDetail[] | null
  readonly dailyCostInclusionData: DailyCostInclusionEntry[]
}

export function useCostDetailCostInclusion(
  days: readonly [number, DailyRecord][],
  selectedItem: string | null,
  selectedResults: readonly StoreResult[],
  stores: ReadonlyMap<string, Store>,
): CostDetailCostInclusionResult {
  const itemAggregates = useMemo(() => aggregateByItem(days as [number, DailyRecord][]), [days])
  const accountAggregates = useMemo(() => aggregateByAccount(itemAggregates), [itemAggregates])

  const itemDetailData = useMemo(
    () => buildItemDetailData(selectedItem, selectedResults, stores),
    [selectedItem, selectedResults, stores],
  )

  const dailyCostInclusionData = useMemo(
    () => buildDailyCostInclusionData(days as [number, DailyRecord][]),
    [days],
  )

  return { itemAggregates, accountAggregates, itemDetailData, dailyCostInclusionData }
}
