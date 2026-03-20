/**
 * budget-analysis-wasm 型付きモック
 *
 * Rust WASM モジュールの API サーフェスを模倣する。
 * 2 関数を TS ドメイン関数へのパススルーで実装。
 */
import {
  calculateBudgetAnalysis as calculateBudgetAnalysisTS,
  calculateGrossProfitBudget as calculateGrossProfitBudgetTS,
} from '@/domain/calculations/budgetAnalysis'

export default function init(): Promise<void> {
  return Promise.resolve()
}

/**
 * [0] budgetAchievementRate [1] budgetProgressRate [2] budgetElapsedRate
 * [3] budgetProgressGap [4] budgetVariance [5] averageDailySales
 * [6] projectedSales [7] projectedAchievement [8] requiredDailySales
 * [9] remainingBudget
 */
export function calculate_budget_analysis(
  totalSales: number,
  budget: number,
  budgetDailyArr: Float64Array,
  elapsedDays: number,
  salesDays: number,
  daysInMonth: number,
): Float64Array {
  // budgetDailyArr (flat, 0-indexed) → Record<number, number> (1-indexed)
  const budgetDaily: Record<number, number> = {}
  const salesDaily: Record<number, number> = {}
  for (let i = 0; i < daysInMonth; i++) {
    if (budgetDailyArr[i] !== 0) budgetDaily[i + 1] = budgetDailyArr[i]
    // salesDaily は WASM API では渡されない。TS 関数には空で渡す。
    // scalar 結果は totalSales から算出されるため影響なし。
  }

  const r = calculateBudgetAnalysisTS({
    totalSales,
    budget,
    budgetDaily,
    salesDaily,
    elapsedDays,
    salesDays,
    daysInMonth,
  })

  return Float64Array.from([
    r.budgetAchievementRate,
    r.budgetProgressRate,
    r.budgetElapsedRate,
    r.budgetProgressGap,
    r.budgetVariance,
    r.averageDailySales,
    r.projectedSales,
    r.projectedAchievement,
    r.requiredDailySales,
    r.remainingBudget,
  ])
}

/**
 * [0] grossProfitBudgetVariance [1] grossProfitProgressGap
 * [2] requiredDailyGrossProfit [3] projectedGrossProfit
 * [4] projectedGPAchievement
 */
export function calculate_gross_profit_budget(
  grossProfit: number,
  grossProfitBudget: number,
  budgetElapsedRate: number,
  elapsedDays: number,
  salesDays: number,
  daysInMonth: number,
): Float64Array {
  const r = calculateGrossProfitBudgetTS({
    grossProfit,
    grossProfitBudget,
    budgetElapsedRate,
    elapsedDays,
    salesDays,
    daysInMonth,
  })
  return Float64Array.from([
    r.grossProfitBudgetVariance,
    r.grossProfitProgressGap,
    r.requiredDailyGrossProfit,
    r.projectedGrossProfit,
    r.projectedGPAchievement,
  ])
}
