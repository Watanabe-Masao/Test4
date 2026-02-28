/**
 * エクスポート機能のポートインターフェース
 *
 * Presentation 層が Infrastructure 層の export モジュールに直接依存しないよう、
 * エクスポート操作を抽象化する。
 */
import type { StoreResult, Store, Explanation, DataType } from '@/domain/models'

/** テンプレートが利用可能なデータ種別 */
export type TemplateDataType = Exclude<DataType, 'initialSettings' | 'departmentKpi'>

/** テンプレートが利用可能なデータ種別の一覧 */
export const TEMPLATE_TYPES: readonly TemplateDataType[] = [
  'purchase',
  'classifiedSales',
  'flowers',
  'directProduce',
  'interStoreOut',
  'interStoreIn',
  'budget',
  'categoryTimeSales',
  'consumables',
] as const

/** テンプレートのラベル（日本語表示名） */
export const TEMPLATE_LABELS: Record<TemplateDataType, string> = {
  purchase: '仕入',
  classifiedSales: '分類別売上',
  flowers: '花卉',
  directProduce: '産直',
  interStoreOut: '店間出',
  interStoreIn: '店間入',
  budget: '売上予算',
  categoryTimeSales: '時間帯売上',
  consumables: '消耗品',
}

/** エクスポートサービスのインターフェース */
export interface ExportPort {
  /** テンプレート CSV をダウンロードする */
  downloadTemplate(dataType: TemplateDataType): void

  /** 日次売上レポートをエクスポートする */
  exportDailySalesReport(
    result: StoreResult,
    store: Store | null,
    year: number,
    month: number,
  ): void

  /** 月次 PL レポートをエクスポートする */
  exportMonthlyPLReport(result: StoreResult, store: Store | null, year: number, month: number): void

  /** 店舗 KPI レポートをエクスポートする */
  exportStoreKpiReport(
    storeResults: ReadonlyMap<string, StoreResult>,
    stores: ReadonlyMap<string, Store>,
    year: number,
    month: number,
  ): void

  /** 説明レポートをエクスポートする */
  exportExplanationReport(
    explanations: ReadonlyMap<string, Explanation>,
    storeName: string,
    year: number,
    month: number,
  ): void

  /** テキストサマリーレポートをエクスポートする */
  exportTextSummaryReport(summaryText: string, storeName: string, year: number, month: number): void
}
