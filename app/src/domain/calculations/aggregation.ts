import { safeDivide } from './utils'
import type { StoreResult } from '../models'

/**
 * 全店集計
 *
 * 金額項目: 単純合計
 * 率項目: 売上高加重平均
 */

/**
 * 複数店舗の金額を合計する
 */
export function sumStoreValues(
  stores: readonly StoreResult[],
  getter: (s: StoreResult) => number,
): number {
  return stores.reduce((sum, s) => sum + getter(s), 0)
}

/**
 * nullable な金額を合計する（全てnullなら null）
 */
export function sumNullableValues(
  stores: readonly StoreResult[],
  getter: (s: StoreResult) => number | null,
): number | null {
  let hasValue = false
  let total = 0
  for (const s of stores) {
    const v = getter(s)
    if (v != null) {
      hasValue = true
      total += v
    }
  }
  return hasValue ? total : null
}

/**
 * 売上高加重平均を計算する
 *
 * 加重平均 = Σ(store.rate × store.sales) / Σ(store.sales)
 * 分母が0の場合は 0 を返す
 */
export function weightedAverageBySales(
  stores: readonly StoreResult[],
  rateGetter: (s: StoreResult) => number,
  salesGetter: (s: StoreResult) => number,
): number {
  let weightedSum = 0
  let totalWeight = 0

  for (const s of stores) {
    const sales = salesGetter(s)
    if (sales > 0) {
      weightedSum += rateGetter(s) * sales
      totalWeight += sales
    }
  }

  return safeDivide(weightedSum, totalWeight, 0)
}

/** 全店集計結果（StoreResultの主要フィールド） */
export interface AggregatedResult {
  // 売上
  readonly totalSales: number
  readonly totalCoreSales: number
  readonly grossSales: number
  readonly deliverySalesPrice: number
  readonly flowerSalesPrice: number
  readonly directProduceSalesPrice: number

  // 原価
  readonly totalCost: number
  readonly inventoryCost: number
  readonly deliverySalesCost: number

  // 在庫法
  readonly invMethodCogs: number | null
  readonly invMethodGrossProfit: number | null
  readonly invMethodGrossProfitRate: number | null

  // 推定法
  readonly estMethodCogs: number
  readonly estMethodMargin: number
  readonly estMethodMarginRate: number
  readonly estMethodClosingInventory: number | null

  // 売変
  readonly totalDiscount: number
  readonly discountRate: number
  readonly discountLossCost: number

  // 値入率
  readonly averageMarkupRate: number
  readonly coreMarkupRate: number

  // 消耗品
  readonly totalConsumable: number
  readonly consumableRate: number

  // 予算
  readonly budget: number
  readonly grossProfitBudget: number

  // 在庫
  readonly openingInventory: number | null
  readonly closingInventory: number | null

  // KPI
  readonly elapsedDays: number
  readonly salesDays: number
  readonly averageDailySales: number
  readonly projectedSales: number
  readonly projectedAchievement: number
}

/**
 * 全店集計を実行する
 */
export function aggregateStores(stores: readonly StoreResult[]): AggregatedResult {
  if (stores.length === 0) {
    return createEmptyAggregation()
  }

  const totalSales = sumStoreValues(stores, (s) => s.totalSales)
  const totalCoreSales = sumStoreValues(stores, (s) => s.totalCoreSales)

  const estMethodCogs = sumStoreValues(stores, (s) => s.estMethodCogs)
  const estMethodMargin = sumStoreValues(stores, (s) => s.estMethodMargin)
  const totalConsumable = sumStoreValues(stores, (s) => s.totalConsumable)
  const budget = sumStoreValues(stores, (s) => s.budget)

  return {
    totalSales,
    totalCoreSales,
    grossSales: sumStoreValues(stores, (s) => s.grossSales),
    deliverySalesPrice: sumStoreValues(stores, (s) => s.deliverySalesPrice),
    flowerSalesPrice: sumStoreValues(stores, (s) => s.flowerSalesPrice),
    directProduceSalesPrice: sumStoreValues(stores, (s) => s.directProduceSalesPrice),

    totalCost: sumStoreValues(stores, (s) => s.totalCost),
    inventoryCost: sumStoreValues(stores, (s) => s.inventoryCost),
    deliverySalesCost: sumStoreValues(stores, (s) => s.deliverySalesCost),

    invMethodCogs: sumNullableValues(stores, (s) => s.invMethodCogs),
    invMethodGrossProfit: sumNullableValues(stores, (s) => s.invMethodGrossProfit),
    invMethodGrossProfitRate: weightedAverageBySales(
      stores.filter((s) => s.invMethodGrossProfitRate != null),
      (s) => s.invMethodGrossProfitRate!,
      (s) => s.totalSales,
    ),

    estMethodCogs,
    estMethodMargin,
    estMethodMarginRate: safeDivide(estMethodMargin, totalCoreSales, 0),
    estMethodClosingInventory: sumNullableValues(stores, (s) => s.estMethodClosingInventory),

    totalDiscount: sumStoreValues(stores, (s) => s.totalDiscount),
    discountRate: weightedAverageBySales(
      stores,
      (s) => s.discountRate,
      (s) => s.totalSales,
    ),
    discountLossCost: sumStoreValues(stores, (s) => s.discountLossCost),

    averageMarkupRate: weightedAverageBySales(
      stores,
      (s) => s.averageMarkupRate,
      (s) => s.totalCost,
    ),
    coreMarkupRate: weightedAverageBySales(
      stores,
      (s) => s.coreMarkupRate,
      (s) => s.totalCoreSales,
    ),

    totalConsumable,
    consumableRate: safeDivide(totalConsumable, totalCoreSales, 0),

    budget,
    grossProfitBudget: sumStoreValues(stores, (s) => s.grossProfitBudget),

    openingInventory: sumNullableValues(stores, (s) => s.openingInventory),
    closingInventory: sumNullableValues(stores, (s) => s.closingInventory),

    elapsedDays: stores.length > 0 ? Math.max(...stores.map((s) => s.elapsedDays)) : 0,
    salesDays: stores.length > 0 ? Math.max(...stores.map((s) => s.salesDays)) : 0,
    averageDailySales: sumStoreValues(stores, (s) => s.averageDailySales),
    projectedSales: sumStoreValues(stores, (s) => s.projectedSales),
    projectedAchievement: safeDivide(
      sumStoreValues(stores, (s) => s.projectedSales),
      budget,
      0,
    ),
  }
}

function createEmptyAggregation(): AggregatedResult {
  return {
    totalSales: 0,
    totalCoreSales: 0,
    grossSales: 0,
    deliverySalesPrice: 0,
    flowerSalesPrice: 0,
    directProduceSalesPrice: 0,
    totalCost: 0,
    inventoryCost: 0,
    deliverySalesCost: 0,
    invMethodCogs: null,
    invMethodGrossProfit: null,
    invMethodGrossProfitRate: null,
    estMethodCogs: 0,
    estMethodMargin: 0,
    estMethodMarginRate: 0,
    estMethodClosingInventory: null,
    totalDiscount: 0,
    discountRate: 0,
    discountLossCost: 0,
    averageMarkupRate: 0,
    coreMarkupRate: 0,
    totalConsumable: 0,
    consumableRate: 0,
    budget: 0,
    grossProfitBudget: 0,
    openingInventory: null,
    closingInventory: null,
    elapsedDays: 0,
    salesDays: 0,
    averageDailySales: 0,
    projectedSales: 0,
    projectedAchievement: 0,
  }
}
