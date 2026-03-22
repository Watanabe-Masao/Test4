/**
 * 時間帯別天気の表示モデル変換ロジック — 純粋関数
 *
 * R11準拠: TimeSlotChart.tsx から天気データ変換ロジックを分離。
 *
 * 責務:
 * - HourlyWeatherAvgRow[] → WeatherHourlyDisplay[] への変換
 * - weatherCode の意味解釈は domain 層の toWeatherDisplay() に委譲
 * - AM/PM サマリのツールチップテキスト構築
 */
import { toWeatherDisplay } from '@/domain/calculations/weatherAggregation'
import type { HourlyWeatherAvgRow } from '@/application/hooks/duckdb'
import type { WeatherHourlyDisplay } from './TimeSlotComparisonTable'

/**
 * 指定期間の時間帯レコードから最頻天気コードを導出する。
 *
 * MODE と同等の処理を純粋関数として実装。
 * 同数並列時は最初に出現したコードを返す。
 */
function dominantWeatherCode(rows: readonly HourlyWeatherAvgRow[]): number | null {
  const codeCounts = new Map<number, number>()
  for (const r of rows) {
    if (r.weatherCode != null) {
      codeCounts.set(r.weatherCode, (codeCounts.get(r.weatherCode) ?? 0) + 1)
    }
  }
  let dominant: number | null = null
  let maxCount = 0
  for (const [code, count] of codeCounts) {
    if (count > maxCount) {
      maxCount = count
      dominant = code
    }
  }
  return dominant
}

/**
 * 午前/午後の天気サマリをテキストにする。
 */
function summarizePeriod(
  periodRows: readonly HourlyWeatherAvgRow[],
  periodLabel: string,
): string {
  if (periodRows.length === 0) return ''
  const avgTemp =
    periodRows.reduce((s, r) => s + r.avgTemperature, 0) / periodRows.length
  const totalPrecip = periodRows.reduce((s, r) => s + r.totalPrecipitation, 0)
  const display = toWeatherDisplay(dominantWeatherCode(periodRows))
  const icon = display?.icon ?? ''
  const label = display?.label ?? ''
  const tempStr = `${avgTemp.toFixed(1)}°C`
  const precipStr = totalPrecip > 0 ? ` / ${totalPrecip.toFixed(1)}mm` : ''
  return `${periodLabel}: ${icon}${label} ${tempStr}${precipStr}`
}

/**
 * 時間帯別の天気詳細ツールチップテキストを構築する。
 *
 * 各時間帯のアイコンにホバーすると、その時間帯の天気と
 * 午前（6-11時）・午後（12-17時）の天気概要が表示される。
 */
function buildWeatherTooltip(
  hour: number,
  rows: readonly HourlyWeatherAvgRow[],
): string {
  const amRows = rows.filter((r) => r.hour >= 6 && r.hour < 12)
  const pmRows = rows.filter((r) => r.hour >= 12 && r.hour < 18)

  const current = rows.find((r) => r.hour === hour)
  const currentDisplay = toWeatherDisplay(current?.weatherCode ?? null)
  const currentTemp = current ? `${current.avgTemperature.toFixed(1)}°C` : ''
  const currentPrecip =
    current && current.totalPrecipitation > 0
      ? ` / ${current.totalPrecipitation.toFixed(1)}mm`
      : ''
  const currentLine = currentDisplay
    ? `${hour}時: ${currentDisplay.icon}${currentDisplay.label} ${currentTemp}${currentPrecip}`
    : `${hour}時: データなし`

  const amLine = summarizePeriod(amRows, '午前')
  const pmLine = summarizePeriod(pmRows, '午後')

  return [currentLine, amLine, pmLine].filter(Boolean).join('\n')
}

/**
 * HourlyWeatherAvgRow[] → WeatherHourlyDisplay[] に変換する。
 *
 * weatherCode の意味解釈を domain 層の toWeatherDisplay() に委譲し、
 * UI は表示モデルを描画するだけにする。
 */
export function toWeatherHourlyDisplayList(
  rows: readonly HourlyWeatherAvgRow[] | null | undefined,
): WeatherHourlyDisplay[] | undefined {
  if (!rows) return undefined
  return rows.map((w) => {
    const display = toWeatherDisplay(w.weatherCode)
    return {
      hour: w.hour,
      avgTemperature: w.avgTemperature,
      totalPrecipitation: w.totalPrecipitation,
      icon: display?.icon ?? null,
      label: display?.label ?? null,
      tooltip: buildWeatherTooltip(w.hour, rows),
    }
  })
}
