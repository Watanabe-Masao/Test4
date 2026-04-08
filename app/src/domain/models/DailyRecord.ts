import type { CostPricePair } from './CostPricePair'
import type { CostInclusionDailyRecord } from './CostInclusionItem'
import type { DiscountEntry } from './DiscountEntry'

/** 移動明細行（from → to のペア別集計） */
export interface TransferBreakdownEntry {
  readonly fromStoreId: string
  readonly toStoreId: string
  readonly cost: number
  readonly price: number
}

// ────────────────────────────────────────────────────────
// DailyRecord のフィールド分類
//
//   DailySourceData  — インポートファイルから直接取得した生データ
//   DailyDerivedData — ビルド時に生データから一度だけ導出する事前計算値
//   DailyRecord      — 両者の合成型（消費側はこれだけを参照する）
//
// 消費側は DailyRecord を通じて全フィールドに一様にアクセスする。
// 直接データか導出データかの区別、およびキャッシュ戦略は
// 構築側（dailyBuilder）とインフラ層の責務であり、消費側には漏洩しない。
// ────────────────────────────────────────────────────────

/**
 * 直接データ: 各インポートファイルから取得した生データ
 *
 * - 仕入Excel → purchase, supplierBreakdown
 * - 花Excel → flowers, customers
 * - 産直Excel → directProduce
 * - 移動Excel → interStoreIn/Out, interDepartmentIn/Out, transferBreakdown
 * - 分類別売上CSV → sales, discountAmount, discountEntries
 * - 原価算入費 → costInclusion
 */
export interface DailySourceData {
  readonly day: number // 1-31
  readonly sales: number // 売上高（分類別売上CSVの集約値）
  readonly purchase: CostPricePair // 仕入（原価/売価）
  readonly interStoreIn: CostPricePair // 店間入
  readonly interStoreOut: CostPricePair // 店間出
  readonly interDepartmentIn: CostPricePair // 部門間入
  readonly interDepartmentOut: CostPricePair // 部門間出
  readonly flowers: CostPricePair // 花
  readonly directProduce: CostPricePair // 産直
  readonly costInclusion: CostInclusionDailyRecord // 原価算入費
  readonly customers?: number // 来店客数（花ファイル由来）
  readonly discountAmount: number // 売変額（符号付き）
  readonly discountEntries: readonly DiscountEntry[] // 売変種別内訳
  readonly supplierBreakdown: ReadonlyMap<string, CostPricePair>
  readonly transferBreakdown: {
    readonly interStoreIn: readonly TransferBreakdownEntry[]
    readonly interStoreOut: readonly TransferBreakdownEntry[]
    readonly interDepartmentIn: readonly TransferBreakdownEntry[]
    readonly interDepartmentOut: readonly TransferBreakdownEntry[]
  }
}

/**
 * 事前計算: dailyBuilder がソースデータから導出する値
 *
 * 全て DailySourceData のフィールドから一意に決定される。
 * 計算式は getDailyTotalCost / calculateCoreSales / addCostPricePairs に集約。
 */
export interface DailyDerivedData {
  readonly coreSales: number // コア売上 = sales - flowers.price - directProduce.price
  readonly grossSales: number // 粗売上 = sales + discountAbsolute
  readonly totalCost: number // 総仕入原価 = purchase + transfers + deliverySales（各 .cost の合算）
  readonly deliverySales: CostPricePair // 売上納品 = flowers + directProduce
  readonly discountAbsolute: number // 売変絶対値 = |discountAmount|
}

/**
 * 日別レコード = 直接データ + 事前計算
 *
 * 消費側（presentation / hooks）はこの型を通じて全フィールドに一様にアクセスする。
 * フィールドが直接データか導出データかを消費側は意識しない。
 */
export interface DailyRecord extends DailySourceData, DailyDerivedData {}

/** getDailyTotalCost が必要とする最小フィールド */
type TotalCostInputs = Pick<
  DailySourceData,
  'purchase' | 'interStoreIn' | 'interStoreOut' | 'interDepartmentIn' | 'interDepartmentOut'
> & { readonly deliverySales: CostPricePair }

/**
 * 日別レコードの総仕入原価を算出する
 * = 仕入原価 + 店間入 + 店間出 + 部門間入 + 部門間出 + 売上納品原価
 *
 * CalculationOrchestrator の在庫法計算 (totalCost = inventoryCost + deliverySalesCost) と同一。
 * この関数を唯一の計算元とすることで、コスト計算の不整合を防ぐ。
 *
 * deliverySales は DailyDerivedData の導出値であるため、
 * dailyBuilder 内では flowers + directProduce を先に計算してから本関数に渡す。
 */
export function getDailyTotalCost(rec: TotalCostInputs): number {
  return (
    rec.purchase.cost +
    rec.interStoreIn.cost +
    rec.interStoreOut.cost +
    rec.interDepartmentIn.cost +
    rec.interDepartmentOut.cost +
    rec.deliverySales.cost
  )
}
