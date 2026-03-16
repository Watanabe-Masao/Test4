import { safeDivide } from './utils'

/**
 * 予算分析
 */

// ── 汎用予算ユーティリティ ──

/**
 * 日別予算配分に基づく期間按分
 *
 * 月間予算（売上予算・粗利予算等）を、日別予算の配分比率で経過期間分に按分する。
 * 均等按分ではなく、日別予算の実際の配分を反映する。
 *
 * @param monthlyTotal 月間合計値（予算・粗利予算など）
 * @param monthlyBudget 月間売上予算（配分比率の分母）
 * @param budgetDaily 日別売上予算（配分比率の計算元）
 * @param elapsedDays 経過日数
 * @returns 按分後の値。monthlyBudget=0 の場合 0
 *
 * @invariant elapsedDays >= daysInMonth の場合、monthlyTotal を返す
 * @invariant elapsedDays === 0 の場合、0 を返す
 *
 * @example
 * // 粗利予算の按分:
 * const elapsedGpBudget = prorateBudget(gpBudget, salesBudget, budgetDaily, 15)
 */
export function prorateBudget(
  monthlyTotal: number,
  monthlyBudget: number,
  budgetDaily: ReadonlyMap<number, number> | Readonly<Record<number, number>>,
  elapsedDays: number,
): number {
  if (elapsedDays <= 0 || monthlyBudget === 0) return 0

  let periodBudgetSum = 0
  for (let d = 1; d <= elapsedDays; d++) {
    periodBudgetSum +=
      budgetDaily instanceof Map ? (budgetDaily.get(d) ?? 0) : ((budgetDaily as Record<number, number>)[d] ?? 0)
  }

  return safeDivide(monthlyTotal * periodBudgetSum, monthlyBudget, 0)
}

/**
 * 線形予測（実績 + 日平均 × 残日数）
 *
 * 現在までの実績と日平均から月末の着地を予測する。
 * 3箇所で重複していた計算を集約。
 *
 * @param actual 現在までの累計実績
 * @param elapsedDays 経過日数
 * @param daysInMonth 月の日数
 * @returns 月末予測値
 *
 * @invariant elapsedDays >= daysInMonth の場合、actual を返す
 * @invariant elapsedDays === 0 の場合、0 を返す
 */
export function projectLinear(actual: number, elapsedDays: number, daysInMonth: number): number {
  if (elapsedDays <= 0) return 0
  if (elapsedDays >= daysInMonth) return actual
  const avgDaily = actual / elapsedDays
  const remainingDays = daysInMonth - elapsedDays
  return actual + avgDaily * remainingDays
}

/** 予算分析の入力パラメータ */
export interface BudgetAnalysisInput {
  readonly totalSales: number // 実績売上合計
  readonly budget: number // 月間予算
  readonly budgetDaily: Readonly<Record<number, number>> // 日別予算
  readonly salesDaily: Readonly<Record<number, number>> // 日別売上
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
  readonly dailyCumulative: Readonly<
    Record<number, { readonly sales: number; readonly budget: number }>
  > // 日別累計
}

/**
 * 予算分析を実行する
 */
export function calculateBudgetAnalysis(input: BudgetAnalysisInput): BudgetAnalysisResult {
  const { totalSales, budget, budgetDaily, salesDaily, elapsedDays, daysInMonth } = input

  // 予算達成率 = 売上 / 予算
  const budgetAchievementRate = safeDivide(totalSales, budget, 0)

  // 予算消化率（日別累計 vs 予算累計）
  let cumulativeBudget = 0
  for (let d = 1; d <= elapsedDays; d++) {
    cumulativeBudget += budgetDaily[d] ?? 0
  }
  const budgetProgressRate = safeDivide(totalSales, cumulativeBudget, 0)

  // 予算経過率 = 経過日までの累計予算 / 月間予算
  const budgetElapsedRate = safeDivide(cumulativeBudget, budget, 0)

  // 日平均売上（観測期間ベース: 月初〜最終売上計上日）
  const averageDailySales = safeDivide(totalSales, elapsedDays, 0)

  // 月末予測売上 = 実績 + 日平均 × 残日数（分母と乗数は同一基準）
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
  const dailyCumulative: Record<number, { readonly sales: number; readonly budget: number }> = {}
  let cumSales = 0
  let cumBudget = 0
  for (let d = 1; d <= daysInMonth; d++) {
    cumSales += salesDaily[d] ?? 0
    cumBudget += budgetDaily[d] ?? 0
    dailyCumulative[d] = { sales: cumSales, budget: cumBudget }
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
  const { grossProfit, grossProfitBudget, budgetElapsedRate, elapsedDays, daysInMonth } = input

  const elapsedGPBudget = grossProfitBudget * budgetElapsedRate
  const grossProfitBudgetVariance = grossProfit - elapsedGPBudget

  const gpAchievement = safeDivide(grossProfit, grossProfitBudget, 0)
  const grossProfitProgressGap = gpAchievement - budgetElapsedRate

  const remainingDays = daysInMonth - elapsedDays
  const requiredDailyGrossProfit =
    remainingDays > 0 ? safeDivide(grossProfitBudget - grossProfit, remainingDays, 0) : 0

  // 日平均粗利（観測期間ベース: 分母と乗数は同一基準）
  const averageDailyGP = safeDivide(grossProfit, elapsedDays, 0)
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
