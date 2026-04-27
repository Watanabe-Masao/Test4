/**
 * 期間メトリクス計算: store_day_summary の生データから domain/calculations/ の純粋関数で指標を算出
 *
 * @responsibility R:unclassified
 */
import {
  calculateEstMethodWithStatus,
  calculateDiscountRate,
  calculateInvMethod,
  calculateDiscountImpact,
  calculateMarkupRates,
  calculateTransferTotals,
  calculateInventoryCost,
} from '@/application/services/grossProfitBridge'
import { safeDivide } from '@/domain/calculations/utils'
import type { DaySummaryInput, PeriodMetrics, PeriodInventoryConfig } from './periodMetricsTypes'

// ── 型の re-export（後方互換） ──
export type { DaySummaryInput, PeriodMetrics, PeriodInventoryConfig } from './periodMetricsTypes'

// ── 内部型 ──

/** 店舗別の集約中間データ（内部用） */
interface StoreAggregation {
  totalSales: number
  totalCoreSales: number
  grossSales: number
  totalDiscount: number
  totalPurchaseCost: number
  totalPurchasePrice: number
  totalFlowersCost: number
  totalFlowersPrice: number
  totalDirectProduceCost: number
  totalDirectProducePrice: number
  interStoreInCost: number
  interStoreInPrice: number
  interStoreOutCost: number
  interStoreOutPrice: number
  interDeptInCost: number
  interDeptInPrice: number
  interDeptOutCost: number
  interDeptOutPrice: number
  totalCostInclusion: number
  totalCustomers: number
  purchaseMaxDay: number
  hasDiscountData: boolean
  /** 全日付のセット（totalDays 算出用） */
  dateKeys: Set<string>
  /** 売上ありの日付セット（salesDays 算出用） */
  salesDateKeys: Set<string>
}

function createZeroAggregation(): StoreAggregation {
  return {
    totalSales: 0,
    totalCoreSales: 0,
    grossSales: 0,
    totalDiscount: 0,
    totalPurchaseCost: 0,
    totalPurchasePrice: 0,
    totalFlowersCost: 0,
    totalFlowersPrice: 0,
    totalDirectProduceCost: 0,
    totalDirectProducePrice: 0,
    interStoreInCost: 0,
    interStoreInPrice: 0,
    interStoreOutCost: 0,
    interStoreOutPrice: 0,
    interDeptInCost: 0,
    interDeptInPrice: 0,
    interDeptOutCost: 0,
    interDeptOutPrice: 0,
    totalCostInclusion: 0,
    totalCustomers: 0,
    purchaseMaxDay: 0,
    hasDiscountData: false,
    dateKeys: new Set(),
    salesDateKeys: new Set(),
  }
}

// ── 集約関数 ──

/**
 * DaySummaryInput[] を店舗別に集約する
 *
 * SQL の GROUP BY s.store_id に相当する操作を JS で行う。
 * SQL は生データの取得に専念し、集約計算は JS 側で実行する。
 */
export function aggregateSummaryRows(
  rows: readonly DaySummaryInput[],
): ReadonlyMap<string, StoreAggregation> {
  const map = new Map<string, StoreAggregation>()

  for (const row of rows) {
    let agg = map.get(row.storeId)
    if (!agg) {
      agg = createZeroAggregation()
      map.set(row.storeId, agg)
    }

    agg.totalSales += row.sales
    agg.totalCoreSales += row.coreSales
    agg.grossSales += row.grossSales
    agg.totalDiscount += row.discountAbsolute
    agg.totalPurchaseCost += row.purchaseCost
    agg.totalPurchasePrice += row.purchasePrice
    agg.totalFlowersCost += row.flowersCost
    agg.totalFlowersPrice += row.flowersPrice
    agg.totalDirectProduceCost += row.directProduceCost
    agg.totalDirectProducePrice += row.directProducePrice
    agg.interStoreInCost += row.interStoreInCost
    agg.interStoreInPrice += row.interStoreInPrice
    agg.interStoreOutCost += row.interStoreOutCost
    agg.interStoreOutPrice += row.interStoreOutPrice
    agg.interDeptInCost += row.interDeptInCost
    agg.interDeptInPrice += row.interDeptInPrice
    agg.interDeptOutCost += row.interDeptOutCost
    agg.interDeptOutPrice += row.interDeptOutPrice
    agg.totalCostInclusion += row.costInclusionCost
    agg.totalCustomers += row.customers

    agg.dateKeys.add(row.dateKey)
    if (row.sales > 0) agg.salesDateKeys.add(row.dateKey)
    if (row.purchaseCost > 0 && row.day > agg.purchaseMaxDay) {
      agg.purchaseMaxDay = row.day
    }
    if (row.discountAbsolute > 0) agg.hasDiscountData = true
  }

  return map
}

