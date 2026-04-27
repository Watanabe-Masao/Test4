/**
 * Temporal Metric Resolvers — metric 解釈の一元管理
 *
 * store_day_summary の row から各 metric の値を解決する。
 * metric の増減が handler 修正ではなく resolver 追加で済むようにする。
 *
 * @responsibility R:unclassified
 */

/** store_day_summary row の temporal adapter 用最小型 */
export interface StoreDaySummaryTemporalRow {
  readonly sales: number
  readonly customers: number
  readonly coreSales: number
  readonly totalQuantity: number
  readonly discountAbsolute: number
}

/** metric 値の resolver 関数型 */
export type TemporalMetricResolver = (row: StoreDaySummaryTemporalRow) => number | null

/** 利用可能な metric とその resolver */
export const TEMPORAL_METRIC_RESOLVERS: Readonly<Record<string, TemporalMetricResolver>> = {
  sales: (row) => row.sales,
  customers: (row) => row.customers,
  transactionValue: (row) => (row.customers > 0 ? row.sales / row.customers : null),
  grossProfitRate: (row) => (row.coreSales > 0 ? (row.sales - row.coreSales) / row.sales : null),
  quantity: (row) => row.totalQuantity,
  discount: (row) => row.discountAbsolute,
}

/**
 * row から全 metric の values Record を構築する。
 * DailySeriesSourceRow.values の生成を一元化する。
 */
export function resolveAllMetrics(
  row: StoreDaySummaryTemporalRow,
): Readonly<Record<string, number | null>> {
  const result: Record<string, number | null> = {}
  for (const [key, resolver] of Object.entries(TEMPORAL_METRIC_RESOLVERS)) {
    result[key] = resolver(row)
  }
  return result
}
