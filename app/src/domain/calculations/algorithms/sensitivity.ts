/**
 * 感度分析（Sensitivity Analysis）
 *
 * StoreResult の主要指標に対して、入力パラメータの変動が
 * 粗利・売上にどの程度影響するかをシミュレーションする純粋関数群。
 *
 * 弾性値（Elasticity）: パラメータ1pt変動あたりの粗利変動額
 *
 * @responsibility R:unclassified
 */
import { z } from 'zod'
import { safeDivide } from '../utils'

// ─── Zod Schemas ─────────────────────────────────────

/** 感度分析の入力パラメータ（ベースライン値） */
export const SensitivityBaseSchema = z.object({
  totalSales: z.number(),
  totalCost: z.number(),
  totalDiscount: z.number(),
  grossSales: z.number(),
  totalCustomers: z.number(),
  totalCostInclusion: z.number(),
  averageMarkupRate: z.number(),
  budget: z.number(),
  elapsedDays: z.number(),
  salesDays: z.number(),
})
export type SensitivityBase = z.infer<typeof SensitivityBaseSchema>

/** 変動量（差分） — 各パラメータの変動pt/% */
export const SensitivityDeltasSchema = z.object({
  discountRateDelta: z.number(),
  customersDelta: z.number(),
  transactionValueDelta: z.number(),
  costRateDelta: z.number(),
})
export type SensitivityDeltas = z.infer<typeof SensitivityDeltasSchema>

/** 感度分析の結果 */
export const SensitivityResultSchema = z.object({
  baseGrossProfit: z.number(),
  baseGrossProfitRate: z.number(),
  simulatedGrossProfit: z.number(),
  simulatedGrossProfitRate: z.number(),
  grossProfitDelta: z.number(),
  simulatedSales: z.number(),
  salesDelta: z.number(),
  simulatedProjectedSales: z.number(),
  projectedSalesDelta: z.number(),
  budgetAchievementDelta: z.number(),
})
export type SensitivityResult = z.infer<typeof SensitivityResultSchema>

/** 弾性値（各パラメータ1pt変動あたりの粗利変動額） */
export const ElasticityResultSchema = z.object({
  discountRateElasticity: z.number(),
  customersElasticity: z.number(),
  transactionValueElasticity: z.number(),
  costRateElasticity: z.number(),
})
export type ElasticityResult = z.infer<typeof ElasticityResultSchema>

// ─── Functions ────────────────────────────────────────

/**
 * 感度分析を実行する。
 *
 * ベースライン値に対してdeltasで指定された変動を適用し、
 * 粗利・売上の変化をシミュレーションする。
 *
 * 計算ロジック:
 * - 売上 = 客数 × 客単価
 * - 粗利 = 売上 - 原価 - 売変 - 消耗品
 * - 各deltaは独立に適用（相互作用項あり: 客数×客単価は乗算効果）
 * @calc-id CALC-022
 */
