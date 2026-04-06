/**
 * 天気サマリ計算 — WeatherPage の純関数を分離
 *
 * 月間サマリ（グラフ未選択時）と日別サマリ（グラフ日クリック時）を提供。
 * 前年比較データも同じ型で返す。
 */
import type { DailyWeatherSummary } from '@/domain/models/record'
import { categorizeWeatherCode } from '@/domain/weather/weatherAggregation'
import type { WeatherCategory } from '@/domain/models/record'

export interface WeatherSummaryResult {
  readonly avgTemp: number
  readonly maxTemp: number
  readonly minTemp: number
  readonly totalPrecip: number
  readonly sunshineHours: number
  readonly avgHumidity: number
  readonly maxWind: number
  readonly sunnyDays: number
  readonly cloudyDays: number
  readonly rainyDays: number
  readonly totalDays: number
  /** 日別サマリの場合: 天気カテゴリ */
  readonly weatherCategory?: WeatherCategory
  /** 日別サマリの場合: 天気概況テキスト */
  readonly weatherText?: string
}

/** 月間サマリ */
export function computeMonthSummary(
  daily: readonly DailyWeatherSummary[],
): WeatherSummaryResult | null {
  if (daily.length === 0) return null
  let sumTemp = 0
  let maxTemp = -Infinity
  let minTemp = Infinity
  let totalPrecip = 0
  let sunshineHours = 0
  let sumHumidity = 0
  let maxWind = 0
  let sunnyDays = 0
  let cloudyDays = 0
  let rainyDays = 0
  for (const d of daily) {
    sumTemp += d.temperatureAvg
    if (d.temperatureMax > maxTemp) maxTemp = d.temperatureMax
    if (d.temperatureMin < minTemp) minTemp = d.temperatureMin
    totalPrecip += d.precipitationTotal
    sunshineHours += d.sunshineTotalHours
    sumHumidity += d.humidityAvg
    if (d.windSpeedMax > maxWind) maxWind = d.windSpeedMax
    const cat = categorizeWeatherCode(d.dominantWeatherCode)
    if (cat === 'sunny') sunnyDays++
    if (cat === 'cloudy') cloudyDays++
    if (cat === 'rainy' || cat === 'snowy') rainyDays++
  }
  return {
    avgTemp: sumTemp / daily.length,
    maxTemp,
    minTemp,
    totalPrecip,
    sunshineHours,
    avgHumidity: sumHumidity / daily.length,
    maxWind,
    sunnyDays,
    cloudyDays,
    rainyDays,
    totalDays: daily.length,
  }
}

/** 単日サマリ（グラフクリック時） */
export function computeDaySummary(d: DailyWeatherSummary): WeatherSummaryResult {
  const cat = categorizeWeatherCode(d.dominantWeatherCode)
  return {
    avgTemp: d.temperatureAvg,
    maxTemp: d.temperatureMax,
    minTemp: d.temperatureMin,
    totalPrecip: d.precipitationTotal,
    sunshineHours: d.sunshineTotalHours,
    avgHumidity: d.humidityAvg,
    maxWind: d.windSpeedMax,
    sunnyDays: cat === 'sunny' ? 1 : 0,
    cloudyDays: cat === 'cloudy' ? 1 : 0,
    rainyDays: cat === 'rainy' || cat === 'snowy' ? 1 : 0,
    totalDays: 1,
    weatherCategory: cat,
    weatherText: d.weatherTextDay ?? d.weatherTextNight,
  }
}
