import type { CostPricePair } from './CostPricePair'
import type { CategoryType } from './CategoryType'
import type { SupplierTotal } from './Supplier'
import type { DailyRecord } from './DailyRecord'
import type { TransferDetails } from './TransferDetail'
import type { DiscountEntry } from './ClassifiedSales'

// ────────────────────────────────────────────────────────
// StoreResult のフィールド分類
//
//   StoreConfigData     — 外部設定（在庫・予算）から取得した値
//   StoreAggregatedData — インポートデータを店舗×月で集約した値
//   StoreDerivedData    — 集約値＋設定値から一度だけ導出する事前計算値
//   StoreResult         — 三者の合成型（消費側はこれだけを参照する）
//
// 消費側は StoreResult を通じて全フィールドに一様にアクセスする。
// フィールドがどのカテゴリかを消費側は意識しない。
// キャッシュ戦略は構築側・インフラ層の責務。
// ────────────────────────────────────────────────────────

/**
 * 設定データ: 在庫設定・予算設定から取得した値
 *
 * - InventoryConfig → openingInventory, closingInventory, etc.
 * - BudgetData → budget, grossProfitBudget, budgetDaily
 */
export interface StoreConfigData {
  readonly storeId: string

  // ─── 在庫（設定値） ──────────────────────────────
  readonly openingInventory: number | null // 期首在庫
  readonly closingInventory: number | null // 期末在庫（消耗品込）
  readonly productInventory: number | null // 商品在庫
  readonly consumableInventory: number | null // 消耗品在庫
  readonly inventoryDate: string | null // 在庫基準日（YYYY/M/D）
  readonly closingInventoryDay: number | null // 期末在庫日付（何日時点か、null=月末）

  // ─── 予算（設定値） ──────────────────────────────
  readonly budget: number
  readonly grossProfitBudget: number
  readonly budgetDaily: ReadonlyMap<number, number>
}

/**
 * 集約データ: インポートデータを店舗×月で集約した値
 *
 * dailyBuilder が日ループで積み上げた合計・集計。
 * 各フィールドは対応するインポートファイルの値の単純合算。
 */
export interface StoreAggregatedData {
  // ─── 売上集約 ────────────────────────────────────
  readonly totalSales: number // 総売上高
  readonly totalCoreSales: number // コア売上
  readonly totalDiscount: number // 売変額合計
  readonly totalCustomers: number // 来店客数合計
  readonly totalConsumable: number // 消耗品費合計
  readonly discountEntries: readonly DiscountEntry[] // 売変種別内訳（月間合計）

  // ─── 日別・分類別集計 ────────────────────────────
  readonly daily: ReadonlyMap<number, DailyRecord>
  readonly categoryTotals: ReadonlyMap<CategoryType, CostPricePair>
  readonly supplierTotals: ReadonlyMap<string, SupplierTotal>
  readonly transferDetails: TransferDetails

  // ─── データ有効範囲 ──────────────────────────────
  readonly purchaseMaxDay: number // 仕入データの最終有効日（0=仕入なし）
  readonly hasDiscountData: boolean // 売変データの有無
  readonly elapsedDays: number // 経過日数
  readonly salesDays: number // 営業日数
}

/**
 * 事前計算: 集約データ＋設定データから一度だけ導出する値
 *
 * storeAssembler / CalculationOrchestrator がビルド時に計算。
 * 全て StoreConfigData + StoreAggregatedData のフィールドから一意に決定される。
 */
export interface StoreDerivedData {
  // ─── 売上系導出 ──────────────────────────────────
  readonly grossSales: number // = totalSales + totalDiscount
  readonly deliverySalesPrice: number // = flowerSalesPrice + directProduceSalesPrice
  readonly flowerSalesPrice: number // 花売価合計
  readonly directProduceSalesPrice: number // 産直売価合計

  // ─── 原価系導出 ──────────────────────────────────
  readonly totalCost: number // 総仕入原価
  readonly inventoryCost: number // 在庫仕入原価 = totalCost - deliverySalesCost
  readonly deliverySalesCost: number // 売上納品原価

  // ─── 在庫法（設定値 + 集約値から導出） ───────────
  readonly invMethodCogs: number | null // 在庫法: 売上原価
  readonly invMethodGrossProfit: number | null // 在庫法: 粗利益
  readonly invMethodGrossProfitRate: number | null // 在庫法: 粗利率

  // ─── 推定法（集約値 + レートから導出） ───────────
  readonly estMethodCogs: number // 推定法: 推定原価
  readonly estMethodMargin: number // 推定法: 推定マージン ※実粗利ではない
  readonly estMethodMarginRate: number // 推定法: 推定マージン率
  readonly estMethodClosingInventory: number | null // 推定法: 推定期末在庫

  // ─── レート系導出 ────────────────────────────────
  readonly discountRate: number // 売変率
  readonly discountLossCost: number // 売変ロス原価
  readonly averageMarkupRate: number // 平均値入率
  readonly coreMarkupRate: number // コア値入率
  readonly consumableRate: number // 消耗品率
  readonly averageCustomersPerDay: number // 日平均客数

  // ─── 予算・予測系導出 ────────────────────────────
  readonly grossProfitRateBudget: number // 粗利率予算 = grossProfitBudget / budget
  readonly averageDailySales: number // 日平均売上
  readonly projectedSales: number // 月末予測売上
  readonly projectedAchievement: number // 予算達成率予測
  readonly budgetAchievementRate: number // 予算達成率（実績/予算）
  readonly budgetProgressRate: number // 予算消化率（実績/経過予算）
  readonly budgetElapsedRate: number // 予算経過率（経過予算/月間予算）
  readonly budgetProgressGap: number // 進捗ギャップ（消化率 − 経過率）
  readonly budgetVariance: number // 予算差異（累計実績 − 累計予算）
  readonly requiredDailySales: number // 必要日次売上（残余予算 / 残日数）
  readonly remainingBudget: number // 残余予算
  readonly dailyCumulative: ReadonlyMap<number, { sales: number; budget: number }>
}

/**
 * 店舗別計算結果 = 設定データ + 集約データ + 事前計算
 *
 * 消費側（presentation / hooks）はこの型を通じて全フィールドに一様にアクセスする。
 * フィールドがどのカテゴリかを消費側は意識しない。
 */
export interface StoreResult extends StoreConfigData, StoreAggregatedData, StoreDerivedData {}
