/**
 * 月次履歴データ変換ロジック（純粋関数）
 *
 * useMonthlyHistory から抽出。StoreResult → MonthlyDataPoint 変換と
 * StoreDaySummaryIndex の成分率集約を担う。
 */
import type { MonthlyDataPoint } from '@/domain/calculations/algorithms/trendAnalysis'
import type { StoreDaySummaryIndex } from '@/domain/models'
import { safeDivide, getEffectiveGrossProfitRate } from '@/domain/calculations/utils'

/**
 * 現在の StoreResult を MonthlyDataPoint に変換するヘルパー。
 * 過去月データに当月を追加して最新の季節性分析に含めるために使用。
 */
export function currentResultToMonthlyPoint(
  year: number,
  month: number,
  result: {
    readonly totalSales: number
    readonly totalCustomers: number
    readonly invMethodGrossProfit: number | null
    readonly invMethodGrossProfitRate: number | null
    readonly estMethodMargin: number
    readonly estMethodMarginRate: number
    readonly budget: number
    readonly budgetAchievementRate: number
    readonly discountRate: number
    readonly inventoryCost: number
    readonly deliverySalesCost: number
    readonly grossSales: number
    readonly costInclusionRate: number
    readonly averageMarkupRate: number
  },
  storeCount: number,
): MonthlyDataPoint {
  const costRate =
    result.grossSales > 0
      ? (result.inventoryCost + result.deliverySalesCost) / result.grossSales
      : null
  return {
    year,
    month,
    totalSales: result.totalSales,
    totalCustomers: result.totalCustomers,
    grossProfit: result.invMethodGrossProfit ?? result.estMethodMargin,
    grossProfitRate: getEffectiveGrossProfitRate(result),
    budget: result.budget > 0 ? result.budget : null,
    budgetAchievement: result.budgetAchievementRate,
    storeCount,
    discountRate: result.discountRate,
    costRate,
    costInclusionRate: result.costInclusionRate,
    averageMarkupRate: result.averageMarkupRate,
  }
}

/**
 * StoreDaySummaryIndex の全店舗・全日を集約して成分率を算出する。
 */
export function aggregateSummaryRates(summaries: StoreDaySummaryIndex): {
  discountRate: number
  costRate: number
  costInclusionRate: number
  averageMarkupRate: number
  totalCustomers: number
  grossProfit: number
  grossProfitRate: number
} | null {
  let totalSales = 0
  let totalGrossSales = 0
  let totalDiscount = 0
  let totalPurchaseCost = 0
  let totalPurchasePrice = 0
  let totalFlowersCost = 0
  let totalDirectProduceCost = 0
  let totalCostInclusion = 0
  let totalCustomers = 0

  for (const days of Object.values(summaries)) {
    for (const day of Object.values(days)) {
      totalSales += day.sales
      totalGrossSales += day.grossSales
      totalDiscount += day.discountAmount
      totalPurchaseCost += day.purchaseCost
      totalPurchasePrice += day.purchasePrice
      totalFlowersCost += day.flowersCost
      totalDirectProduceCost += day.directProduceCost
      totalCostInclusion += day.costInclusionCost
      totalCustomers += day.customers
    }
  }

  if (totalSales === 0) return null

  const inventoryCost = totalPurchaseCost - totalFlowersCost - totalDirectProduceCost
  const deliverySalesCost = totalFlowersCost + totalDirectProduceCost
  const allCost = inventoryCost + deliverySalesCost
  const allPrice = totalPurchasePrice

  const grossProfit = totalSales - allCost
  const grossProfitRate = safeDivide(grossProfit, totalSales)

  return {
    discountRate: safeDivide(totalDiscount, totalSales),
    costRate: safeDivide(allCost, totalGrossSales),
    costInclusionRate: safeDivide(totalCostInclusion, totalSales),
    averageMarkupRate: safeDivide(allPrice - totalPurchaseCost, allPrice),
    totalCustomers,
    grossProfit,
    grossProfitRate,
  }
}
