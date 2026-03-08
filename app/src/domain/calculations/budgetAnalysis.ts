import { safeDivide } from './utils'

/**
 * 予算分析
 */

/** 予算分析の入力パラメータ */
export interface BudgetAnalysisInput {
  readonly totalSales: number // 実績売上合計
  readonly budget: number // 月間予算
  readonly budgetDaily: ReadonlyMap<number, number> // 日別予算
  readonly salesDaily: ReadonlyMap<number, number> // 日別売上
  readonly elapsedDays: number // 経過日数
  readonly salesDays: number // 営業日数（売上がある日数）
  readonly daysInMonth: number // 月の日数
}

/** 予算分析の計算結果 */
export interface BudgetAnalysisResult {
  readonly budgetAchievementRate: number // 予算達成率
  readonly budgetProgressRate: number // 予算消化率
  readonly budgetElapsedRate: number // 予算経過率（経過予算/月間予算）
  readonly budgetProgressGap: number // 進捗ギャップ（消化率 − 経過率）
  readonly budgetVariance: number // 予算差異（累計実績 − 累計予算）
  readonly averageDailySales: number // 日平均売上
  readonly projectedSales: number // 月末予測売上
  readonly projectedAchievement: number // 予算達成率予測
  readonly requiredDailySales: number // 必要日次売上（残余予算 / 残日数）
  readonly remainingBudget: number // 残余予算
  readonly dailyCumulative: ReadonlyMap<number, { sales: number; budget: number }> // 日別累計
}

/**
 * 予算分析を実行する
 */
export function calculateBudgetAnalysis(input: BudgetAnalysisInput): BudgetAnalysisResult {
  const { totalSales, budget, budgetDaily, salesDaily, elapsedDays, salesDays, daysInMonth } = input

  // 予算達成率 = 売上 / 予算
  const budgetAchievementRate = safeDivide(totalSales, budget, 0)

  // 予算消化率（日別累計 vs 予算累計）
  let cumulativeBudget = 0
  for (let d = 1; d <= elapsedDays; d++) {
    cumulativeBudget += budgetDaily.get(d) ?? 0
  }
  const budgetProgressRate = safeDivide(totalSales, cumulativeBudget, 0)

  // 予算経過率 = 経過日までの累計予算 / 月間予算
  const budgetElapsedRate = safeDivide(cumulativeBudget, budget, 0)

  // 日平均売上（営業日ベース）
  const averageDailySales = safeDivide(totalSales, salesDays, 0)

  // 月末予測売上 = 日平均売上 × 月の日数
  // ※ 営業日ベースなので残日数分も営業日で換算
  const remainingDays = daysInMonth - elapsedDays
  const projectedSales = totalSales + averageDailySales * remainingDays

  // 予算達成率予測
  const projectedAchievement = safeDivide(projectedSales, budget, 0)

  // 進捗ギャップ = 消化率 − 経過率（正 = 前倒し、負 = 遅れ）
  const budgetProgressGap = budgetProgressRate - budgetElapsedRate

  // 予算差異 = 累計実績 − 累計予算（正 = 予算超過ペース）
  const budgetVariance = totalSales - cumulativeBudget

  // 必要日次売上 = 残余予算 / 残日数
  const requiredDailySales =
    remainingDays > 0 ? safeDivide(budget - totalSales, remainingDays, 0) : 0

  // 残余予算
  const remainingBudget = budget - totalSales

  // 日別累計
  const dailyCumulative = new Map<number, { sales: number; budget: number }>()
  let cumSales = 0
  let cumBudget = 0
  for (let d = 1; d <= daysInMonth; d++) {
    cumSales += salesDaily.get(d) ?? 0
    cumBudget += budgetDaily.get(d) ?? 0
    dailyCumulative.set(d, { sales: cumSales, budget: cumBudget })
  }

  return {
    budgetAchievementRate,
    budgetProgressRate,
    budgetElapsedRate,
    budgetProgressGap,
    budgetVariance,
    averageDailySales,
    projectedSales,
    projectedAchievement,
    requiredDailySales,
    remainingBudget,
    dailyCumulative,
  }
}

/** 粗利予算分析の入力パラメータ */
export interface GrossProfitBudgetInput {
  readonly grossProfit: number
  readonly grossProfitBudget: number
  readonly budgetElapsedRate: number
  readonly elapsedDays: number
  readonly salesDays: number
  readonly daysInMonth: number
}

/** 粗利予算分析の計算結果 */
export interface GrossProfitBudgetResult {
  readonly grossProfitBudgetVariance: number
  readonly grossProfitProgressGap: number
  readonly requiredDailyGrossProfit: number
  readonly projectedGrossProfit: number
  readonly projectedGPAchievement: number
}

/**
 * 粗利予算分析を実行する
 */
export function calculateGrossProfitBudget(input: GrossProfitBudgetInput): GrossProfitBudgetResult {
  const { grossProfit, grossProfitBudget, budgetElapsedRate, elapsedDays, salesDays, daysInMonth } =
    input

  const elapsedGPBudget = grossProfitBudget * budgetElapsedRate
  const grossProfitBudgetVariance = grossProfit - elapsedGPBudget

  const gpAchievement = safeDivide(grossProfit, grossProfitBudget, 0)
  const grossProfitProgressGap = gpAchievement - budgetElapsedRate

  const remainingDays = daysInMonth - elapsedDays
  const requiredDailyGrossProfit =
    remainingDays > 0 ? safeDivide(grossProfitBudget - grossProfit, remainingDays, 0) : 0

  const averageDailyGP = safeDivide(grossProfit, salesDays, 0)
  const projectedGrossProfit = grossProfit + averageDailyGP * remainingDays
  const projectedGPAchievement = safeDivide(projectedGrossProfit, grossProfitBudget, 0)

  return {
    grossProfitBudgetVariance,
    grossProfitProgressGap,
    requiredDailyGrossProfit,
    projectedGrossProfit,
    projectedGPAchievement,
  }
}
