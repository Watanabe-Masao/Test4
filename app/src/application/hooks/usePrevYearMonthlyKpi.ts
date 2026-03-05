/**
 * usePrevYearMonthlyKpi — 前年月間KPI（同曜日 + 同日）
 *
 * 有効取り込み期間（dataEndDay）に依存しない月間フル集計を提供する。
 * 同曜日アライメントと同日アライメントの両方を同時に返す。
 *
 * 用途: ダッシュボードKPIカードで前年同曜日/同日の月間売上・客数を常時表示。
 */
import { useMemo } from 'react'
import { useDataStore } from '@/application/stores/dataStore'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { useStoreSelection } from './useStoreSelection'
import { getDaysInMonth } from '@/domain/constants/defaults'
import { aggregateAllStores } from '@/domain/models'
import { calculateTransactionValue } from '@/domain/calculations/utils'
import { calcSameDowOffset } from '@/application/comparison/resolveComparisonFrame'

export interface PrevYearMonthlyKpiEntry {
  readonly sales: number
  readonly customers: number
  readonly transactionValue: number
}

export interface PrevYearMonthlyKpi {
  readonly hasPrevYear: boolean
  /** 前年同曜日: 月間フル集計 */
  readonly sameDow: PrevYearMonthlyKpiEntry
  /** 前年同日: 月間フル集計 */
  readonly sameDate: PrevYearMonthlyKpiEntry
}

const ZERO_ENTRY: PrevYearMonthlyKpiEntry = { sales: 0, customers: 0, transactionValue: 0 }
const EMPTY: PrevYearMonthlyKpi = { hasPrevYear: false, sameDow: ZERO_ENTRY, sameDate: ZERO_ENTRY }

/**
 * 指定オフセットで前年日別データを当年月にマッピングし、月間合計を返す。
 */
function aggregateWithOffset(
  allAgg: Record<string, Record<string, { sales?: number; discount?: number }>>,
  prevYearFlowers: Record<string, Record<number, { customers?: number }>> | undefined,
  targetIds: readonly string[],
  offset: number,
  daysInTargetMonth: number,
): PrevYearMonthlyKpiEntry {
  let totalSales = 0
  let totalCustomers = 0

  for (const storeId of targetIds) {
    const storeDays = allAgg[storeId]
    if (!storeDays) continue
    for (const [dayStr, summary] of Object.entries(storeDays)) {
      const origDay = Number(dayStr)
      if (isNaN(origDay)) continue
      const mappedDay = origDay - offset
      if (mappedDay < 1 || mappedDay > daysInTargetMonth) continue

      totalSales += summary.sales ?? 0
      const flowerEntry = prevYearFlowers?.[storeId]?.[origDay] as
        | { customers?: number }
        | undefined
      totalCustomers += flowerEntry?.customers ?? 0
    }
  }

  return {
    sales: totalSales,
    customers: totalCustomers,
    transactionValue: calculateTransactionValue(totalSales, totalCustomers),
  }
}

export function usePrevYearMonthlyKpi(): PrevYearMonthlyKpi {
  const data = useDataStore((s) => s.data)
  const settings = useSettingsStore((s) => s.settings)
  const { selectedStoreIds, isAllStores } = useStoreSelection()

  const prevYearCS = data.prevYearClassifiedSales
  const prevYearFlowers = data.flowers
  const { targetYear, targetMonth } = settings
  const prevYearSourceYear = settings.prevYearSourceYear ?? undefined
  const prevYearSourceMonth = settings.prevYearSourceMonth ?? undefined

  return useMemo(() => {
    if (prevYearCS.records.length === 0) return EMPTY

    const allAgg = aggregateAllStores(prevYearCS)
    const allStoreIds = Object.keys(allAgg)
    if (allStoreIds.length === 0) return EMPTY

    const targetIds = isAllStores
      ? allStoreIds
      : allStoreIds.filter((id) => selectedStoreIds.has(id))
    if (targetIds.length === 0) return EMPTY

    const daysInTargetMonth = getDaysInMonth(targetYear, targetMonth)
    if (isNaN(daysInTargetMonth) || daysInTargetMonth <= 0) return EMPTY

    // 同曜日オフセット
    const dowOffset = calcSameDowOffset(
      targetYear,
      targetMonth,
      prevYearSourceYear != null && !isNaN(prevYearSourceYear) ? prevYearSourceYear : undefined,
      prevYearSourceMonth != null && !isNaN(prevYearSourceMonth) ? prevYearSourceMonth : undefined,
    )

    const sameDow = aggregateWithOffset(
      allAgg,
      prevYearFlowers,
      targetIds,
      dowOffset,
      daysInTargetMonth,
    )
    const sameDate = aggregateWithOffset(allAgg, prevYearFlowers, targetIds, 0, daysInTargetMonth)

    return { hasPrevYear: true, sameDow, sameDate }
  }, [
    prevYearCS,
    prevYearFlowers,
    selectedStoreIds,
    isAllStores,
    targetYear,
    targetMonth,
    prevYearSourceYear,
    prevYearSourceMonth,
  ])
}
