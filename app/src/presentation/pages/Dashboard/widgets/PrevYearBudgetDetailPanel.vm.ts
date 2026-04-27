/**
 * PrevYearBudgetDetailPanel ViewModel
 *
 * 週次集計・曜日ギャップ影響額の計算ロジック。React 非依存。
 *
 * @guard F7 View は ViewModel のみ受け取る
 *
 * @responsibility R:unclassified
 */
import type { DowGapAnalysis, DowGapMethod } from '@/domain/models/ComparisonContext'
import type { ComparisonPoint } from '@/application/comparison/viewModels'
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

/** TableRow（panel 表示用） */
export interface BudgetDetailRow {
  readonly currentDay: number
  readonly prevDay: number
  readonly prevMonth: number
  readonly prevYear: number
  readonly prevSales: number
  readonly prevCustomers: number
  readonly prevCtsQuantity: number
  readonly budget: number
  readonly week: number
  readonly dow: number
}

/**
 * 比較ポイント + budget → BudgetDetailRow[] を構築する。
 * dailyMapping shape を知らず、comparison subsystem が定義した
 * 整形済みポイントデータのみを受け取る。
 *
 * `weekNumberFn` / `getDowFn` は domain 層の CalendarDate-based API を
 * そのまま受け入れる（Phase A Step 1 で統合）。
 */
export function buildBudgetDetailRows(
  points: readonly ComparisonPoint[],
  budgetDaily: ReadonlyMap<number, number>,
  targetYear: number,
  targetMonth: number,
  weekNumberFn: (date: { year: number; month: number; day: number }) => number,
  getDowFn: (date: { year: number; month: number; day: number }) => number,
): readonly BudgetDetailRow[] {
  return points.map((pt) => ({
    currentDay: pt.currentDay,
    prevDay: pt.sourceDate.day,
    prevMonth: pt.sourceDate.month,
    prevYear: pt.sourceDate.year,
    prevSales: pt.sales,
    prevCustomers: pt.customers,
    prevCtsQuantity: pt.ctsQuantity,
    budget: budgetDaily.get(pt.currentDay) ?? 0,
    week: weekNumberFn({ year: targetYear, month: targetMonth, day: pt.currentDay }),
    dow: getDowFn(pt.sourceDate),
  }))
}

/** 期間ラベルを構築する（comparison ポイントから） */
export function buildPeriodLabels(
  points: readonly ComparisonPoint[],
  sourceYear: number,
  sourceMonth: number,
  targetYear: number,
  targetMonth: number,
): { prev: string; cur: string } {
  if (points.length === 0) {
    return { prev: `${sourceYear}年${sourceMonth}月`, cur: `${targetYear}年${targetMonth}月` }
  }
  const first = points[0]
  const last = points[points.length - 1]
  const prev =
    first.sourceDate.month === last.sourceDate.month &&
    first.sourceDate.year === last.sourceDate.year
      ? `${first.sourceDate.year}年${first.sourceDate.month}月${first.sourceDate.day}日〜${last.sourceDate.day}日`
      : `${first.sourceDate.year}年${first.sourceDate.month}月${first.sourceDate.day}日〜${last.sourceDate.year}年${last.sourceDate.month}月${last.sourceDate.day}日`
  const cur = `${targetYear}年${targetMonth}月${first.currentDay}日〜${last.currentDay}日`
  return { prev, cur }
}
