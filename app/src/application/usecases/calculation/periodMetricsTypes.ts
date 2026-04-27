/**
 * 期間メトリクス型定義
 *
 * periodMetricsCalculator の入力・出力型を分離する。
 * 消費者（hooks, テスト）が計算関数なしに型だけ参照できる。
 *
 * @responsibility R:unclassified
 */

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
