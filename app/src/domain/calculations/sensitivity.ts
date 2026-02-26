/**
 * 感度分析（Sensitivity Analysis）
 *
 * StoreResult の主要指標に対して、入力パラメータの変動が
 * 粗利・売上にどの程度影響するかをシミュレーションする純粋関数群。
 *
 * 弾性値（Elasticity）: パラメータ1pt変動あたりの粗利変動額
 */
import { safeDivide } from './utils'

// ─── Types ────────────────────────────────────────────

/** 感度分析の入力パラメータ（ベースライン値） */
export interface SensitivityBase {
  readonly totalSales: number
  readonly totalCost: number
  readonly totalDiscount: number
  readonly grossSales: number
  readonly totalCustomers: number
  readonly totalConsumable: number
  readonly averageMarkupRate: number
  readonly budget: number
  readonly elapsedDays: number
  readonly salesDays: number
}

/** 変動量（差分） — 各パラメータの変動pt/% */
export interface SensitivityDeltas {
  /** 売変率の変動（pt単位、例: -0.01 = 1pt改善） */
  readonly discountRateDelta: number
  /** 客数の変動率（例: 0.05 = +5%） */
  readonly customersDelta: number
  /** 客単価の変動率（例: -0.03 = -3%） */
  readonly transactionValueDelta: number
  /** 原価率の変動（pt単位、例: 0.02 = 2pt悪化） */
  readonly costRateDelta: number
}

/** 感度分析の結果 */
export interface SensitivityResult {
  /** ベースラインの粗利額（推定法ベース） */
  readonly baseGrossProfit: number
  /** ベースラインの粗利率 */
  readonly baseGrossProfitRate: number
  /** シミュレーション後の粗利額 */
  readonly simulatedGrossProfit: number
  /** シミュレーション後の粗利率 */
  readonly simulatedGrossProfitRate: number
  /** 粗利額の変化量 */
  readonly grossProfitDelta: number
  /** シミュレーション後の売上 */
  readonly simulatedSales: number
  /** 売上の変化量 */
  readonly salesDelta: number
  /** シミュレーション後の着地予測 */
  readonly simulatedProjectedSales: number
  /** 着地予測の変化量 */
  readonly projectedSalesDelta: number
  /** 予算達成率の変化 */
  readonly budgetAchievementDelta: number
}

/** 弾性値（各パラメータ1pt変動あたりの粗利変動額） */
export interface ElasticityResult {
  /** 売変率1pt変動 → 粗利変動額 */
  readonly discountRateElasticity: number
  /** 客数1%変動 → 粗利変動額 */
  readonly customersElasticity: number
  /** 客単価1%変動 → 粗利変動額 */
  readonly transactionValueElasticity: number
  /** 原価率1pt変動 → 粗利変動額 */
  readonly costRateElasticity: number
}

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
  const consumableRate = safeDivide(base.totalConsumable, base.totalSales, 0)
  const simConsumable = simSales * consumableRate

  // 粗利 = 売上 - 原価 - 消耗品
  // 推定法ベース: margin = coreSales - estMethodCogs
  // 簡略化: grossProfit ≈ grossSales - cost - discount - consumable
  const baseGrossProfit = base.grossSales - base.totalCost - base.totalDiscount - base.totalConsumable
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
  readonly totalConsumable: number
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
    totalConsumable: result.totalConsumable,
    averageMarkupRate: result.averageMarkupRate,
    budget: result.budget,
    elapsedDays: result.elapsedDays,
    salesDays: result.salesDays,
  }
}
