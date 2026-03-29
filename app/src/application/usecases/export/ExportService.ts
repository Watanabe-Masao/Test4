/**
 * エクスポートサービス — ExportPort の具体実装
 *
 * Infrastructure 層の export モジュールをラップし、
 * Application 層のファサードとして公開する。
 * Presentation 層はこのサービスを経由してエクスポート機能を利用する。
 */
import {
  exportDailySalesReport as infraExportDailySales,
  exportMonthlyPLReport as infraExportMonthlyPL,
  exportStoreKpiReport as infraExportStoreKpi,
  exportExplanationReport as infraExportExplanation,
  exportTextSummaryReport as infraExportTextSummary,
} from '@/infrastructure/export'
import type { ExportPort } from '@/domain/ports/ExportPort'

/** ExportPort の実装インスタンス */
export const exportService: ExportPort = {
  exportDailySalesReport(result, store, year, month) {
    infraExportDailySales(result, store, year, month)
  },

  exportMonthlyPLReport(result, store, year, month) {
    infraExportMonthlyPL(result, store, year, month)
  },

  exportStoreKpiReport(storeResults, stores, year, month) {
    infraExportStoreKpi(storeResults, stores, year, month)
  },

  exportExplanationReport(explanations, storeName, year, month) {
    infraExportExplanation(explanations, storeName, year, month)
  },

  exportTextSummaryReport(summaryText, storeName, year, month) {
    infraExportTextSummary(summaryText, storeName, year, month)
  },
}
