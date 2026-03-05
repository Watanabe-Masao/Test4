/**
 * エクスポート機能のポートインターフェース
 *
 * Presentation 層が Infrastructure 層の export モジュールに直接依存しないよう、
 * エクスポート操作を抽象化する。
 */
import type { StoreResult, Store, Explanation } from '@/domain/models'

/** エクスポートサービスのインターフェース */
export interface ExportPort {
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
