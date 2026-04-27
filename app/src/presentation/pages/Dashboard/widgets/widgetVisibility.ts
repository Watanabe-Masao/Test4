/**
 * @responsibility R:unclassified
 */

import type { DashboardWidgetContext } from './DashboardWidgetContext'

/** 時系列ウィジェットの表示判定: DuckDB にデータがあれば表示 */
export function isTimeSeriesVisible(ctx: DashboardWidgetContext): boolean {
  return ctx.queryExecutor?.isReady === true
}

/** 店舗比較ウィジェットの表示判定: DuckDB + 複数店舗 */
export function isStoreComparisonVisible(ctx: DashboardWidgetContext): boolean {
  return ctx.queryExecutor?.isReady === true && ctx.stores.size > 1
}

/** 前年比較ウィジェットの表示判定: DuckDB + 前年データ or StoreResult + 前年データ */
export function isYoYVisible(ctx: DashboardWidgetContext): boolean {
  const duckReady = ctx.queryExecutor?.isReady === true
  if (duckReady && ctx.prevYearScope?.dateRange != null) return true
  return ctx.prevYear.hasPrevYear && ctx.prevYear.totalSales > 0
}
