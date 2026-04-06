/**
 * CumulativeChart — 純粋ロジック層
 *
 * DuckDB の DailyCumulativeRow[] を受け取り、チャート描画用データに変換する。
 * React 非依存。副作用なし。
 *
 * @guard G5 hook ≤300行 — 純粋関数を分離
 * @responsibility R:calculation
 */
import type { DailyCumulativeRow } from '@/application/hooks/duckdb'

// ─── Types ──────────────────────────────────────────

export interface CumulativeChartDataPoint {
  readonly date: string
  readonly daily: number
  readonly cumulative: number
}

export interface CumulativeSummary {
  readonly totalSales: number
  readonly avgDaily: number
  readonly dayCount: number
}

// ─── Logic ──────────────────────────────────────────

/** DailyCumulativeRow[] → チャート描画データ */
export function buildCumulativeChartData(
  rows: readonly DailyCumulativeRow[],
): CumulativeChartDataPoint[] {
  return rows.map((r) => ({
    date: r.dateKey.slice(5), // MM-DD
    daily: Math.round(r.dailySales),
    cumulative: Math.round(r.cumulativeSales),
  }))
}

/** サマリー集計 */
export function computeCumulativeSummary(
  chartData: readonly CumulativeChartDataPoint[],
): CumulativeSummary {
  const totalSales = chartData[chartData.length - 1]?.cumulative ?? 0
  const dayCount = chartData.length
  const avgDaily = dayCount > 0 ? Math.round(totalSales / dayCount) : 0
  return { totalSales, avgDaily, dayCount }
}
