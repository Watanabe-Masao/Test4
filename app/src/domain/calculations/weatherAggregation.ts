/**
 * 天気データ集約 — 純粋関数
 *
 * 時間別天気レコードを日別サマリに集約する。
 * domain 層のため副作用なし・外部依存なし。
 */
import type { HourlyWeatherRecord, DailyWeatherSummary, WeatherCategory } from '@/domain/models'
import { safeDivide } from './utils'

const SECONDS_PER_HOUR = 3600

/**
 * 時間別天気レコードを日別サマリに集約する。
 *
 * 同一 dateKey のレコードをグループ化し、各指標を集計。
 * 入力は dateKey でソートされている必要はない。
 *
 * @param records 時間別天気レコード
 * @returns 日別サマリの配列（dateKey 昇順）
 */
export function aggregateHourlyToDaily(
  records: readonly HourlyWeatherRecord[],
): readonly DailyWeatherSummary[] {
  if (records.length === 0) return []

  // dateKey でグループ化
  const grouped = new Map<string, HourlyWeatherRecord[]>()
  for (const rec of records) {
    const existing = grouped.get(rec.dateKey)
    if (existing) {
      existing.push(rec)
    } else {
      grouped.set(rec.dateKey, [rec])
    }
  }

  // 各日を集約
  const summaries: DailyWeatherSummary[] = []
  for (const [dateKey, hourlyRecords] of grouped) {
    summaries.push(aggregateOneDay(dateKey, hourlyRecords))
  }

  // dateKey 昇順ソート
  summaries.sort((a, b) => a.dateKey.localeCompare(b.dateKey))
  return summaries
}

function aggregateOneDay(
  dateKey: string,
  records: readonly HourlyWeatherRecord[],
): DailyWeatherSummary {
  const n = records.length

  let tempSum = 0
  let tempMax = -Infinity
  let tempMin = Infinity
  let precipSum = 0
  let humiditySum = 0
  let windMax = 0
  let sunshineSum = 0
  const codeCounts = new Map<number, number>()

  for (const r of records) {
    tempSum += r.temperature
    if (r.temperature > tempMax) tempMax = r.temperature
    if (r.temperature < tempMin) tempMin = r.temperature
    precipSum += r.precipitation
    humiditySum += r.humidity
    if (r.windSpeed > windMax) windMax = r.windSpeed
    sunshineSum += r.sunshineDuration
    codeCounts.set(r.weatherCode, (codeCounts.get(r.weatherCode) ?? 0) + 1)
  }

  // 最頻出の weather code
  let dominantCode = 0
  let maxCount = 0
  for (const [code, count] of codeCounts) {
    if (count > maxCount) {
      maxCount = count
      dominantCode = code
    }
  }

  return {
    dateKey,
    temperatureAvg: safeDivide(tempSum, n, 0),
    temperatureMax: tempMax === -Infinity ? 0 : tempMax,
    temperatureMin: tempMin === Infinity ? 0 : tempMin,
    precipitationTotal: precipSum,
    humidityAvg: safeDivide(humiditySum, n, 0),
    windSpeedMax: windMax,
    dominantWeatherCode: dominantCode,
    sunshineTotalHours: sunshineSum / SECONDS_PER_HOUR,
  }
}

/**
 * WMO Weather Interpretation Code を天気カテゴリに分類する。
 *
 * @see WMO Weather interpretation codes (WMO-4677)
 *
 * 0: Clear sky
 * 1-3: Mainly clear, partly cloudy, overcast
 * 45-48: Fog
 * 51-57: Drizzle
 * 61-67: Rain
 * 71-77: Snow
 * 80-82: Rain showers
 * 85-86: Snow showers
 * 95-99: Thunderstorm
 */
export function categorizeWeatherCode(code: number): WeatherCategory {
  if (code === 0) return 'sunny'
  if (code <= 3) return code === 1 ? 'sunny' : 'cloudy'
  if (code <= 48) return 'cloudy' // fog
  if (code <= 57) return 'rainy' // drizzle
  if (code <= 67) return 'rainy' // rain
  if (code <= 77) return 'snowy' // snow
  if (code <= 82) return 'rainy' // rain showers
  if (code <= 86) return 'snowy' // snow showers
  if (code <= 99) return 'rainy' // thunderstorm
  return 'other'
}

/**
 * AMEDAS 実測値から WMO 互換の天気コードを導出する。
 *
 * AMEDAS には天気コードがないため、降水量と日照時間から推定する。
 * WMO Weather Interpretation Code に準拠した値を返す。
 *
 * @param precipitationMm 時間降水量 (mm)
 * @param sunshineHours 時間日照時間 (hours, 0.0-1.0)
 * @param temperatureCelsius 気温 (°C)。省略時は雪判定しない
 * @returns WMO 互換天気コード
 */
export function deriveWeatherCode(
  precipitationMm: number,
  sunshineHours: number,
  temperatureCelsius?: number,
): number {
  // 降水あり
  if (precipitationMm > 0) {
    const isSnow = temperatureCelsius != null && temperatureCelsius < 1
    if (precipitationMm >= 5) return isSnow ? 75 : 65 // heavy snow/rain
    if (precipitationMm >= 1) return isSnow ? 71 : 61 // moderate snow/rain
    return isSnow ? 71 : 51 // light snow/drizzle
  }

  // 降水なし — 日照時間で判定
  if (sunshineHours >= 0.6) return 0 // clear sky (晴れ)
  if (sunshineHours >= 0.2) return 2 // partly cloudy (晴れ時々曇り)
  return 3 // overcast (曇り)
}
