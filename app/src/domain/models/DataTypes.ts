import type { ConsumableDailyRecord } from './ConsumableItem'

/**
 * 店舗×日別の2次元インデックス付きレコード。
 * Excelパース結果の共通パターン: storeId → day → T
 *
 * 参照系エンティティ（stores, budget, settings）は Map を使用。
 * 日別データは Record を使用（プロセッサが直接構築、bracket記法でアクセス）。
 */
export type StoreDayRecord<T> = {
  readonly [storeId: string]: {
    readonly [day: number]: T
  }
}

/** 仕入日別レコード */
export interface PurchaseDayEntry {
  readonly suppliers: {
    readonly [supplierCode: string]: {
      readonly name: string
      readonly cost: number
      readonly price: number
    }
  }
  readonly total: { readonly cost: number; readonly price: number }
}

/** 仕入パース結果: storeId → day → PurchaseDayEntry */
export type PurchaseData = StoreDayRecord<PurchaseDayEntry>

/** 売上日別レコード */
export interface SalesDayEntry {
  readonly sales: number
  readonly customers?: number
}

/** 売上パース結果: storeId → day → SalesDayEntry */
export type SalesData = StoreDayRecord<SalesDayEntry>

/** 売変日別レコード */
export interface DiscountDayEntry {
  readonly sales: number
  readonly discount: number
  readonly customers?: number
}

/** 分類別時間帯売上 時間帯レコード */
export interface TimeSlotEntry {
  readonly hour: number
  readonly quantity: number
  readonly amount: number
}

/** 分類別時間帯売上 1行レコード */
export interface CategoryTimeSalesRecord {
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

/** 売変パース結果: storeId → day → DiscountDayEntry */
export type DiscountData = StoreDayRecord<DiscountDayEntry>

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
export interface TransferDayEntry {
  readonly interStoreIn: readonly TransferRecord[]
  readonly interStoreOut: readonly TransferRecord[]
  readonly interDepartmentIn: readonly TransferRecord[]
  readonly interDepartmentOut: readonly TransferRecord[]
}

/** 店間移動パース結果: storeId → day → TransferDayEntry */
export type TransferData = StoreDayRecord<TransferDayEntry>

/** 花/産直日別レコード */
export interface SpecialSalesDayEntry {
  readonly price: number
  readonly cost: number
}

/** 花/産直パース結果: storeId → day → SpecialSalesDayEntry */
export type SpecialSalesData = StoreDayRecord<SpecialSalesDayEntry>

/** 消耗品パース結果: storeId → day → ConsumableDailyRecord */
export type ConsumableData = StoreDayRecord<ConsumableDailyRecord>

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
