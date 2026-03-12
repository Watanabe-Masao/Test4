import { useMemo } from 'react'
import type { StoreResult } from '@/domain/models'
import type { PrevYearData } from '@/application/comparison/comparisonTypes'
import { toDateKeyFromParts } from '@/domain/models/CalendarDate'

export interface BudgetChartDataPoint {
  readonly day: number
  readonly actualCum: number
  readonly budgetCum: number
  readonly prevYearCum: number | null
}

/**
 * 予算 vs 実績の累計チャートデータを構築するフック。
 *
 * 1..daysInMonth の各日について、売上・予算・前年売上の累計値を算出する。
 * DashboardPage / MobileDashboardPage / InsightPage で共通利用。
 */
export function useBudgetChartData(
  currentResult: StoreResult | null | undefined,
  daysInMonth: number,
  prevYear: PrevYearData,
  year: number,
  month: number,
): readonly BudgetChartDataPoint[] {
  return useMemo(() => {
    if (!currentResult) return []

    const salesDaily = new Map<number, number>()
    for (const [d, rec] of currentResult.daily) salesDaily.set(d, rec.sales)

    let cumActual = 0
    let cumBudget = 0
    let cumPrevYear = 0
    const data: BudgetChartDataPoint[] = []

    for (let d = 1; d <= daysInMonth; d++) {
      cumActual += salesDaily.get(d) ?? 0
      cumBudget += currentResult.budgetDaily.get(d) ?? 0
      cumPrevYear += prevYear.daily.get(toDateKeyFromParts(year, month, d))?.sales ?? 0
      data.push({
        day: d,
        actualCum: cumActual,
        budgetCum: cumBudget,
        prevYearCum: prevYear.hasPrevYear ? cumPrevYear : null,
      })
    }

    return data
  }, [currentResult, daysInMonth, prevYear, year, month])
}
