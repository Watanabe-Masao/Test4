/**
 * DowPatternChart — 純粋ロジック層
 *
 * DuckDB の DowPatternRow[] を受け取り、曜日別売上パターンデータに変換する。
 * React 非依存。副作用なし。
 *
 * 責務:
 *   - 全店舗の曜日別売上を合算
 *   - 全曜日平均、最多/最少曜日、CV を算出
 *
 * @guard G5 hook ≤300行 — 純粋関数を分離
 */
import type { DowPatternRow } from '@/application/hooks/duckdb'
import { coefficientOfVariation } from '@/application/query-bridge/rawAggregation'

// ─── Types ──────────────────────────────────────────

export interface DowChartDataPoint {
  readonly dow: number
  readonly label: string
  readonly avgSales: number
}

export interface DowSummary {
  readonly chartData: readonly DowChartDataPoint[]
  readonly overallAvg: number
  readonly strongestDow: string
  readonly weakestDow: string
  readonly cv: number
}

// ─── Constants ──────────────────────────────────────

export const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const

// ─── Logic ──────────────────────────────────────────

/** DowPatternRow[] → 曜日別チャートデータ + サマリー */
export function buildDowPatternData(rows: readonly DowPatternRow[]): DowSummary {
  const dowMap = new Map<number, number>()
  for (const row of rows) {
    dowMap.set(row.dow, (dowMap.get(row.dow) ?? 0) + row.avgSales)
  }

  const dowEntries: { dow: number; avgSales: number }[] = []
  for (let d = 0; d < 7; d++) {
    const sales = dowMap.get(d)
    if (sales != null) {
      dowEntries.push({ dow: d, avgSales: Math.round(sales) })
    }
  }

  const totalSales = dowEntries.reduce((sum, e) => sum + e.avgSales, 0)
  const overallAvg = dowEntries.length > 0 ? totalSales / dowEntries.length : 0

  const chartData: DowChartDataPoint[] = dowEntries.map((e) => ({
    dow: e.dow,
    label: DOW_LABELS[e.dow],
    avgSales: e.avgSales,
  }))

  let strongestDow = ''
  let weakestDow = ''
  let maxSales = -Infinity
  let minSales = Infinity
  for (const point of chartData) {
    if (point.avgSales > maxSales) {
      maxSales = point.avgSales
      strongestDow = point.label
    }
    if (point.avgSales < minSales) {
      minSales = point.avgSales
      weakestDow = point.label
    }
  }

  const cv = coefficientOfVariation(chartData.map((p) => p.avgSales))

  return { chartData, overallAvg: Math.round(overallAvg), strongestDow, weakestDow, cv }
}
