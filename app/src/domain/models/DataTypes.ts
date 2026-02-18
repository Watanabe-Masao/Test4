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
}

/** 売上パース結果: storeId → day → SalesDayEntry */
export type SalesData = StoreDayRecord<SalesDayEntry>

/** 売変日別レコード */
export interface DiscountDayEntry {
  readonly sales: number
  readonly discount: number
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