// ── 計算関数 ──

/**
 * 集約データに対してドメイン計算関数を適用し PeriodMetrics を生成する
 *
 * 計算ロジックは domain/calculations/* の関数を呼ぶだけ。
 * assembleStoreResult / crossValidation.test.ts の computeJsMetrics と同一の計算パス。
 */
function calculatePeriodMetrics(
  storeId: string,
  agg: StoreAggregation,
  invConfig: PeriodInventoryConfig | undefined,
  defaultMarkupRate: number,
): PeriodMetrics {
  // ── 売上納品 ──
  const deliverySalesPrice = agg.totalFlowersPrice + agg.totalDirectProducePrice
  const deliverySalesCost = agg.totalFlowersCost + agg.totalDirectProduceCost

  // ── 移動合計 ──
  const { transferPrice: totalTransferPrice, transferCost: totalTransferCost } =
    calculateTransferTotals({
      interStoreInPrice: agg.interStoreInPrice,
      interStoreInCost: agg.interStoreInCost,
      interStoreOutPrice: agg.interStoreOutPrice,
      interStoreOutCost: agg.interStoreOutCost,
      interDepartmentInPrice: agg.interDeptInPrice,
      interDepartmentInCost: agg.interDeptInCost,
      interDepartmentOutPrice: agg.interDeptOutPrice,
      interDepartmentOutCost: agg.interDeptOutCost,
    })

  // ── 総仕入原価（getDailyTotalCost と同一構成: 消耗品除く）──
  const totalCost = agg.totalPurchaseCost + deliverySalesCost + totalTransferCost

  // ── 在庫仕入原価（売上納品除外）──
  const inventoryCost = calculateInventoryCost(totalCost, deliverySalesCost)

  // ── 売変率 ──
  const discountRate = calculateDiscountRate(agg.totalSales, agg.totalDiscount)

  // ── 値入率 ──
  const { averageMarkupRate, coreMarkupRate } = calculateMarkupRates({
    purchasePrice: agg.totalPurchasePrice,
    purchaseCost: agg.totalPurchaseCost,
    deliveryPrice: deliverySalesPrice,
    deliveryCost: deliverySalesCost,
    transferPrice: totalTransferPrice,
    transferCost: totalTransferCost,
    defaultMarkupRate,
  })

  // ── 在庫法 ──
  const invResult = calculateInvMethod({
    openingInventory: invConfig?.openingInventory ?? null,
    closingInventory: invConfig?.closingInventory ?? null,
    totalPurchaseCost: totalCost,
    totalSales: agg.totalSales,
  })

  // ── 推定法 ──
  const estResultWithStatus = calculateEstMethodWithStatus({
    coreSales: agg.totalCoreSales,
    discountRate,
    markupRate: coreMarkupRate,
    costInclusionCost: agg.totalCostInclusion,
    openingInventory: invConfig?.openingInventory ?? null,
    inventoryPurchaseCost: inventoryCost,
  })
  const estResult = estResultWithStatus.value ?? {
    grossSales: 0,
    cogs: 0,
    margin: 0,
    marginRate: 0,
    closingInventory: null,
  }

  // ── 売変ロス原価 ──
  const { discountLossCost } = calculateDiscountImpact({
    coreSales: agg.totalCoreSales,
    markupRate: coreMarkupRate,
    discountRate,
  }).value ?? { discountLossCost: 0 }

  const salesDays = agg.salesDateKeys.size
  const totalDays = agg.dateKeys.size

  return {
    storeId,
    // 売上
    totalSales: agg.totalSales,
    totalCoreSales: agg.totalCoreSales,
    grossSales: agg.grossSales,
    deliverySalesPrice,
    deliverySalesCost,
    totalFlowersPrice: agg.totalFlowersPrice,
    totalFlowersCost: agg.totalFlowersCost,
    totalDirectProducePrice: agg.totalDirectProducePrice,
    totalDirectProduceCost: agg.totalDirectProduceCost,
    // 原価
    totalCost,
    inventoryCost,
    totalPurchaseCost: agg.totalPurchaseCost,
    totalPurchasePrice: agg.totalPurchasePrice,
    // 移動
    interStoreInCost: agg.interStoreInCost,
    interStoreInPrice: agg.interStoreInPrice,
    interStoreOutCost: agg.interStoreOutCost,
    interStoreOutPrice: agg.interStoreOutPrice,
    interDeptInCost: agg.interDeptInCost,
    interDeptInPrice: agg.interDeptInPrice,
    interDeptOutCost: agg.interDeptOutCost,
    interDeptOutPrice: agg.interDeptOutPrice,
    totalTransferCost,
    totalTransferPrice,
    // 売変
    totalDiscount: agg.totalDiscount,
    discountRate,
    discountLossCost,
    // 値入率
    averageMarkupRate,
    coreMarkupRate,
    // 消耗品
    totalCostInclusion: agg.totalCostInclusion,
    costInclusionRate: safeDivide(agg.totalCostInclusion, agg.totalSales, 0),
    // 客数
    totalCustomers: agg.totalCustomers,
    averageCustomersPerDay: safeDivide(agg.totalCustomers, salesDays, 0),
    // 在庫法
    openingInventory: invConfig?.openingInventory ?? null,
    closingInventory: invConfig?.closingInventory ?? null,
    invMethodCogs: invResult.cogs,
    invMethodGrossProfit: invResult.grossProfit,
    invMethodGrossProfitRate: invResult.grossProfitRate,
    // 推定法
    estMethodCogs: estResult.cogs,
    estMethodMargin: estResult.margin,
    estMethodMarginRate: estResult.marginRate,
    estMethodClosingInventory: estResult.closingInventory,
    // 予算
    grossProfitBudget: invConfig?.grossProfitBudget ?? 0,
    // 期間情報
    salesDays,
    totalDays,
    purchaseMaxDay: agg.purchaseMaxDay,
    hasDiscountData: agg.hasDiscountData,
  }
}

// ── 公開 API ──

/**
 * 全店舗の期間メトリクスを一括計算する
 *
 * SQL で取得した生データ → JS で集約・計算 → PeriodMetrics[]
 *
 * @param rows     - queryStoreDaySummary() の結果（任意日付範囲）
 * @param invConfigs - 店舗別在庫設定（inventory_config テーブルから取得）
 * @param defaultMarkupRate - デフォルト値入率（仕入なし店舗のフォールバック）
 */
export function calculateAllPeriodMetrics(
  rows: readonly DaySummaryInput[],
  invConfigs: ReadonlyMap<string, PeriodInventoryConfig>,
  defaultMarkupRate: number,
): readonly PeriodMetrics[] {
  const aggregations = aggregateSummaryRows(rows)
  const results: PeriodMetrics[] = []

  for (const [storeId, agg] of aggregations) {
    results.push(calculatePeriodMetrics(storeId, agg, invConfigs.get(storeId), defaultMarkupRate))
  }

  return results.sort((a, b) => a.storeId.localeCompare(b.storeId))
}