export function calculateSensitivity(
  base: SensitivityBase,
  deltas: SensitivityDeltas,
): SensitivityResult {
  const baseTxValue = safeDivide(base.totalSales, base.totalCustomers, 0)
  const baseCostRate = safeDivide(base.totalCost, base.grossSales, 0)
  const baseDiscountRate = safeDivide(base.totalDiscount, base.grossSales, 0)

  // シミュレーション後の値
  const simCustomers = base.totalCustomers * (1 + deltas.customersDelta)
  const simTxValue = baseTxValue * (1 + deltas.transactionValueDelta)
  const simSales = simCustomers * simTxValue

  // 粗売上は売上 + 売変 の関係から推定（売変率の変動を反映）
  const simDiscountRate = baseDiscountRate + deltas.discountRateDelta
  const simGrossSales = safeDivide(simSales, 1 - simDiscountRate, simSales)

  // 原価 = 粗売上 × 原価率
  const simCostRate = baseCostRate + deltas.costRateDelta
  const simCost = simGrossSales * simCostRate

  // 売変額
  const simDiscount = simGrossSales * Math.max(0, simDiscountRate)

  // 消耗品は売上比例で推定
  const costInclusionRate = safeDivide(base.totalCostInclusion, base.totalSales, 0)
  const simConsumable = simSales * costInclusionRate

  // 粗利 = 売上 - 原価 - 消耗品
  // 推定法ベース: margin = coreSales - estMethodCogs
  // 簡略化: grossProfit ≈ grossSales - cost - discount - costInclusion
  const baseGrossProfit =
    base.grossSales - base.totalCost - base.totalDiscount - base.totalCostInclusion
  const simGrossProfit = simGrossSales - simCost - simDiscount - simConsumable

  const baseGPRate = safeDivide(baseGrossProfit, base.totalSales, 0)
  const simGPRate = safeDivide(simGrossProfit, simSales, 0)

  // 着地予測
  const dailyAvgBase = safeDivide(base.totalSales, base.elapsedDays, 0)
  const dailyAvgSim = safeDivide(simSales, base.elapsedDays, 0)
  const baseProjected = dailyAvgBase * base.salesDays
  const simProjected = dailyAvgSim * base.salesDays

  // 予算達成率の変化
  const baseAchievement = safeDivide(baseProjected, base.budget, 0)
  const simAchievement = safeDivide(simProjected, base.budget, 0)

  return {
    baseGrossProfit,
    baseGrossProfitRate: baseGPRate,
    simulatedGrossProfit: simGrossProfit,
    simulatedGrossProfitRate: simGPRate,
    grossProfitDelta: simGrossProfit - baseGrossProfit,
    simulatedSales: simSales,
    salesDelta: simSales - base.totalSales,
    simulatedProjectedSales: simProjected,
    projectedSalesDelta: simProjected - baseProjected,
    budgetAchievementDelta: simAchievement - baseAchievement,
  }
}

/**
 * 弾性値を計算する。
 *
 * 各パラメータを1単位（1pt or 1%）変動させたときの粗利変動額を算出。
 * 実務的な「このパラメータにテコ入れすべきか」の判断材料。
 */
export function calculateElasticity(base: SensitivityBase): ElasticityResult {
  const onePt = 0.01

  const discountResult = calculateSensitivity(base, {
    discountRateDelta: -onePt, // 売変率1pt改善
    customersDelta: 0,
    transactionValueDelta: 0,
    costRateDelta: 0,
  })

  const customersResult = calculateSensitivity(base, {
    discountRateDelta: 0,
    customersDelta: onePt, // 客数1%増
    transactionValueDelta: 0,
    costRateDelta: 0,
  })

  const txValueResult = calculateSensitivity(base, {
    discountRateDelta: 0,
    customersDelta: 0,
    transactionValueDelta: onePt, // 客単価1%増
    costRateDelta: 0,
  })

  const costResult = calculateSensitivity(base, {
    discountRateDelta: 0,
    customersDelta: 0,
    transactionValueDelta: 0,
    costRateDelta: -onePt, // 原価率1pt改善
  })

  return {
    discountRateElasticity: discountResult.grossProfitDelta,
    customersElasticity: customersResult.grossProfitDelta,
    transactionValueElasticity: txValueResult.grossProfitDelta,
    costRateElasticity: costResult.grossProfitDelta,
  }
}

/**
 * StoreResult から SensitivityBase を抽出する。
 * Application層で使用するヘルパー。domain層の型変換のみ。
 */
export function extractSensitivityBase(result: {
  readonly totalSales: number
  readonly totalCost: number
  readonly totalDiscount: number
  readonly grossSales: number
  readonly totalCustomers: number
  readonly totalCostInclusion: number
  readonly averageMarkupRate: number
  readonly budget: number
  readonly elapsedDays: number
  readonly salesDays: number
}): SensitivityBase {
  return {
    totalSales: result.totalSales,
    totalCost: result.totalCost,
    totalDiscount: result.totalDiscount,
    grossSales: result.grossSales,
    totalCustomers: result.totalCustomers,
    totalCostInclusion: result.totalCostInclusion,
    averageMarkupRate: result.averageMarkupRate,
    budget: result.budget,
    elapsedDays: result.elapsedDays,
    salesDays: result.salesDays,
  }
}
