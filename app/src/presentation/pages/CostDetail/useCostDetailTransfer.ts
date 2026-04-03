/**
 * useCostDetailTransfer — 移動データの集計
 *
 * useCostDetailData から transfer 関連の 6 useMemo を分離。
 * @guard G5 useMemo 上限分離
 */
import { useMemo } from 'react'
import type { DailyRecord } from '@/domain/models/record'
import type { Store } from '@/domain/models/Store'
import {
  aggregateFlows,
  buildTransferPivot,
  buildFlowGroups,
  buildPairDailyData,
  calculateDailyTotals,
} from './useCostDetailData.helpers'
import type {
  FlowEntry,
  FlowGroup,
  DailyTotals,
  PairDailyEntry,
  TransferPivotData,
} from './useCostDetailData.types'

type InField = 'interStoreIn' | 'interDepartmentIn'
type OutField = 'interStoreOut' | 'interDepartmentOut'

export interface CostDetailTransferResult {
  readonly flows: FlowEntry[]
  readonly groupedFlows: FlowGroup[]
  readonly maxFlowCost: number
  readonly pairDailyData: PairDailyEntry[] | null
  readonly dailyTotals: DailyTotals
  readonly transferPivot: TransferPivotData
}

export function useCostDetailTransfer(
  days: readonly [number, DailyRecord][],
  inField: InField,
  outField: OutField,
  stores: ReadonlyMap<string, Store>,
  selectedPair: string | null,
): CostDetailTransferResult {
  const flows = useMemo(
    () =>
      days.length > 0
        ? aggregateFlows(days as [number, DailyRecord][], inField, outField, stores)
        : [],
    [days, inField, outField, stores],
  )

  const groupedFlows = useMemo(() => buildFlowGroups(flows), [flows])

  const maxFlowCost = useMemo(
    () => (flows.length === 0 ? 1 : Math.max(...flows.map((f) => Math.abs(f.cost)), 1)),
    [flows],
  )

  const pairDailyData = useMemo(
    () => buildPairDailyData(selectedPair, days as [number, DailyRecord][], inField, outField),
    [selectedPair, days, inField, outField],
  )

  const dailyTotals = useMemo(
    () => calculateDailyTotals(days as [number, DailyRecord][], inField, outField),
    [days, inField, outField],
  )

  const transferPivot = useMemo(
    () => buildTransferPivot(days as [number, DailyRecord][], inField, outField, stores),
    [days, inField, outField, stores],
  )

  return { flows, groupedFlows, maxFlowCost, pairDailyData, dailyTotals, transferPivot }
}
