import type { CostPricePair } from './CostPricePair'
import type { CategoryType } from './CategoryType'
import type { SupplierTotal } from './Supplier'
import type { DailyRecord } from './DailyRecord'
import type { TransferDetails } from './TransferDetail'

/** 店舗別計算結果 */
export interface StoreResult {
  readonly storeId: string

  // ─── 在庫（実績） ──────────────────────────────────────
  readonly openingInventory: number | null // 期首在庫
  readonly closingInventory: number | null // 期末在庫（実績）

  // ─── 売上 ──────────────────────────────────────────────
  readonly totalSales: number // 総売上高（全体）
  readonly totalCoreSales: number // コア売上（花・産直・売上納品除外）
  readonly deliverySalesPrice: number // 売上納品売価
  readonly flowerSalesPrice: number // 花売価
  readonly directProduceSalesPrice: number // 産直売価
  readonly grossSales: number // 粗売上（売変前売価）

  // ─── 原価 ──────────────────────────────────────────────
  readonly totalCost: number // 総仕入原価（全体）
  readonly inventoryCost: number // 在庫仕入原価（売上納品分除外）
  readonly deliverySalesCost: number // 売上納品原価

  // ─── 【在庫法】実績粗利 ← スコープ: 全売上・全仕入 ─────
  readonly invMethodCogs: number | null // 在庫法: 売上原価
  readonly invMethodGrossProfit: number | null // 在庫法: 粗利益
  readonly invMethodGrossProfitRate: number | null // 在庫法: 粗利率（分母=総売上高）

  // ─── 【推定法】在庫推定指標 ← スコープ: 在庫販売のみ ────
  // ※ 実粗利ではない。推定期末在庫の算出基礎。
  readonly estMethodCogs: number // 推定法: 推定原価
  readonly estMethodMargin: number // 推定法: 推定マージン ※実粗利ではない
  readonly estMethodMarginRate: number // 推定法: 推定マージン率 ※実粗利率ではない
  readonly estMethodClosingInventory: number | null // 推定法: 推定期末在庫

  // ─── 売変 ──────────────────────────────────────────────
  readonly totalDiscount: number // 売変額合計
  readonly discountRate: number // 売変率（売価ベース）
  readonly discountLossCost: number // 売変ロス原価

  // ─── 値入率 ────────────────────────────────────────────
  readonly averageMarkupRate: number // 平均値入率（全体）
  readonly coreMarkupRate: number // コア値入率（在庫販売対象）

  // ─── 消耗品 ────────────────────────────────────────────
  readonly totalConsumable: number // 消耗品費合計
  readonly consumableRate: number // 消耗品率

  // ─── 予算 ──────────────────────────────────────────────
  readonly budget: number
  readonly grossProfitBudget: number
  readonly grossProfitRateBudget: number
  readonly budgetDaily: ReadonlyMap<number, number>

  // ─── 日別データ ────────────────────────────────────────
  readonly daily: ReadonlyMap<number, DailyRecord>

  // ─── 集計 ──────────────────────────────────────────────
  readonly categoryTotals: ReadonlyMap<CategoryType, CostPricePair>
  readonly supplierTotals: ReadonlyMap<string, SupplierTotal>
  readonly transferDetails: TransferDetails

  // ─── 予測・KPI ────────────────────────────────────────
  readonly elapsedDays: number // 経過日数
  readonly salesDays: number // 営業日数
  readonly averageDailySales: number // 日平均売上
  readonly projectedSales: number // 月末予測売上
  readonly projectedAchievement: number // 予算達成率予測
  readonly budgetAchievementRate: number // 予算達成率（実績/予算）
  readonly budgetProgressRate: number // 予算消化率（実績/経過予算）
  readonly remainingBudget: number // 残余予算
  readonly dailyCumulative: ReadonlyMap<number, { sales: number; budget: number }> // 日別累計
}
