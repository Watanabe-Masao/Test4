/**
 * シャープリー分解 時系列データフック
 *
 * 日別の2要素分解（客数効果・客単価効果）を計算し、
 * 累計と単日の両方のデータを提供する。
 */
import { useMemo } from 'react'
import type { DailyRecord } from '@/domain/models'
import { toDateKeyFromParts } from '@/domain/models/CalendarDate'
import { decompose2 } from '@/domain/calculations/factorDecomposition'
import { calculateTransactionValue } from '@/domain/calculations/utils'

export interface ShapleyDayItem {
  readonly day: number
  /** 客数効果（単日） */
  readonly custEffect: number
  /** 客単価効果（単日） */
  readonly ticketEffect: number
  /** 売上差（単日） */
  readonly salesDiff: number
  /** 客数効果（累計） */
  readonly custEffectCum: number
  /** 客単価効果（累計） */
  readonly ticketEffectCum: number
  /** 売上差（累計） */
  readonly salesDiffCum: number
  /** 当年客数 */
  readonly customers: number
  /** 前年客数 */
  readonly prevCustomers: number
  /** 当年客単価 */
  readonly txValue: number | null
  /** 前年客単価 */
  readonly prevTxValue: number | null
}

export interface ShapleyTimeSeriesResult {
  readonly data: readonly ShapleyDayItem[]
  readonly hasPrev: boolean
}

export function useShapleyTimeSeries(
  daily: ReadonlyMap<number, DailyRecord>,
  daysInMonth: number,
  prevYearDaily:
    | ReadonlyMap<string, { sales: number; discount: number; customers?: number }>
    | undefined,
  year: number,
  month: number,
): ShapleyTimeSeriesResult {
  const data = useMemo(() => {
    if (!prevYearDaily) return []

    let cumCustEffect = 0
    let cumTicketEffect = 0
    let cumSalesDiff = 0
    const items: ShapleyDayItem[] = []

    for (let d = 1; d <= daysInMonth; d++) {
      const rec = daily.get(d)
      const prevEntry = prevYearDaily.get(toDateKeyFromParts(year, month, d))
      const curSales = rec?.sales ?? 0
      const prevSales = prevEntry?.sales ?? 0
      const curCust = rec?.customers ?? 0
      const prevCust = prevEntry && 'customers' in prevEntry ? (prevEntry.customers ?? 0) : 0

      const result = decompose2(prevSales, curSales, prevCust, curCust)
      cumCustEffect += result.custEffect
      cumTicketEffect += result.ticketEffect
      cumSalesDiff += curSales - prevSales

      const txValue = curCust > 0 ? calculateTransactionValue(curSales, curCust) : null
      const prevTxValue = prevCust > 0 ? calculateTransactionValue(prevSales, prevCust) : null

      items.push({
        day: d,
        custEffect: result.custEffect,
        ticketEffect: result.ticketEffect,
        salesDiff: curSales - prevSales,
        custEffectCum: cumCustEffect,
        ticketEffectCum: cumTicketEffect,
        salesDiffCum: cumSalesDiff,
        customers: curCust,
        prevCustomers: prevCust,
        txValue,
        prevTxValue,
      })
    }
    return items
  }, [daily, daysInMonth, prevYearDaily, year, month])

  return { data, hasPrev: !!prevYearDaily }
}
