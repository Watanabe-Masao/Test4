/**
 * @responsibility R:unclassified
 */

import type { CostInclusionDailyRecord } from './CostInclusionItem'

// ─── 共通の日付ヘッダー ──────────────────────────────────
// 全データ型が年/月/日を自身で持つ。外部のパーティションキーに依存しない。

/** 年/月/日を持つレコードの共通フィールド */
export interface DatedRecord {
  readonly year: number
  readonly month: number
  readonly day: number
  readonly storeId: string
}

// ─── StoreDayIndex（計算パイプライン用ルックアップ） ──────────

/**
 * flat array からの O(1) ルックアップ用インデックス。
 * 計算パイプライン（dailyBuilder 等）で構築し、storeId → day → T のアクセスを維持する。
 * データの保持・永続化には使わず、計算時のみ使用する。
 */
export type StoreDayIndex<T> = {
  readonly [storeId: string]: {
    readonly [day: number]: T
  }
}

/**
 * flat record 配列から StoreDayIndex を構築する。
 * 同一 storeId+day のレコードは後勝ちでマージされる。
 */
export function indexByStoreDay<T extends DatedRecord>(records: readonly T[]): StoreDayIndex<T> {
  const index: Record<string, Record<number, T>> = {}
  for (const r of records) {
    if (!index[r.storeId]) index[r.storeId] = {}
    index[r.storeId][r.day] = r
  }
  return index
}

// ─── 仕入 ──────────────────────────────────────────────

/** 仕入日別レコード */
export interface PurchaseDayEntry extends DatedRecord {
  readonly suppliers: {
    readonly [supplierCode: string]: {
      readonly name: string
      readonly cost: number
      readonly price: number
    }
  }
  readonly total: { readonly cost: number; readonly price: number }
}

/** 仕入パース結果 */
export interface PurchaseData {
  readonly records: readonly PurchaseDayEntry[]
}

// ─── 売上・売変 ────────────────────────────────────────

/** 売上日別レコード */
export interface SalesDayEntry {
  readonly sales: number
  readonly customers?: number
}

/** 売変日別レコード */
export interface DiscountDayEntry {
  readonly sales: number
  readonly discount: number
  readonly customers?: number
}

// ─── 分類別時間帯売上 ──────────────────────────────────

/** 分類別時間帯売上 時間帯レコード */
export interface TimeSlotEntry {
  readonly hour: number
  readonly quantity: number
  readonly amount: number
}

/** 分類別時間帯売上 1行レコード */
export interface CategoryTimeSalesRecord {
  /** 対象年 */
  readonly year: number
  /** 対象月 1-12 */
  readonly month: number
  readonly day: number
  readonly storeId: string
  readonly department: { readonly code: string; readonly name: string }
  readonly line: { readonly code: string; readonly name: string }
  readonly klass: { readonly code: string; readonly name: string }
  readonly timeSlots: readonly TimeSlotEntry[]
  readonly totalQuantity: number
  readonly totalAmount: number
}

/** 分類別時間帯売上パース結果 */
export interface CategoryTimeSalesData {
  readonly records: readonly CategoryTimeSalesRecord[]
}

/** CategoryTimeSalesRecord の一意キーを生成する */
export function categoryTimeSalesRecordKey(rec: CategoryTimeSalesRecord): string {
  return `${rec.year}\t${rec.month}\t${rec.day}\t${rec.storeId}\t${rec.department.code}\t${rec.line.code}\t${rec.klass.code}`
}

/**
 * 2つの CategoryTimeSalesData をマージする。
 * 同一キー（日・店舗・部門・ライン・クラス）のレコードは後者（incoming）で上書き。
 */
export function mergeCategoryTimeSalesData(
  existing: CategoryTimeSalesData,
  incoming: CategoryTimeSalesData,
): CategoryTimeSalesData {
  const map = new Map<string, CategoryTimeSalesRecord>()
  for (const rec of existing.records) {
    map.set(categoryTimeSalesRecordKey(rec), rec)
  }
  for (const rec of incoming.records) {
    map.set(categoryTimeSalesRecordKey(rec), rec)
  }
  return { records: [...map.values()] }
}

// ─── 移動 ──────────────────────────────────────────────

/** 移動レコード */
export interface TransferRecord {
  readonly day: number
  readonly cost: number
  readonly price: number
  readonly fromStoreId: string
  readonly toStoreId: string
  readonly isDepartmentTransfer: boolean
}

/** 移動日別レコード */
export interface TransferDayEntry extends DatedRecord {
  readonly interStoreIn: readonly TransferRecord[]
  readonly interStoreOut: readonly TransferRecord[]
  readonly interDepartmentIn: readonly TransferRecord[]
  readonly interDepartmentOut: readonly TransferRecord[]
}

/** 店間移動パース結果 */
export interface TransferData {
  readonly records: readonly TransferDayEntry[]
}

// ─── 花・産直 ──────────────────────────────────────────

/** 花/産直日別レコード */
export interface SpecialSalesDayEntry extends DatedRecord {
  readonly price: number
  readonly cost: number
  /** 来店客数（花ファイルのみ） */
  readonly customers?: number
}

/** 花/産直パース結果 */
export interface SpecialSalesData {
  readonly records: readonly SpecialSalesDayEntry[]
}

/** SpecialSalesDayEntry の一意キーを生成する（storeId × year × month × day） */
export function specialSalesRecordKey(rec: SpecialSalesDayEntry): string {
  return `${rec.year}\t${rec.month}\t${rec.day}\t${rec.storeId}`
}

/**
 * 2つの SpecialSalesData をマージする。
 * 同一キー（storeId × year × month × day）のレコードは後者（incoming）で上書き。
 * 重複レコードの客数二重計上を防止する。
 */
export function mergeSpecialSalesData(
  existing: SpecialSalesData,
  incoming: SpecialSalesData,
): SpecialSalesData {
  const map = new Map<string, SpecialSalesDayEntry>()
  for (const rec of existing.records) {
    map.set(specialSalesRecordKey(rec), rec)
  }
  for (const rec of incoming.records) {
    map.set(specialSalesRecordKey(rec), rec)
  }
  return { records: [...map.values()] }
}

// ─── 消耗品 ──────────────────────────────────────────

/** 消耗品日別レコード */
export interface CostInclusionRecord extends DatedRecord, CostInclusionDailyRecord {}

/** 消耗品パース結果 */
export interface CostInclusionData {
  readonly records: readonly CostInclusionRecord[]
}

// ─── 部門別KPI ──────────────────────────────────────────

/** 部門別KPIレコード */
export interface DepartmentKpiRecord {
  readonly deptCode: string
  readonly deptName: string
  readonly gpRateBudget: number // 粗利率予算
  readonly gpRateActual: number // 粗利率実績
  readonly gpRateVariance: number // 予算差異 (pt)
  readonly markupRate: number // 値入率
  readonly discountRate: number // 売変率
  readonly salesBudget: number // 売上予算
  readonly salesActual: number // 売上実績
  readonly salesVariance: number // 差異
  readonly salesAchievement: number // 達成率
  readonly openingInventory: number // 機首在庫
  readonly closingInventory: number // 期末在庫
  readonly gpRateLanding: number // 最終粗利着地
  readonly salesLanding: number // 最終売上着地
}

/** 部門別KPIパース結果 */
export interface DepartmentKpiData {
  readonly records: readonly DepartmentKpiRecord[]
}
