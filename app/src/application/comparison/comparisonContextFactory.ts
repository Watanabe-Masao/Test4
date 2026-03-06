/**
 * ComparisonContext ファクトリ — ゼロ値パターンの生成
 *
 * データが無い場合でもコンシューマーが null チェック不要で使えるよう、
 * ゼロ値の PeriodSnapshot / ComparisonContext を提供する。
 */
import type { PeriodMetrics } from '@/application/usecases/calculation/periodMetricsCalculator'
import type { PeriodSnapshot, ComparisonContext } from './ComparisonContext'
import { ZERO_DOW_GAP_ANALYSIS } from '@/domain/calculations/dowGapAnalysis'

/** ゼロ値の PeriodMetrics */
export const ZERO_PERIOD_METRICS: PeriodMetrics = {
  storeId: '',
  totalSales: 0,
  totalCoreSales: 0,
  grossSales: 0,
  deliverySalesPrice: 0,
  deliverySalesCost: 0,
  totalFlowersPrice: 0,
  totalFlowersCost: 0,
  totalDirectProducePrice: 0,
  totalDirectProduceCost: 0,
  totalCost: 0,
  inventoryCost: 0,
  totalPurchaseCost: 0,
  totalPurchasePrice: 0,
  interStoreInCost: 0,
  interStoreInPrice: 0,
  interStoreOutCost: 0,
  interStoreOutPrice: 0,
  interDeptInCost: 0,
  interDeptInPrice: 0,
  interDeptOutCost: 0,
  interDeptOutPrice: 0,
  totalTransferCost: 0,
  totalTransferPrice: 0,
  totalDiscount: 0,
  discountRate: 0,
  discountLossCost: 0,
  averageMarkupRate: 0,
  coreMarkupRate: 0,
  totalCostInclusion: 0,
  costInclusionRate: 0,
  totalCustomers: 0,
  averageCustomersPerDay: 0,
  openingInventory: null,
  closingInventory: null,
  invMethodCogs: null,
  invMethodGrossProfit: null,
  invMethodGrossProfitRate: null,
  estMethodCogs: 0,
  estMethodMargin: 0,
  estMethodMarginRate: 0,
  estMethodClosingInventory: null,
  grossProfitBudget: 0,
  salesDays: 0,
  totalDays: 0,
  purchaseMaxDay: 0,
  hasDiscountData: false,
}

/** ゼロ値の PeriodSnapshot を生成する */
function createEmptySnapshot(year: number, month: number): PeriodSnapshot {
  return {
    metrics: ZERO_PERIOD_METRICS,
    hasData: false,
    year,
    month,
  }
}

/**
 * PeriodMetrics[] を全店合算した単一の PeriodMetrics に集約する
 *
 * 全店の KPI カード用。storeId は 'all' を使用。
 */
