/**
 * WeatherCorrelationChart ViewModel
 *
 * 相関分析結果を ECharts 描画データに変換する。
 *
 * @guard F7 View は ViewModel のみ受け取る
 *
 * @responsibility R:transform
 */
import type { DailyWeatherSummary } from '@/domain/models/record'
import type { DailySalesForCorrelation } from '@/application/hooks/useWeatherCorrelation'
import type { CorrelationResult } from '@/application/hooks/useWeatherCorrelation'
import { normalizeMinMax } from '@/application/hooks/useWeatherCorrelation'

/** タイムラインチャートの1点  *
 * @responsibility R:transform
 */
export interface TimelineDataPoint {
  readonly dateKey: string
  readonly day: number
  readonly salesNorm: number | null
  readonly tempNorm: number | null
  readonly precipNorm: number | null
}

/** 相関の強さ判定  *
 * @responsibility R:transform
 */
export function getCorrelationStrength(r: number): 'strong' | 'moderate' | 'weak' {
  const abs = Math.abs(r)
  if (abs >= 0.6) return 'strong'
  if (abs >= 0.3) return 'moderate'
  return 'weak'
}

/** 相関係数のラベル  *
 * @responsibility R:transform
 */
export function formatCorrelationLabel(label: string, result: CorrelationResult): string {
  const sign = result.r >= 0 ? '+' : ''
  return `${label}: r=${sign}${result.r.toFixed(3)} (n=${result.n})`
}

/**
 * 日別天気・売上データをタイムライン描画用に変換する。
 *
 * 両系列を 0-100 に正規化し、同一 X 軸で重ね描きできるようにする。
 *
 * @responsibility R:transform
 */
export function buildTimelineData(
  weatherDaily: readonly DailyWeatherSummary[],
  salesDaily: readonly DailySalesForCorrelation[],
): readonly TimelineDataPoint[] {
  // dateKey でマージ
  const allDates = new Set([
    ...weatherDaily.map((w) => w.dateKey),
    ...salesDaily.map((s) => s.dateKey),
  ])
  const sortedDates = [...allDates].sort()

  const weatherMap = new Map(weatherDaily.map((w) => [w.dateKey, w]))
  const salesMap = new Map(salesDaily.map((s) => [s.dateKey, s]))

  // 正規化のために全値を収集
  const salesValues: number[] = []
  const tempValues: number[] = []
  const precipValues: number[] = []

  for (const dk of sortedDates) {
    const s = salesMap.get(dk)
    const w = weatherMap.get(dk)
    if (s) salesValues.push(s.sales)
    if (w) {
      tempValues.push(w.temperatureAvg)
      precipValues.push(w.precipitationTotal)
    }
  }

  const normSales = normalizeMinMax(salesValues)
  const normTemp = normalizeMinMax(tempValues)
  const normPrecip = normalizeMinMax(precipValues)

  // インデックスカウンタ
  let si = 0
  let ti = 0
  let pi = 0

  return sortedDates.map((dateKey) => {
    const s = salesMap.get(dateKey)
    const w = weatherMap.get(dateKey)
    const day = parseInt(dateKey.slice(8, 10), 10)

    const point: TimelineDataPoint = {
      dateKey,
      day,
      salesNorm: s ? (normSales.values[si++] ?? null) : null,
      tempNorm: w ? (normTemp.values[ti++] ?? null) : null,
      precipNorm: w ? (normPrecip.values[pi++] ?? null) : null,
    }

    return point
  })
}
