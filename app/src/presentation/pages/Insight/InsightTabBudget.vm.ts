/**
 * InsightTabBudget ViewModel
 *
 * 予算テーブルの行データ構築ロジック。React 非依存。
 * レンダリング内の IIFE から累積計算を分離する。
 *
 * @guard F7 View は ViewModel のみ受け取る
 */
import { getPrevYearDailySales } from '@/application/comparison/comparisonAccessors'
import type { PrevYearData } from '@/application/comparison/comparisonTypes'
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
  readonly discountRateCum: number
  readonly cumDiscountRate: number
  readonly pyDaySales: number
  readonly pyDayRatio: number
  readonly cumPrevYear: number
  readonly pyCumRatio: number
}

// ── 計算ロジック ──

/**
 * 予算テーブルの行データを構築する（累積計算含む）。
 *
 * render 内の IIFE から抽出した純粋関数。
 * 累積状態を持つため、chartData の順序に依存する。
 */
export function buildBudgetTableRows(
  chartData: readonly { day: number; actualCum: number; budgetCum: number }[],
  daily: ReadonlyMap<number, DailyRecord>,
  salesDaily: ReadonlyMap<number, number>,
  budgetDaily: ReadonlyMap<number, number>,
  prevYear: PrevYearData,
  year: number,
  month: number,
): readonly BudgetTableRow[] {
  let cumDiscount = 0
  let cumGrossSales = 0
  let cumPrevYear = 0

  return chartData
    .filter((cd) => cd.actualCum > 0 || cd.budgetCum > 0)
    .map((cd) => {
      const dailyRec = daily.get(cd.day)
      const daySales = salesDaily.get(cd.day) ?? 0
      const dayBudget = budgetDaily.get(cd.day) ?? 0
      const variance = daySales - dayBudget
      const achievement = cd.budgetCum > 0 ? cd.actualCum / cd.budgetCum : 0
      const dayDiscountAbsolute = dailyRec?.discountAbsolute ?? 0
      cumDiscount += dayDiscountAbsolute
      cumGrossSales += dailyRec?.grossSales ?? 0
      const discountRateCum = safeDivide(cumDiscount, cumGrossSales, 0)
      const budgetVariance = cd.actualCum - cd.budgetCum
      const pyDaySales = getPrevYearDailySales(prevYear, year, month, cd.day)
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
        discountRateCum,
        cumDiscountRate: discountRateCum,
        pyDaySales,
        pyDayRatio,
        cumPrevYear,
        pyCumRatio,
      }
    })
}
