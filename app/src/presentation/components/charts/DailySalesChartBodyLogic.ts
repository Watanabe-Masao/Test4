/**
 * DailySalesChartBody の純粋計算ロジック
 *
 * R12準拠: 600行上限のため、ヘルパー関数・定数を分離。
 * 右軸シリーズビルダーはモジュール化し、他チャートからも再利用可能。
 */
import type { DailyWeatherSummary } from '@/domain/models/record'
import { categorizeWeatherCode } from '@/domain/calculations/weatherAggregation'
import type { WeatherCategory } from '@/domain/models/record'
import { lineDefaults } from './builders'

// ── 右軸モード ──

/** 日別チャートの右軸に表示するデータの種類 */
export type RightAxisMode = 'quantity' | 'customers' | 'discount' | 'temperature'

export const RIGHT_AXIS_OPTIONS: { mode: RightAxisMode; label: string }[] = [
  { mode: 'quantity', label: '点数' },
  { mode: 'customers', label: '客数' },
  { mode: 'discount', label: '売変' },
  { mode: 'temperature', label: '気温' },
]

// ── 定数 ──

export const ALL_LABELS: Record<string, string> = {
  sales: '売上',
  prevYearSales: '比較期売上',
  customers: '点数',
  prevCustomers: '比較期点数',
  customerCount: '客数',
  prevCustomerCount: '比較期客数',
  discount: '売変額',
  prevYearDiscount: '比較期売変額',
  tempMax: '最高気温',
  tempMin: '最低気温',
  currentCum: '当期累計',
  prevYearCum: '比較期累計',
  budgetCum: '予算累計',
  discountCum: '売変累計（当期）',
  prevYearDiscountCum: '売変累計（前年）',
  wfYoyUp: '差分+',
  wfYoyDown: '差分-',
  wfYoyCum: '差分累計',
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

/** 天気データを day → { icon, temp, max, min } のマップに変換 */
export interface DayWeatherInfo {
  readonly icon: string
  readonly temp: number
  readonly max: number
  readonly min: number
}

export function buildWeatherMap(
  weatherDaily: readonly DailyWeatherSummary[] | undefined,
): ReadonlyMap<number, DayWeatherInfo> {
  const map = new Map<number, DayWeatherInfo>()
  if (!weatherDaily) return map
  for (const w of weatherDaily) {
    const day = parseInt(w.dateKey.slice(8, 10), 10)
    const cat = categorizeWeatherCode(w.dominantWeatherCode)
    map.set(day, {
      icon: WEATHER_ICONS[cat],
      temp: Math.round(w.temperatureAvg),
      max: Math.round(w.temperatureMax),
      min: Math.round(w.temperatureMin),
    })
  }
  return map
}

/** X軸ラベルを生成: "1(日)\n☀25°" 形式 */
export function buildXLabels(
  days: readonly (string | number)[],
  weatherMap: ReadonlyMap<number, DayWeatherInfo>,
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

// ── 右軸シリーズビルダー（モジュール化：他チャートからも利用可能）──

interface SeriesItem {
  name: string
  type: 'line'
  yAxisIndex: number
  data: (number | null)[]
  lineStyle: { color: string; width: number; type: 'solid' | 'dashed' }
  itemStyle: { color: string }
  symbol: 'none'
  smooth: boolean
  connectNulls: boolean
}

interface RightAxisColors {
  readonly cyan: string
  readonly orange: string
  readonly danger: string
  readonly primary: string
}

/** 点数シリーズ（当期 + 前年） */
export function buildQuantitySeries(
  rows: readonly Record<string, unknown>[],
  hasPrev: boolean,
  colors: RightAxisColors,
): SeriesItem[] {
  const series: SeriesItem[] = [
    {
      name: 'customers',
      type: 'line',
      yAxisIndex: 1,
      data: pluck(rows, 'customers'),
      ...lineDefaults({ color: colors.cyan, dashed: true }),
      connectNulls: true,
    },
  ]
  if (hasPrev) {
    series.push({
      name: 'prevCustomers',
      type: 'line',
      yAxisIndex: 1,
      data: pluck(rows, 'prevCustomers'),
      ...lineDefaults({ color: colors.orange, dashed: true, width: 1.5 }),
      connectNulls: true,
    })
  }
  return series
}

/** 客数シリーズ（客数 = customers フィールドを使用。点数と同フィールドだが意味が異なる表示） */
export function buildCustomerCountSeries(
  rows: readonly Record<string, unknown>[],
  hasPrev: boolean,
  colors: RightAxisColors,
): SeriesItem[] {
  const series: SeriesItem[] = [
    {
      name: 'customerCount',
      type: 'line',
      yAxisIndex: 1,
      data: pluck(rows, 'customers'),
      ...lineDefaults({ color: colors.cyan }),
      connectNulls: true,
    },
  ]
  if (hasPrev) {
    series.push({
      name: 'prevCustomerCount',
      type: 'line',
      yAxisIndex: 1,
      data: pluck(rows, 'prevCustomers'),
      ...lineDefaults({ color: colors.orange, width: 1.5 }),
      connectNulls: true,
    })
  }
  return series
}

/** 売変シリーズ（当期 + 前年） */
export function buildDiscountSeries(
  rows: readonly Record<string, unknown>[],
  hasPrev: boolean,
  colors: RightAxisColors,
): SeriesItem[] {
  const series: SeriesItem[] = [
    {
      name: 'discount',
      type: 'line',
      yAxisIndex: 1,
      data: pluck(rows, 'discount'),
      ...lineDefaults({ color: colors.danger }),
      connectNulls: true,
    },
  ]
  if (hasPrev) {
    series.push({
      name: 'prevYearDiscount',
      type: 'line',
      yAxisIndex: 1,
      data: pluck(rows, 'prevYearDiscount'),
      ...lineDefaults({ color: colors.orange, width: 1.5 }),
      connectNulls: true,
    })
  }
  return series
}

/** 気温シリーズ（最高 + 最低） */
export function buildTemperatureSeries(
  days: readonly (string | number)[],
  weatherMap: ReadonlyMap<number, DayWeatherInfo>,
  colors: RightAxisColors,
): SeriesItem[] {
  const maxTemps = days.map((d) => weatherMap.get(Number(d))?.max ?? null)
  const minTemps = days.map((d) => weatherMap.get(Number(d))?.min ?? null)
  return [
    {
      name: 'tempMax',
      type: 'line',
      yAxisIndex: 1,
      data: maxTemps,
      ...lineDefaults({ color: colors.danger }),
      connectNulls: true,
    },
    {
      name: 'tempMin',
      type: 'line',
      yAxisIndex: 1,
      data: minTemps,
      ...lineDefaults({ color: colors.primary }),
      connectNulls: true,
    },
  ]
}

/** 右軸モードに応じたシリーズを生成 */
export function buildRightAxisSeries(
  mode: RightAxisMode,
  rows: readonly Record<string, unknown>[],
  days: readonly (string | number)[],
  hasPrev: boolean,
  colors: RightAxisColors,
  weatherMap: ReadonlyMap<number, DayWeatherInfo>,
): SeriesItem[] {
  switch (mode) {
    case 'quantity':
      return buildQuantitySeries(rows, hasPrev, colors)
    case 'customers':
      return buildCustomerCountSeries(rows, hasPrev, colors)
    case 'discount':
      return buildDiscountSeries(rows, hasPrev, colors)
    case 'temperature':
      return buildTemperatureSeries(days, weatherMap, colors)
  }
}

/** 右軸のフォーマッタを返す */
export function rightAxisFormatter(mode: RightAxisMode): (v: number) => string {
  if (mode === 'temperature') return (v: number) => `${v}°C`
  return (v: number) => String(Math.round(v).toLocaleString())
}

/** 気温シリーズ名（ツールチップで °C 表示するため判定用） */
export const TEMPERATURE_SERIES = new Set(['tempMax', 'tempMin'])
