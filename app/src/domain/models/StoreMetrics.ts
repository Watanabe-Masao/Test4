/**
 * StoreMetrics — DuckDB SQL 計算結果のドメイン型
 *
 * StoreResult の代替として、DuckDB SQL CTE で算出された
 * 店舗別期間メトリクスを表す。
 *
 * StoreResult との主な違い:
 * - 日別データ（daily Map）を含まない（別クエリで取得）
 * - カテゴリ別集計（categoryTotals）を含まない（別クエリで取得）
 * - 仕入先別集計（supplierTotals）を含まない
 * - 売変種別内訳（discountEntries）を含まない（別クエリで取得）
 * - 予算・予測の派生指標はフック側で算出
 *
 * 任意の DateRange に対して計算可能（月跨ぎ・年跨ぎ対応）。
 */
export interface StoreMetrics {
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
  readonly totalConsumable: number
  readonly consumableRate: number

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
