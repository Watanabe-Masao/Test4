/**
 * @responsibility R:unclassified
 */

import { useMemo } from 'react'
import type { DailyRecord } from '@/domain/models/record'
import {
  aggregateFlows,
  buildTransferPivot,
  buildFlowGroups,
  buildPairDailyData,
  calculateDailyTotals,
} from './useCostDetailData.helpers'

type DayEntry = [number, DailyRecord]
type InField = 'interStoreIn' | 'interDepartmentIn'
type OutField = 'interStoreOut' | 'interDepartmentOut'

export function useCostDetailTransfer(
  days: readonly DayEntry[],
  inField: InField,
  outField: OutField,
  stores: ReadonlyMap<string, { id: string; name: string }>,
  selectedPair: string | null,
) {
  const { flows, groupedFlows, maxFlowCost } = useMemo(() => {
    const f = days.length > 0 ? aggregateFlows([...days], inField, outField, stores) : []
    return {
      flows: f,
      groupedFlows: buildFlowGroups(f),
      maxFlowCost: f.length === 0 ? 1 : Math.max(...f.map((v) => Math.abs(v.cost)), 1),
    }
  }, [days, inField, outField, stores])

  const pairDailyData = useMemo(
    () => buildPairDailyData(selectedPair, [...days], inField, outField),
    [selectedPair, days, inField, outField],
  )

  const dailyTotals = useMemo(
    () => calculateDailyTotals([...days], inField, outField),
    [days, inField, outField],
  )

  const transferPivot = useMemo(
    () => buildTransferPivot([...days], inField, outField, stores),
    [days, inField, outField, stores],
  )

  return { flows, groupedFlows, maxFlowCost, pairDailyData, dailyTotals, transferPivot } as const
}
