/**
 * 複数店舗の StoreResult を合算するファサード
 *
 * スカラー合算は scalarAccumulator.ts、コレクション集約は collectionAggregator.ts に委譲。
 */
import type { StoreResult } from '@/domain/models/storeTypes'
import { getEffectiveGrossProfit } from '@/domain/calculations/utils'
import {
  evaluateObservationPeriod,
  worseObservationStatus,
} from '@/domain/calculations/observationPeriod'
import type { ObservationStatus } from '@/domain/models/ObservationPeriod'
import { calculateDiscountRate } from '@/application/services/grossProfitBridge'
import {
  safeDivide,
  calculateTransactionValue,
  calculateGrossProfitRate,
} from '@/domain/calculations/utils'
// bridge 経由: 将来の dual-run compare を観測可能にする
import { calculateGrossProfitBudget } from '@/application/services/budgetAnalysisBridge'
import { accumulateScalars } from './scalarAccumulator'
import {
  aggregateCollections,
  calculateMarkupRates,
  calculateAggregateInventory,
  calculateAggregateEstMethod,
  calculateAggregateBudget,
  buildTransferDetails,
} from './collectionAggregator'

/**
 * 複数店舗の StoreResult を合算する
 */
export function aggregateStoreResults(
  results: readonly StoreResult[],
  daysInMonth: number,
): StoreResult {
  if (results.length === 0) {
    throw new Error('Cannot aggregate 0 results')
  }

  const scalars = accumulateScalars(results)
  const { aggDaily, aggCategory, aggSupplier, aggBudgetDaily, aggTransfer } =
    aggregateCollections(results)

  const discountRate = calculateDiscountRate(scalars.totalSales, scalars.totalDiscount)
  const { averageMarkupRate, coreMarkupRate } = calculateMarkupRates(
    aggSupplier,
    aggCategory,
    aggTransfer,
  )

  const costInclusionRate = safeDivide(scalars.totalCostInclusion, scalars.totalSales, 0)
  const averageDailySales = safeDivide(scalars.totalSales, scalars.salesDays, 0)

  const openingInventory = scalars.hasOpening ? scalars.openInv : null
  const closingInventory = scalars.hasClosing ? scalars.closeInv : null

  const inv = calculateAggregateInventory(
    openingInventory,
    closingInventory,
    scalars.totalCost,
    scalars.totalSales,
  )
  const est = calculateAggregateEstMethod(results, scalars.totalCoreSales)

  const discountLossCost = results.reduce((s, r) => s + r.discountLossCost, 0)

  const budgetAnalysis = calculateAggregateBudget(
    scalars.totalSales,
    scalars.budget,
    averageDailySales,
    scalars.elapsedDays,
    daysInMonth,
    aggBudgetDaily,
    aggDaily,
  )

  const transferDetails = buildTransferDetails(aggTransfer)

  // 観測期間の評価（集約済み日別データから導出）
  const observationPeriod = evaluateObservationPeriod(aggDaily, daysInMonth, scalars.elapsedDays)

  // 個別店舗の最悪ステータスが集約後より悪い場合、マスキング警告を追加
  const worstStoreStatus = results.reduce<ObservationStatus>(
    (worst, r) => worseObservationStatus(worst, r.observationPeriod.status),
    'ok',
  )
  const maskedObservationPeriod =
    worstStoreStatus !== observationPeriod.status && worstStoreStatus !== 'ok' && results.length > 1
      ? {
          ...observationPeriod,
          warnings: [...observationPeriod.warnings, 'obs_store_quality_masked'],
        }
      : observationPeriod

  return {
    storeId: 'aggregate',
    openingInventory,
    closingInventory,
    productInventory: null,
    costInclusionInventory: null,
    inventoryDate: null,
    closingInventoryDay: null,
    purchaseMaxDay: scalars.purchaseMaxDay,
    hasDiscountData: scalars.hasDiscountData,
    totalSales: scalars.totalSales,
    totalCoreSales: scalars.totalCoreSales,
    deliverySalesPrice: scalars.deliverySalesPrice,
    flowerSalesPrice: scalars.flowerSalesPrice,
    directProduceSalesPrice: scalars.directProduceSalesPrice,
    grossSales: scalars.grossSales,
    totalCost: scalars.totalCost,
    inventoryCost: scalars.inventoryCost,
    deliverySalesCost: scalars.deliverySalesCost,
    invMethodCogs: inv.invMethodCogs,
    invMethodGrossProfit: inv.invMethodGrossProfit,
    invMethodGrossProfitRate: inv.invMethodGrossProfitRate,
    estMethodCogs: est.estMethodCogs,
    estMethodMargin: est.estMethodMargin,
    estMethodMarginRate: est.estMethodMarginRate,
    estMethodClosingInventory: est.estMethodClosingInventory,
    totalCustomers: scalars.totalCustomers,
    transactionValue: calculateTransactionValue(scalars.totalSales, scalars.totalCustomers),
    averageCustomersPerDay: safeDivide(scalars.totalCustomers, scalars.salesDays, 0),
    totalDiscount: scalars.totalDiscount,
    discountRate,
    discountLossCost,
    discountEntries: scalars.aggDiscountEntries,
    averageMarkupRate,
    coreMarkupRate,
    totalCostInclusion: scalars.totalCostInclusion,
    costInclusionRate,
    budget: scalars.budget,
    grossProfitBudget: scalars.gpBudget,
    grossProfitRateBudget: calculateGrossProfitRate(scalars.gpBudget, scalars.budget),
    budgetDaily: aggBudgetDaily,
    daily: aggDaily,
    categoryTotals: aggCategory,
    supplierTotals: aggSupplier,
    transferDetails,
    elapsedDays: scalars.elapsedDays,
    salesDays: scalars.salesDays,
    averageDailySales,
    ...budgetAnalysis,
    ...calculateGrossProfitBudget({
      grossProfit: getEffectiveGrossProfit({
        invMethodGrossProfit: inv.invMethodGrossProfit,
        estMethodMargin: est.estMethodMargin,
      }),
      grossProfitBudget: scalars.gpBudget,
      budgetElapsedRate: budgetAnalysis.budgetElapsedRate,
      elapsedDays: scalars.elapsedDays,
      salesDays: scalars.salesDays,
      daysInMonth,
    }),
    observationPeriod: maskedObservationPeriod,
    metricWarnings:
      maskedObservationPeriod.warnings.length > 0
        ? new Map([['observationPeriod', maskedObservationPeriod.warnings]])
        : new Map(),
  }
}
