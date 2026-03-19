/**
 * HourlyProfileChart — 純粋ロジック層
 *
 * DuckDB の HourlyProfileRow[] を受け取り、時間帯別売上プロファイルに変換する。
 * React 非依存。副作用なし。
 *
 * 責務:
 *   - 全店舗の時間帯別売上を合算
 *   - 構成比再計算
 *   - ピーク時間帯 Top3 判定
 *   - サマリー算出（ピーク、集中度、営業時間帯数）
 */
import type { HourlyProfileRow } from '@/application/hooks/useDuckDBQuery'

// ─── Types ──────────────────────────────────────────

export interface HourlyProfileDataPoint {
  readonly hour: number
  readonly hourLabel: string
  readonly share: number
  readonly isPeak: boolean
  readonly peakMarker: number
  readonly avgTemp?: number
}

export interface HourlySummary {
  readonly chartData: readonly HourlyProfileDataPoint[]
  readonly peakHours: string
  readonly top3Concentration: number
  readonly activeHoursCount: number
}

// ─── Logic ──────────────────────────────────────────

/** HourlyProfileRow[] → 時間帯別プロファイルデータ + サマリー */
export function buildHourlyProfileData(rows: readonly HourlyProfileRow[]): HourlySummary {
  const hourMap = new Map<number, number>()
  for (const row of rows) {
    hourMap.set(row.hour, (hourMap.get(row.hour) ?? 0) + row.totalAmount)
  }

  const grandTotal = [...hourMap.values()].reduce((sum, v) => sum + v, 0)

  const entries: { hour: number; totalAmount: number; share: number }[] = []
  for (const [hour, amount] of hourMap) {
    entries.push({
      hour,
      totalAmount: amount,
      share: grandTotal > 0 ? amount / grandTotal : 0,
    })
  }
  entries.sort((a, b) => a.hour - b.hour)

  const ranked = [...entries].sort((a, b) => b.share - a.share)
  const peakHourSet = new Set(ranked.slice(0, 3).map((e) => e.hour))

  const chartData: HourlyProfileDataPoint[] = entries.map((e) => ({
    hour: e.hour,
    hourLabel: String(e.hour),
    share: e.share,
    isPeak: peakHourSet.has(e.hour),
    peakMarker: peakHourSet.has(e.hour) ? e.share : 0,
  }))

  const peakHoursSorted = [...peakHourSet].sort((a, b) => a - b)
  const peakHours = peakHoursSorted.map((h) => `${h}時`).join(', ')
  const top3Concentration = ranked.slice(0, 3).reduce((sum, e) => sum + e.share, 0)
  const activeHoursCount = entries.filter((e) => e.totalAmount > 0).length

  return { chartData, peakHours, top3Concentration, activeHoursCount }
}

/** 天気の時間帯別平均気温をチャートデータにマージする */
export function mergeWeatherData(
  data: HourlySummary,
  weatherAvg: readonly { hour: number; avgTemperature: number }[] | null,
): HourlySummary {
  if (!weatherAvg || weatherAvg.length === 0) return data
  const tempMap = new Map(weatherAvg.map((w) => [w.hour, w.avgTemperature]))
  return {
    ...data,
    chartData: data.chartData.map((d) => ({
      ...d,
      avgTemp: tempMap.get(d.hour) != null ? Math.round(tempMap.get(d.hour)! * 10) / 10 : undefined,
    })),
  }
}
