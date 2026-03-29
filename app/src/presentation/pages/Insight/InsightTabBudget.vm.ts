/**
 * InsightTabBudget ViewModel
 *
 * 予算テーブルの行データ構築ロジック。React 非依存。
 * Presentation VM は domain/ のみに依存する（application/ への依存なし）。
 *
 * @guard F7 View は ViewModel のみ受け取る
 */
import { safeDivide } from '@/domain/calculations/utils'
import type { DailyRecord } from '@/domain/models/record'

// ── 型定義 ──

export interface BudgetTableRow {
  readonly day: number
  readonly dayBudget: number
  readonly daySales: number
  readonly variance: number
  readonly dayDiscountAbsolute: number
  readonly budgetCum: number
  readonly actualCum: number
  readonly budgetVariance: number
  readonly achievement: number
  readonly discountRate: number
  readonly discountRateCum: number
  readonly pyDaySales: number
  readonly pyDayRatio: number
  readonly cumPrevYear: number
  readonly pyCumRatio: number
}

// ── 計算ロジック ──

/**
 * 予算テーブルの行データを構築する（累積計算含む）。
 *
 * 内部で day 昇順ソートしてから累積計算するため、入力順序に依存しない。
 *
 * @param prevYearDailyMap 前年日別売上（day → sales）。
 *   呼び出し元で getPrevYearDailySales() を解決し Map を渡す。
 */
export function buildBudgetTableRows(
  chartData: readonly { day: number; actualCum: number; budgetCum: number }[],
  daily: ReadonlyMap<number, DailyRecord>,
  salesDaily: ReadonlyMap<number, number>,
  budgetDaily: ReadonlyMap<number, number>,
  prevYearDailyMap: ReadonlyMap<number, number>,
): readonly BudgetTableRow[] {
  let cumDiscount = 0
  let cumGrossSales = 0
  let cumPrevYear = 0

  // day 昇順ソート — 累積計算の順序依存を内部で吸収
  const sorted = [...chartData]
    .filter((cd) => cd.actualCum > 0 || cd.budgetCum > 0)
    .sort((a, b) => a.day - b.day)

  return sorted.map((cd) => {
    const dailyRec = daily.get(cd.day)
    const daySales = salesDaily.get(cd.day) ?? 0
    const dayBudget = budgetDaily.get(cd.day) ?? 0
    const variance = daySales - dayBudget
    const achievement = cd.budgetCum > 0 ? cd.actualCum / cd.budgetCum : 0
    const dayDiscountAbsolute = dailyRec?.discountAbsolute ?? 0
    const dayGrossSales = dailyRec?.grossSales ?? 0
    const discountRate = safeDivide(dayDiscountAbsolute, dayGrossSales, 0)
    cumDiscount += dayDiscountAbsolute
    cumGrossSales += dayGrossSales
    const discountRateCum = safeDivide(cumDiscount, cumGrossSales, 0)
    const budgetVariance = cd.actualCum - cd.budgetCum
    const pyDaySales = prevYearDailyMap.get(cd.day) ?? 0
    cumPrevYear += pyDaySales
    const pyDayRatio = pyDaySales > 0 ? daySales / pyDaySales : 0
    const pyCumRatio = cumPrevYear > 0 ? cd.actualCum / cumPrevYear : 0

    return {
      day: cd.day,
      dayBudget,
      daySales,
      variance,
      dayDiscountAbsolute,
      budgetCum: cd.budgetCum,
      actualCum: cd.actualCum,
      budgetVariance,
      achievement,
      discountRate,
      discountRateCum,
      pyDaySales,
      pyDayRatio,
      cumPrevYear,
      pyCumRatio,
    }
  })
}
