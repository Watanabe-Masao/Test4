/**
 * DailySalesChartBody の純粋計算ロジック
 *
 * R12準拠: 600行上限のため、ヘルパー関数・定数を分離。
 */
import type { DailyWeatherSummary } from '@/domain/models/record'
import { categorizeWeatherCode } from '@/domain/calculations/weatherAggregation'
import type { WeatherCategory } from '@/domain/models/record'

// ── 定数 ──

export const ALL_LABELS: Record<string, string> = {
  sales: '売上',
  prevYearSales: '比較期売上',
  customers: '点数',
  prevCustomers: '比較期点数',
  discount: '売変額',
  prevYearDiscount: '比較期売変額',
  currentCum: '当期累計',
  prevYearCum: '比較期累計',
  budgetCum: '予算累計',
  discountCum: '売変累計（当期）',
  prevYearDiscountCum: '売変累計（前年）',
  wfYoyUp: '差分+',
  wfYoyDown: '差分-',
  discountDiffCum: '売変差累計',
  budgetRate: '予算達成率',
  prevYearRate: '前年比',
  rateBand: '達成率帯',
}

/** 隠しシリーズ名（ツールチップから除外） */
export const HIDDEN_NAMES = new Set(['wfYoyBase', 'bandUpper', 'bandLower'])

/** パーセント表示するシリーズ名 */
export const PERCENT_SERIES = new Set(['budgetRate', 'prevYearRate'])

// ── ヘルパー関数 ──

/** ECharts 用 linearGradient ヘルパー */
export function grad(color: string, o1: number, o2: number): object {
  return {
    type: 'linear' as const,
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: withAlpha(color, o1) },
      { offset: 1, color: withAlpha(color, o2) },
    ],
  }
}

/** rgba ヘルパー — hex色にアルファを付与 */
export function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

/** データ配列からキーの値配列を取り出す */
export function pluck(arr: readonly Record<string, unknown>[], key: string): (number | null)[] {
  return arr.map((d) => {
    const v = d[key]
    return v == null ? null : (v as number)
  })
}

const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const

const WEATHER_ICONS: Record<WeatherCategory, string> = {
  sunny: '☀',
  cloudy: '☁',
  rainy: '🌧',
  snowy: '❄',
  other: '—',
}

/** 天気データを day → { icon, temp } のマップに変換 */
export function buildWeatherMap(
  weatherDaily: readonly DailyWeatherSummary[] | undefined,
): ReadonlyMap<number, { icon: string; temp: number }> {
  const map = new Map<number, { icon: string; temp: number }>()
  if (!weatherDaily) return map
  for (const w of weatherDaily) {
    const day = parseInt(w.dateKey.slice(8, 10), 10)
    const cat = categorizeWeatherCode(w.dominantWeatherCode)
    map.set(day, { icon: WEATHER_ICONS[cat], temp: Math.round(w.temperatureAvg) })
  }
  return map
}

/** X軸ラベルを生成: "1(日)\n☀25°" 形式 */
export function buildXLabels(
  days: readonly (string | number)[],
  weatherMap: ReadonlyMap<number, { icon: string; temp: number }>,
  year?: number,
  month?: number,
): string[] {
  const hasWeather = weatherMap.size > 0
  const hasDow = year != null && month != null

  return days.map((d) => {
    const day = Number(d)
    let label = String(day)
    if (hasDow) {
      const dow = new Date(year, month - 1, day).getDay()
      label = `${day}(${DOW_LABELS[dow]})`
    }
    if (hasWeather) {
      const w = weatherMap.get(day)
      if (w) label += `\n${w.icon}${w.temp}°`
    }
    return label
  })
}