export function aggregateMetrics(metrics: readonly PeriodMetrics[]): PeriodMetrics {
  if (metrics.length === 0) return ZERO_PERIOD_METRICS
  if (metrics.length === 1) return metrics[0]

  // 数値フィールドを合算
  let totalSales = 0
  let totalCoreSales = 0
  let grossSales = 0
  let deliverySalesPrice = 0
  let deliverySalesCost = 0
  let totalFlowersPrice = 0
  let totalFlowersCost = 0
  let totalDirectProducePrice = 0
  let totalDirectProduceCost = 0
  let totalCost = 0
  let inventoryCost = 0
  let totalPurchaseCost = 0
  let totalPurchasePrice = 0
  let interStoreInCost = 0
  let interStoreInPrice = 0
  let interStoreOutCost = 0
  let interStoreOutPrice = 0
  let interDeptInCost = 0
  let interDeptInPrice = 0
  let interDeptOutCost = 0
  let interDeptOutPrice = 0
  let totalTransferCost = 0
  let totalTransferPrice = 0
  let totalDiscount = 0
  let totalCostInclusion = 0
  let totalCustomers = 0
  let grossProfitBudget = 0
  let salesDays = 0
  let totalDays = 0
  let purchaseMaxDay = 0
  let hasDiscountData = false

  for (const m of metrics) {
    totalSales += m.totalSales
    totalCoreSales += m.totalCoreSales
    grossSales += m.grossSales
    deliverySalesPrice += m.deliverySalesPrice
    deliverySalesCost += m.deliverySalesCost
    totalFlowersPrice += m.totalFlowersPrice
    totalFlowersCost += m.totalFlowersCost
    totalDirectProducePrice += m.totalDirectProducePrice
    totalDirectProduceCost += m.totalDirectProduceCost
    totalCost += m.totalCost
    inventoryCost += m.inventoryCost
    totalPurchaseCost += m.totalPurchaseCost
    totalPurchasePrice += m.totalPurchasePrice
    interStoreInCost += m.interStoreInCost
    interStoreInPrice += m.interStoreInPrice
    interStoreOutCost += m.interStoreOutCost
    interStoreOutPrice += m.interStoreOutPrice
    interDeptInCost += m.interDeptInCost
    interDeptInPrice += m.interDeptInPrice
    interDeptOutCost += m.interDeptOutCost
    interDeptOutPrice += m.interDeptOutPrice
    totalTransferCost += m.totalTransferCost
    totalTransferPrice += m.totalTransferPrice
    totalDiscount += m.totalDiscount
    totalCostInclusion += m.totalCostInclusion
    totalCustomers += m.totalCustomers
    grossProfitBudget += m.grossProfitBudget
    if (m.salesDays > salesDays) salesDays = m.salesDays
    if (m.totalDays > totalDays) totalDays = m.totalDays
    if (m.purchaseMaxDay > purchaseMaxDay) purchaseMaxDay = m.purchaseMaxDay
    if (m.hasDiscountData) hasDiscountData = true
  }

  // 率は合算後に再計算
  const allPurchasePrice = totalPurchasePrice + deliverySalesPrice + totalTransferPrice
  const allPurchaseCost = totalPurchaseCost + deliverySalesCost + totalTransferCost
  const averageMarkupRate =
    allPurchasePrice > 0 ? (allPurchasePrice - allPurchaseCost) / allPurchasePrice : 0
  const corePurchasePrice = totalPurchasePrice + totalTransferPrice
  const corePurchaseCost = totalPurchaseCost + totalTransferCost
  const coreMarkupRate =
    corePurchasePrice > 0 ? (corePurchasePrice - corePurchaseCost) / corePurchasePrice : 0
  const discountRate =
    totalSales + totalDiscount > 0 ? totalDiscount / (totalSales + totalDiscount) : 0
  const costInclusionRate = totalSales > 0 ? totalCostInclusion / totalSales : 0
  const averageCustomersPerDay = salesDays > 0 ? totalCustomers / salesDays : 0

  // 推定法: コア売上ベースで再計算
  const grossSalesEst = discountRate < 1 ? totalCoreSales / (1 - discountRate) : totalCoreSales
  const estMethodCogs = grossSalesEst * (1 - coreMarkupRate) + totalCostInclusion
  const estMethodMargin = totalCoreSales - estMethodCogs
  const estMethodMarginRate = totalCoreSales > 0 ? estMethodMargin / totalCoreSales : 0

  return {
    storeId: 'all',
    totalSales,
    totalCoreSales,
    grossSales,
    deliverySalesPrice,
    deliverySalesCost,
    totalFlowersPrice,
    totalFlowersCost,
    totalDirectProducePrice,
    totalDirectProduceCost,
    totalCost,
    inventoryCost,
    totalPurchaseCost,
    totalPurchasePrice,
    interStoreInCost,
    interStoreInPrice,
    interStoreOutCost,
    interStoreOutPrice,
    interDeptInCost,
    interDeptInPrice,
    interDeptOutCost,
    interDeptOutPrice,
    totalTransferCost,
    totalTransferPrice,
    totalDiscount,
    discountRate,
    discountLossCost:
      discountRate < 1
        ? (1 - coreMarkupRate) * totalCoreSales * (discountRate / (1 - discountRate))
        : (1 - coreMarkupRate) * totalCoreSales * discountRate,
    averageMarkupRate,
    coreMarkupRate,
    totalCostInclusion,
    costInclusionRate,
    totalCustomers,
    averageCustomersPerDay,
    openingInventory: null,
    closingInventory: null,
    invMethodCogs: null,
    invMethodGrossProfit: null,
    invMethodGrossProfitRate: null,
    estMethodCogs,
    estMethodMargin,
    estMethodMarginRate,
    estMethodClosingInventory: null,
    grossProfitBudget,
    salesDays,
    totalDays,
    purchaseMaxDay,
    hasDiscountData,
  }
}

/** 読み込み中/初期状態の ComparisonContext（全フィールドアクセス可能） */
export function createEmptyComparisonContext(year: number, month: number): ComparisonContext {
  return {
    current: createEmptySnapshot(year, month),
    sameDow: createEmptySnapshot(year - 1, month),
    sameDate: createEmptySnapshot(year - 1, month),
    dowGap: ZERO_DOW_GAP_ANALYSIS,
    isReady: false,
  }
}

/** PeriodMetrics[] → PeriodSnapshot */
export function toSnapshot(
  metrics: readonly PeriodMetrics[],
  year: number,
  month: number,
): PeriodSnapshot {
  if (metrics.length === 0) {
    return createEmptySnapshot(year, month)
  }
  return {
    metrics: aggregateMetrics(metrics),
    hasData: true,
    year,
    month,
  }
}
