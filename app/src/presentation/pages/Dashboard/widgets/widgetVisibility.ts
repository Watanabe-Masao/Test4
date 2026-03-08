import type { WidgetContext } from './types'

/** 時系列ウィジェットの表示判定: DuckDB にデータがあれば表示 */
export function isTimeSeriesVisible(ctx: WidgetContext): boolean {
  return ctx.duckDataVersion > 0
}

/** 店舗比較ウィジェットの表示判定: DuckDB + 複数店舗 */
export function isStoreComparisonVisible(ctx: WidgetContext): boolean {
  return ctx.duckDataVersion > 0 && ctx.stores.size > 1
}

/** 前年比較ウィジェットの表示判定: DuckDB + 前年データ or StoreResult + 前年データ */
export function isYoYVisible(ctx: WidgetContext): boolean {
  const duckReady = ctx.duckDataVersion > 0 && ctx.duckConn != null
  if (duckReady && ctx.prevYearDateRange != null) return true
  return ctx.prevYear.hasPrevYear && ctx.prevYear.totalSales > 0
}
