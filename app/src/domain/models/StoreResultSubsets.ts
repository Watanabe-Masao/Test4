/**
 * StoreResult のドメイン境界別サブセット型
 *
 * Phase 4: WriteModel 型分解
 *
 * StoreResult は StoreConfigData + StoreAggregatedData + StoreDerivedData の
 * 合成型として維持する（後方互換）。
 *
 * 消費者は必要最小限のサブセット型を使用することで:
 * - 依存するフィールドが明示化される
 * - 変更時の影響範囲が型で制限される
 * - テスト時のモックが軽量になる
 */
import type { StoreResult } from './StoreResult'

/**
 * 売上系フィールド — 売上分析・KPI表示で使用
 */
export type StoreSalesView = Pick<
  StoreResult,
  | 'storeId'
  | 'totalSales'
  | 'totalCoreSales'
  | 'totalCustomers'
  | 'grossSales'
  | 'averageDailySales'
  | 'averageCustomersPerDay'
  | 'transactionValue'
  | 'salesDays'
  | 'elapsedDays'
  | 'daily'
>

/**
 * 在庫系フィールド — 在庫分析・在庫法粗利計算で使用
 */
export type StoreInventoryView = Pick<
  StoreResult,
  | 'storeId'
  | 'openingInventory'
  | 'closingInventory'
  | 'productInventory'
  | 'costInclusionInventory'
  | 'inventoryDate'
  | 'closingInventoryDay'
  | 'invMethodCogs'
  | 'invMethodGrossProfit'
  | 'invMethodGrossProfitRate'
  | 'estMethodCogs'
  | 'estMethodMargin'
  | 'estMethodMarginRate'
  | 'estMethodClosingInventory'
>

/**
 * 予算系フィールド — 予算分析・達成率で使用
 */
export type StoreBudgetView = Pick<
  StoreResult,
  | 'storeId'
  | 'budget'
  | 'grossProfitBudget'
  | 'grossProfitRateBudget'
  | 'budgetDaily'
  | 'budgetAchievementRate'
  | 'budgetProgressRate'
  | 'budgetElapsedRate'
  | 'budgetProgressGap'
  | 'budgetVariance'
  | 'requiredDailySales'
  | 'remainingBudget'
  | 'dailyCumulative'
>

/**
 * 予測系フィールド — 着地見込・月末予測で使用
 */
export type StoreForecastView = Pick<
  StoreResult,
  'storeId' | 'projectedSales' | 'projectedAchievement' | 'averageDailySales'
>

/**
 * マージン系フィールド — 原価・値入率・割引率で使用
 */
export type StoreMarginView = Pick<
  StoreResult,
  | 'storeId'
  | 'totalCost'
  | 'inventoryCost'
  | 'deliverySalesCost'
  | 'deliverySalesPrice'
  | 'discountRate'
  | 'discountLossCost'
  | 'averageMarkupRate'
  | 'coreMarkupRate'
  | 'costInclusionRate'
  | 'totalDiscount'
  | 'discountEntries'
  | 'hasDiscountData'
>

/**
 * カテゴリ系フィールド — カテゴリ別分析で使用
 */
export type StoreCategoryView = Pick<
  StoreResult,
  'storeId' | 'categoryTotals' | 'supplierTotals' | 'transferDetails'
>
