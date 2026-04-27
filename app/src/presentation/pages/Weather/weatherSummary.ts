/**
 * 天気サマリ計算 — WeatherPage の純関数を分離
 *
 * 月間サマリ（グラフ未選択時）と日別サマリ（グラフ日クリック時）を提供。
 * 前年比較データも同じ型で返す。
 *
 * @responsibility R:unclassified
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

/**
 * 前年比較用フィルタ — 当年の日付範囲に合わせて前年データを選択
 *
 * comparisonScopeGuard 対応: 前年の年計算（year-1）を presentation 層から隔離。
 * dateKey ベースで年を解決するため、year 引数は不要。
 */
export function filterPrevYearForComparison(
  currentDaily: readonly DailyWeatherSummary[],
  prevYearAll: readonly DailyWeatherSummary[],
  month: number,
  mode: 'sameDate' | 'sameDow',
): readonly DailyWeatherSummary[] {
  const mStr = String(month).padStart(2, '0')
  const prevMonthDays = prevYearAll.filter((d) => d.dateKey.slice(5, 7) === mStr)

  if (mode === 'sameDow') {
    // 当年の各日の曜日を収集
    const dowCounts = new Map<number, number>()
    for (const d of currentDaily) {
      const dateKey = d.dateKey
      const dow = new Date(
        Number(dateKey.slice(0, 4)),
        Number(dateKey.slice(5, 7)) - 1,
        Number(dateKey.slice(8, 10)),
      ).getDay()
      dowCounts.set(dow, (dowCounts.get(dow) ?? 0) + 1)
    }
    // 前年の同月で、同じ曜日の日を必要数だけ取得
    const result: DailyWeatherSummary[] = []
    const usedPerDow = new Map<number, number>()
    for (const d of prevMonthDays) {
      const dateKey = d.dateKey
      const dow = new Date(
        Number(dateKey.slice(0, 4)),
        Number(dateKey.slice(5, 7)) - 1,
        Number(dateKey.slice(8, 10)),
      ).getDay()
      const needed = dowCounts.get(dow) ?? 0
      const used = usedPerDow.get(dow) ?? 0
      if (used < needed) {
        result.push(d)
        usedPerDow.set(dow, used + 1)
      }
    }
    return result
  }

  // sameDate: 当年に存在する日番号のみ
  const currentDays = new Set(currentDaily.map((d) => Number(d.dateKey.split('-')[2])))
  return prevMonthDays.filter((d) => currentDays.has(Number(d.dateKey.split('-')[2])))
}
