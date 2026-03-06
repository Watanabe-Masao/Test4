/**
 * 期間メトリクス計算モジュール
 *
 * store_day_summary の生データ（SQL取得）から
 * JS ドメイン計算関数で指標を算出する。
 *
 * 役割分担:
 *   SQL: store_day_summary からの生データ取得（DuckDB の強み: JOIN, 集約, 期間フィルタ）
 *   JS:  ビジネスロジック計算（JS の強み: 型安全, テスト容易, 動的利用）
 *
 * storePeriodMetrics.ts（SQL CTE で計算ロジックを再実装していたもの）を廃止し、
 * 二重実装を解消する。計算ロジックの権威は domain/calculations/* に一本化される。
 */
import { calculateEstMethod, calculateDiscountRate } from '@/domain/calculations/estMethod'
import { calculateInvMethod } from '@/domain/calculations/invMethod'
import { calculateDiscountImpact } from '@/domain/calculations/discountImpact'
import { safeDivide } from '@/domain/calculations/utils'

// ── 入力型 ──

/**
 * 日別サマリー行（store_day_summary VIEW の1行に対応）
 *
 * Infrastructure 層の DaySummaryInput と同一構造だが、
 * Application 層が Infrastructure 型に依存しないよう独立定義する。
 * フック側で queryStoreDaySummary() の結果をそのまま渡せる。
 */
export interface DaySummaryInput {
  readonly storeId: string
  readonly dateKey: string
  readonly day: number
  readonly sales: number
  readonly coreSales: number
  readonly grossSales: number
  readonly discountAbsolute: number
  readonly purchaseCost: number
  readonly purchasePrice: number
  readonly interStoreInCost: number
  readonly interStoreInPrice: number
  readonly interStoreOutCost: number
  readonly interStoreOutPrice: number
  readonly interDeptInCost: number
  readonly interDeptInPrice: number
  readonly interDeptOutCost: number
  readonly interDeptOutPrice: number
  readonly flowersCost: number
  readonly flowersPrice: number
  readonly directProduceCost: number
  readonly directProducePrice: number
  readonly costInclusionCost: number
  readonly customers: number
}

// ── 結果型 ──

/** 期間メトリクス（店舗×任意期間の計算結果） */
export interface PeriodMetrics {
  readonly storeId: string

  // ── 売上 ──
  readonly totalSales: number
  readonly totalCoreSales: number
  readonly grossSales: number
  readonly deliverySalesPrice: number
  readonly deliverySalesCost: number
  readonly totalFlowersPrice: number
  readonly totalFlowersCost: number
  readonly totalDirectProducePrice: number
  readonly totalDirectProduceCost: number

  // ── 原価 ──
  readonly totalCost: number
  readonly inventoryCost: number
  readonly totalPurchaseCost: number
  readonly totalPurchasePrice: number

  // ── 移動 ──
  readonly interStoreInCost: number
  readonly interStoreInPrice: number
  readonly interStoreOutCost: number
  readonly interStoreOutPrice: number
  readonly interDeptInCost: number
  readonly interDeptInPrice: number
  readonly interDeptOutCost: number
  readonly interDeptOutPrice: number
  readonly totalTransferCost: number
  readonly totalTransferPrice: number

  // ── 売変 ──
  readonly totalDiscount: number
  readonly discountRate: number
  readonly discountLossCost: number

  // ── 値入率 ──
  readonly averageMarkupRate: number
  readonly coreMarkupRate: number

  // ── 消耗品 ──
  readonly totalCostInclusion: number
  readonly costInclusionRate: number

  // ── 客数 ──
  readonly totalCustomers: number
  readonly averageCustomersPerDay: number

  // ── 在庫法 ──
  readonly openingInventory: number | null
  readonly closingInventory: number | null
  readonly invMethodCogs: number | null
  readonly invMethodGrossProfit: number | null
  readonly invMethodGrossProfitRate: number | null

  // ── 推定法 ──
  readonly estMethodCogs: number
  readonly estMethodMargin: number
  readonly estMethodMarginRate: number
  readonly estMethodClosingInventory: number | null

  // ── 予算 ──
  readonly grossProfitBudget: number

  // ── 期間情報 ──
  readonly salesDays: number
  readonly totalDays: number
  readonly purchaseMaxDay: number
  readonly hasDiscountData: boolean
}

/** 在庫設定（inventory_config テーブルから取得） */
export interface PeriodInventoryConfig {
  readonly openingInventory: number | null
  readonly closingInventory: number | null
  readonly grossProfitBudget: number
}

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
  const totalTransferCost =
    agg.interStoreInCost + agg.interStoreOutCost + agg.interDeptInCost + agg.interDeptOutCost
  const totalTransferPrice =
    agg.interStoreInPrice + agg.interStoreOutPrice + agg.interDeptInPrice + agg.interDeptOutPrice

  // ── 総仕入原価（getDailyTotalCost と同一構成: 消耗品除く）──
  const totalCost = agg.totalPurchaseCost + deliverySalesCost + totalTransferCost

  // ── 在庫仕入原価（売上納品除外）──
  const inventoryCost = agg.totalPurchaseCost + totalTransferCost

  // ── 売変率 ──
  const discountRate = calculateDiscountRate(agg.totalSales, agg.totalDiscount)

  // ── 値入率 ──
  const allPurchasePrice = agg.totalPurchasePrice + deliverySalesPrice + totalTransferPrice
  const allPurchaseCost = agg.totalPurchaseCost + deliverySalesCost + totalTransferCost
  const averageMarkupRate = safeDivide(allPurchasePrice - allPurchaseCost, allPurchasePrice, 0)

  const corePurchasePrice = agg.totalPurchasePrice + totalTransferPrice
  const corePurchaseCost = agg.totalPurchaseCost + totalTransferCost
  const coreMarkupRate = safeDivide(
    corePurchasePrice - corePurchaseCost,
    corePurchasePrice,
    defaultMarkupRate,
  )

  // ── 在庫法 ──
  const invResult = calculateInvMethod({
    openingInventory: invConfig?.openingInventory ?? null,
    closingInventory: invConfig?.closingInventory ?? null,
    totalPurchaseCost: totalCost,
    totalSales: agg.totalSales,
  })

  // ── 推定法 ──
  const estResult = calculateEstMethod({
    coreSales: agg.totalCoreSales,
    discountRate,
    markupRate: coreMarkupRate,
    costInclusionCost: agg.totalCostInclusion,
    openingInventory: invConfig?.openingInventory ?? null,
    inventoryPurchaseCost: inventoryCost,
  })

  // ── 売変ロス原価 ──
  const { discountLossCost } = calculateDiscountImpact({
    coreSales: agg.totalCoreSales,
    markupRate: coreMarkupRate,
    discountRate,
  })

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
