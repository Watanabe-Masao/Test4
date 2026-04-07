/**
 * FeatureChart — 純粋ロジック層
 *
 * DuckDB の DailyFeatureRow[] を受け取り、チャート描画用データに変換する。
 * React 非依存。副作用なし。
 *
 * 責務:
 *   - 全店舗の売上を日別に合算
 *   - Z スコアの店舗平均を算出
 *   - 異常日（|Z| >= 閾値）を検出
 *
 * @guard G5 hook ≤300行 — 純粋関数を分離
 * @responsibility R:calculation
 */
import type { DailyFeatureRow } from '@/application/hooks/duckdb'

// ─── Types ──────────────────────────────────────────

export interface FeatureChartDataPoint {
  readonly date: string
  readonly sales: number
  readonly ma3: number | null
  readonly ma7: number | null
  readonly ma28: number | null
  readonly zScore: number | null
  readonly anomaly: number
}

export interface AnomalyInfo {
  readonly date: string
  readonly sales: number
  readonly zScore: number
  readonly type: 'spike' | 'dip'
}

export interface FeatureChartResult {
  readonly chartData: readonly FeatureChartDataPoint[]
  readonly anomalies: readonly AnomalyInfo[]
}

// ─── Constants ──────────────────────────────────────

/** Z_SCORE_THRESHOLD 以上の絶対値を異常とみなす */
export const Z_SCORE_THRESHOLD = 2.0

// ─── Logic ──────────────────────────────────────────

/** DailyFeatureRow[] → チャート描画データ + 異常日リスト */
export function buildFeatureChartData(features: readonly DailyFeatureRow[]): FeatureChartResult {
  // 全店舗の売上を日別に合算
  const dailyMap = new Map<
    string,
    { sales: number; ma3: number; ma7: number; ma28: number; zSum: number; count: number }
  >()

  for (const row of features) {
    const existing = dailyMap.get(row.dateKey) ?? {
      sales: 0,
      ma3: 0,
      ma7: 0,
      ma28: 0,
      zSum: 0,
      count: 0,
    }
    existing.sales += row.sales
    existing.ma3 += row.salesMa3 ?? 0
    existing.ma7 += row.salesMa7 ?? 0
    existing.ma28 += row.salesMa28 ?? 0
    if (row.zScore != null) {
      existing.zSum += row.zScore
      existing.count += 1
    }
    dailyMap.set(row.dateKey, existing)
  }

  const chartData: FeatureChartDataPoint[] = []
  const anomalies: AnomalyInfo[] = []

  const sortedKeys = [...dailyMap.keys()].sort()
  for (const dateKey of sortedKeys) {
    const d = dailyMap.get(dateKey)!
    const avgZ = d.count > 0 ? d.zSum / d.count : null
    const isAnomaly = avgZ != null && Math.abs(avgZ) >= Z_SCORE_THRESHOLD

    chartData.push({
      date: dateKey.slice(5), // MM-DD
      sales: Math.round(d.sales),
      ma3: d.ma3 > 0 ? Math.round(d.ma3) : null,
      ma7: d.ma7 > 0 ? Math.round(d.ma7) : null,
      ma28: d.ma28 > 0 ? Math.round(d.ma28) : null,
      zScore: avgZ != null ? Math.round(avgZ * 100) / 100 : null,
      anomaly: isAnomaly ? Math.round(d.sales) : 0,
    })

    if (isAnomaly) {
      anomalies.push({
        date: dateKey,
        sales: Math.round(d.sales),
        zScore: Math.round(avgZ * 100) / 100,
        type: avgZ > 0 ? 'spike' : 'dip',
      })
    }
  }

  return { chartData, anomalies }
}
