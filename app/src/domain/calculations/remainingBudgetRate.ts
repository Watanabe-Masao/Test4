/**
 * 残予算必要達成率
 *
 * 残りの予算を、残り期間の計画予算に対して何％必要かを算出する。
 *
 * 式: (月間予算 - 累計実績) ÷ 残期間予算 × 100
 *
 * - 残期間予算 = Σ budgetDaily[elapsedDays+1 .. daysInMonth]
 * - 100% = 計画通りのペース、100%超 = 巻き返しが必要
 */
import { z } from 'zod'
import { safeDivide } from './utils'

export interface RemainingBudgetRateInput {
  /** 月間予算 */
  readonly budget: number
  /** 累計実績売上 */
  readonly totalSales: number
  /** 日別予算マップ (day → amount) */
  readonly budgetDaily: ReadonlyMap<number, number>
  /** 経過日数 */
  readonly elapsedDays: number
  /** 月日数 */
  readonly daysInMonth: number
}

export const RemainingBudgetRateInputSchema = z.object({
  budget: z.number(),
  totalSales: z.number(),
  budgetDaily: z.map(z.number(), z.number()),
  elapsedDays: z.number(),
  daysInMonth: z.number(),
})

/**
 * 残予算必要達成率を算出する（%値: 100 = 計画通り）
 *
 * @returns 達成率（%表示済み）。残期間予算が 0 なら 0 を返す。
 */
export function calculateRemainingBudgetRate(input: RemainingBudgetRateInput): number {
  const { budget, totalSales, budgetDaily, elapsedDays, daysInMonth } = input

  // 残予算額 = 月間予算 − 累計実績
  const remainingTarget = budget - totalSales

  // 残期間予算 = Σ budgetDaily[elapsedDays+1 .. daysInMonth]
  let remainingPeriodBudget = 0
  for (let d = elapsedDays + 1; d <= daysInMonth; d++) {
    remainingPeriodBudget += budgetDaily.get(d) ?? 0
  }

  return safeDivide(remainingTarget, remainingPeriodBudget, 0) * 100
}
