/**
 * 月間天気サマリ計算 — WeatherPage の純関数を分離
 */
import type { DailyWeatherSummary } from '@/domain/models/record'
import { categorizeWeatherCode } from '@/domain/weather/weatherAggregation'

export interface MonthSummaryResult {
  avgTemp: number
  maxTemp: number
  minTemp: number
  totalPrecip: number
  sunshineHours: number
  sunnyDays: number
  cloudyDays: number
  rainyDays: number
}

export function computeMonthSummary(
  daily: readonly DailyWeatherSummary[],
): MonthSummaryResult | null {
  if (daily.length === 0) return null
  let sumTemp = 0
  let maxTemp = -Infinity
  let minTemp = Infinity
  let totalPrecip = 0
  let sunshineHours = 0
  let sunnyDays = 0
  let cloudyDays = 0
  let rainyDays = 0
  for (const d of daily) {
    sumTemp += d.temperatureAvg
    if (d.temperatureMax > maxTemp) maxTemp = d.temperatureMax
    if (d.temperatureMin < minTemp) minTemp = d.temperatureMin
    totalPrecip += d.precipitationTotal
    sunshineHours += d.sunshineTotalHours
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
    sunnyDays,
    cloudyDays,
    rainyDays,
  }
}
