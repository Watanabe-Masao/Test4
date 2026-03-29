/**
 * PrevYearBudgetDetailPanel ViewModel
 *
 * 週次集計・曜日ギャップ影響額の計算ロジック。React 非依存。
 *
 * @guard F7 View は ViewModel のみ受け取る
 */
import type { DowGapAnalysis, DowGapMethod } from '@/domain/models/ComparisonContext'
import { safeDivide } from '@/domain/calculations/utils'

// ── 型定義 ──

export interface WeeklyTotal {
  readonly sales: number
  readonly customers: number
  readonly budget: number
  readonly days: number
}

// ── 計算ロジック ──

/** 週番号別に売上・客数・予算を累積する */
export function aggregateWeeklyTotals(
  baseRows: readonly { week: number; prevSales: number; prevCustomers: number; budget: number }[],
): ReadonlyMap<number, WeeklyTotal> {
  const map = new Map<number, { sales: number; customers: number; budget: number; days: number }>()
  for (const row of baseRows) {
    const existing = map.get(row.week)
    if (existing) {
      existing.sales += row.prevSales
      existing.customers += row.prevCustomers
      existing.budget += row.budget
      existing.days++
    } else {
      map.set(row.week, {
        sales: row.prevSales,
        customers: row.prevCustomers,
        budget: row.budget,
        days: 1,
      })
    }
  }
  return map
}

/** 想定客数ギャップ: 曜日別平均客数 × 日数差 */
export function computeEstimatedCustomerGap(
  dowGap: DowGapAnalysis,
  gapMethod: DowGapMethod,
): number {
  if (!dowGap.isValid) return 0
  const methodResult = dowGap.methodResults?.[gapMethod]
  if (methodResult) {
    return Math.round(
      dowGap.dowCounts.reduce((s, d) => s + d.diff * (methodResult.dowAvgCustomers[d.dow] ?? 0), 0),
    )
  }
  return Math.round(
    dowGap.dowCounts.reduce(
      (s, d) => s + d.diff * (dowGap.prevDowDailyAvgCustomers[d.dow] ?? 0),
      0,
    ),
  )
}

/** 想定客単価影響 */
export function computeEstimatedUnitPriceImpact(
  dowGap: DowGapAnalysis,
  entrySales: number,
  entryCustomers: number,
  salesImpact: number,
  estimatedCustomerGap: number,
  prevTransactionValue: number,
): number {
  if (!dowGap.isValid || entryCustomers === 0) return 0
  const adjustedSales = entrySales + salesImpact
  const adjustedCustomers = entryCustomers + estimatedCustomerGap
  if (adjustedCustomers <= 0) return 0
  return safeDivide(adjustedSales, adjustedCustomers, 0) - prevTransactionValue
}

/** 期間ラベルを構築する */
export function buildPeriodLabels(
  dailyMapping: readonly {
    prevDay: number
    prevMonth: number
    prevYear: number
    currentDay: number
  }[],
  sourceYear: number,
  sourceMonth: number,
  targetYear: number,
  targetMonth: number,
): { prev: string; cur: string } {
  if (dailyMapping.length === 0) {
    return { prev: `${sourceYear}年${sourceMonth}月`, cur: `${targetYear}年${targetMonth}月` }
  }
  const first = dailyMapping[0]
  const last = dailyMapping[dailyMapping.length - 1]
  const prev =
    first.prevMonth === last.prevMonth && first.prevYear === last.prevYear
      ? `${first.prevYear}年${first.prevMonth}月${first.prevDay}日〜${last.prevDay}日`
      : `${first.prevYear}年${first.prevMonth}月${first.prevDay}日〜${last.prevYear}年${last.prevMonth}月${last.prevDay}日`
  const cur = `${targetYear}年${targetMonth}月${first.currentDay}日〜${last.currentDay}日`
  return { prev, cur }
}
