/**
 * remaining-budget-rate-wasm 型付きモック（candidate: BIZ-008）
 */
import { calculateRemainingBudgetRate } from '@/domain/calculations/remainingBudgetRate'

export default function init(): Promise<void> {
  return Promise.resolve()
}

export function calculate_remaining_budget_rate(
  budget: number,
  totalSales: number,
  budgetDailyArr: Float64Array,
  elapsedDays: number,
  daysInMonth: number,
): number {
  // Float64Array → Map に戻して TS 実装に渡す
  const budgetDaily = new Map<number, number>()
  for (let i = 0; i < budgetDailyArr.length; i++) {
    if (budgetDailyArr[i] !== 0) {
      budgetDaily.set(i + 1, budgetDailyArr[i])
    }
  }
  return calculateRemainingBudgetRate({ budget, totalSales, budgetDaily, elapsedDays, daysInMonth })
}
