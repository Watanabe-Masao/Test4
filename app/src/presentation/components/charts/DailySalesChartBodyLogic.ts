/**
 * DailySalesChartBody の純粋計算ロジック
 *
 * R12準拠: 600行上限のため、ヘルパー関数・定数を分離。
 * 右軸シリーズビルダーはモジュール化し、他チャートからも再利用可能。
 *
 * @guard G5 hook ≤300行 — 純粋関数を分離
 * @responsibility R:calculation
 */
import type { DailyWeatherSummary } from '@/domain/models/record'
import { categorizeWeatherCode } from '@/domain/weather/weatherAggregation'
import type { WeatherCategory } from '@/domain/models/record'
import { lineDefaults } from './builders'
import { chartFontSize, palette } from '@/presentation/theme/tokens'

// ── 右軸モード ──

/** 後方互換 re-export — 正本は domain/models/ChartViewMode.ts */
export type { RightAxisMode } from '@/domain/models/ChartViewMode'
import type { RightAxisMode } from '@/domain/models/ChartViewMode'

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
  quantity: '点数',
  prevQuantity: '比較期点数',
  customers: '客数',
  prevCustomers: '比較期客数',
  customerCount: '客数',
  prevCustomerCount: '比較期客数',
  discount: '売変額',
  prevYearDiscount: '比較期売変額',
  tempMax: '最高気温',
  tempMin: '最低気温',
  prevTempMax: '前年最高気温',
  prevTempMin: '前年最低気温',
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

/** WeatherBadge と同じ絵文字を使用 */
const WEATHER_ICONS: Record<WeatherCategory, string> = {
  sunny: '\u2600\uFE0F', // ☀️
  cloudy: '\u2601\uFE0F', // ☁️
  rainy: '\uD83C\uDF27\uFE0F', // 🌧️
  snowy: '\u2744\uFE0F', // ❄️
  other: '\uD83C\uDF00', // 🌀
}

const WEATHER_COLORS: Record<WeatherCategory, string> = {
  sunny: '#f59e0b',
  cloudy: '#9ca3af',
  rainy: '#3b82f6',
  snowy: '#38bdf8',
  other: '#6b7280',
}

/** 天気データを day → { icon, category, temp, max, min, weatherText } のマップに変換 */
export interface DayWeatherInfo {
  readonly icon: string
  readonly category: WeatherCategory
  readonly temp: number
  readonly max: number
  readonly min: number
  /** 気象庁天気概況テキスト（昼/夜）— ツールチップ用 */
  readonly weatherText?: string
}

/** dowOffset > 0 のとき、比較期間の開始日キーを算出する */
export function deriveCompStartDateKey(
  dowOffset: number,
  year: number | undefined,
  month: number | undefined,
): string | undefined {
  if (dowOffset === 0 || !year || !month) return undefined
  const d = 1 + dowOffset
  return `${year - 1}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/**
 * 天気データを日番号→天気情報のマップに変換する。
 *
 * 前年天気（dowOffset > 0）の場合、比較期間の開始日からの日数差でチャート位置を算出する。
 * これにより月跨ぎ（例: Feb 28 → Mar 1）でも正しい位置にマッピングされる。
 *
 * @param compStartDateKey 比較期間の開始日 (YYYY-MM-DD)。dowOffset > 0 の場合に必須。
 *   指定されると dateKey ベースの日数差計算を使用し、月跨ぎを正しく処理する。
 */
export function buildWeatherMap(
  weatherDaily: readonly DailyWeatherSummary[] | undefined,
  dowOffset = 0,
  compStartDateKey?: string,
): ReadonlyMap<number, DayWeatherInfo> {
  const map = new Map<number, DayWeatherInfo>()
  if (!weatherDaily) return map

  // 開始日が指定されている場合、日数差ベースで位置を計算（月跨ぎ対応）
  const startMs = compStartDateKey
    ? Date.UTC(
        parseInt(compStartDateKey.slice(0, 4), 10),
        parseInt(compStartDateKey.slice(5, 7), 10) - 1,
        parseInt(compStartDateKey.slice(8, 10), 10),
      )
    : 0
  const MS_PER_DAY = 86_400_000

  for (const w of weatherDaily) {
    let chartDay: number
    if (compStartDateKey) {
      const wMs = Date.UTC(
        parseInt(w.dateKey.slice(0, 4), 10),
        parseInt(w.dateKey.slice(5, 7), 10) - 1,
        parseInt(w.dateKey.slice(8, 10), 10),
      )
      chartDay = Math.round((wMs - startMs) / MS_PER_DAY) + 1
    } else {
      chartDay = parseInt(w.dateKey.slice(8, 10), 10) - dowOffset
    }
    if (chartDay < 1) continue
    const cat = categorizeWeatherCode(w.dominantWeatherCode)
    // 天気概況テキスト: 昼があれば昼、なければ夜
    const weatherText = w.weatherTextDay ?? w.weatherTextNight
    map.set(chartDay, {
      icon: WEATHER_ICONS[cat],
      category: cat,
      temp: Math.round(w.temperatureAvg),
      max: Math.round(w.temperatureMax),
      min: Math.round(w.temperatureMin),
      weatherText,
    })
  }
  return map
}

/** X軸ラベルを生成: rich text 形式で天気アイコンを大きく色付き表示（当年/前年） */
export function buildXLabels(
  days: readonly (string | number)[],
  weatherMap: ReadonlyMap<number, DayWeatherInfo>,
  prevYearWeatherMap?: ReadonlyMap<number, DayWeatherInfo>,
  year?: number,
  month?: number,
): string[] {
  const hasWeather = weatherMap.size > 0
  const hasPrevWeather = prevYearWeatherMap != null && prevYearWeatherMap.size > 0
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
      if (w) label += `\n{${w.category}|${w.icon}}{temp|${w.temp}°}`
    }
    if (hasPrevWeather) {
      const pw = prevYearWeatherMap.get(day)
      if (pw) label += `\n{${pw.category}|${pw.icon}}{prevTemp|${pw.temp}°}`
    }
    return label
  })
}

/** X軸 rich text スタイル定義（天気アイコン用） */
export function buildWeatherRichStyles(): Record<string, object> {
  return {
    sunny: { fontSize: chartFontSize.title, color: WEATHER_COLORS.sunny },
    cloudy: { fontSize: chartFontSize.title, color: WEATHER_COLORS.cloudy },
    rainy: { fontSize: chartFontSize.title, color: WEATHER_COLORS.rainy },
    snowy: { fontSize: chartFontSize.title, color: WEATHER_COLORS.snowy },
    other: { fontSize: chartFontSize.title, color: WEATHER_COLORS.other },
    temp: { fontSize: chartFontSize.axis - 1, color: palette.slateDark },
    prevTemp: { fontSize: chartFontSize.axis - 1, color: palette.slate },
  }
}

// ── 右軸シリーズビルダー（モジュール化：他チャートからも利用可能）──

interface SeriesItem {
  name: string
  type: 'line' | 'bar'
  yAxisIndex: number
  data: (number | null | { value: number | null; itemStyle?: object })[]
  lineStyle?: { color: string; width: number; type?: 'solid' | 'dashed' }
  itemStyle?: { color: string; borderRadius?: number[] }
  symbol?: 'none'
  smooth?: boolean
  connectNulls?: boolean
  barMaxWidth?: number
}

export interface RightAxisColors {
  readonly cyan: string
  readonly orange: string
  readonly danger: string
  readonly primary: string
}

/** 点数シリーズ（当期実線 + 前年破線、同色） */
export function buildQuantitySeries(
  rows: readonly Record<string, unknown>[],
  hasPrev: boolean,
  colors: RightAxisColors,
): SeriesItem[] {
  const series: SeriesItem[] = [
    {
      name: 'quantity',
      type: 'line',
      yAxisIndex: 1,
      data: pluck(rows, 'quantity'),
      ...lineDefaults({ color: colors.cyan }),
      connectNulls: true,
    },
  ]
  if (hasPrev) {
    series.push({
      name: 'prevQuantity',
      type: 'line',
      yAxisIndex: 1,
      data: pluck(rows, 'prevQuantity'),
      ...lineDefaults({ color: colors.cyan, dashed: true, width: 1.5 }),
      connectNulls: true,
    })
  }
  return series
}

/** 客数シリーズ（当期実線 + 前年破線、同色） */
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
      ...lineDefaults({ color: colors.cyan, dashed: true, width: 1.5 }),
      connectNulls: true,
    })
  }
  return series
}

/** 売変シリーズ（当期実線 + 前年破線） */
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
      ...lineDefaults({ color: colors.danger, dashed: true, width: 1.5 }),
      connectNulls: true,
    })
  }
  return series
}

/** 気温シリーズ（最高 + 最低 + 前年点線） */
export function buildTemperatureSeries(
  days: readonly (string | number)[],
  weatherMap: ReadonlyMap<number, DayWeatherInfo>,
  colors: RightAxisColors,
  prevYearWeatherMap?: ReadonlyMap<number, DayWeatherInfo>,
): SeriesItem[] {
  const maxTemps = days.map((d) => weatherMap.get(Number(d))?.max ?? null)
  const minTemps = days.map((d) => weatherMap.get(Number(d))?.min ?? null)
  const series: SeriesItem[] = [
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
  if (prevYearWeatherMap && prevYearWeatherMap.size > 0) {
    const prevMax = days.map((d) => prevYearWeatherMap.get(Number(d))?.max ?? null)
    const prevMin = days.map((d) => prevYearWeatherMap.get(Number(d))?.min ?? null)
    series.push(
      {
        name: 'prevTempMax',
        type: 'line',
        yAxisIndex: 1,
        data: prevMax,
        ...lineDefaults({ color: colors.danger, width: 1, dashed: true }),
        connectNulls: true,
      },
      {
        name: 'prevTempMin',
        type: 'line',
        yAxisIndex: 1,
        data: prevMin,
        ...lineDefaults({ color: colors.primary, width: 1, dashed: true }),
        connectNulls: true,
      },
    )
  }
  return series
}

/** 右軸モードに応じたシリーズを生成 */
export function buildRightAxisSeries(
  mode: RightAxisMode,
  rows: readonly Record<string, unknown>[],
  days: readonly (string | number)[],
  hasPrev: boolean,
  colors: RightAxisColors,
  weatherMap: ReadonlyMap<number, DayWeatherInfo>,
  prevYearWeatherMap?: ReadonlyMap<number, DayWeatherInfo>,
): SeriesItem[] {
  switch (mode) {
    case 'quantity':
      return buildQuantitySeries(rows, hasPrev, colors)
    case 'customers':
      return buildCustomerCountSeries(rows, hasPrev, colors)
    case 'discount':
      return buildDiscountSeries(rows, hasPrev, colors)
    case 'temperature':
      return buildTemperatureSeries(days, weatherMap, colors, prevYearWeatherMap)
  }
}

// ─── ツールチップフォーマッター ──────────────────────────

interface TooltipItem {
  readonly seriesName: string
  readonly value: number | null
  readonly color: string
  readonly marker: string
  readonly name: string
}

/** 日別チャートのツールチップ HTML を生成する */
export function formatDailyTooltip(
  params: unknown,
  weatherMap: ReadonlyMap<number, DayWeatherInfo> | undefined,
  fmtComma: (n: number) => string,
  fmtPct: (n: number) => string,
  prevYearWeatherMap?: ReadonlyMap<number, DayWeatherInfo>,
): string {
  const items = params as TooltipItem[]
  if (!Array.isArray(items) || items.length === 0 || !items[0]) return ''
  const rawName = items[0].name ?? ''
  // X軸ラベルに含まれるEChartsリッチテキスト構文 {style|text} を除去
  const day = rawName.replace(/\{[^}]*\|[^}]*\}/g, '').trim()
  const dayNum = parseInt(day, 10)
  const w = weatherMap?.get(dayNum)
  const pw = prevYearWeatherMap?.get(dayNum)
  const weatherLine = w?.weatherText
    ? `<div style="color:#6b7280;font-size:11px;margin-bottom:2px">${w.icon} ${w.weatherText}</div>`
    : ''
  const prevWeatherLine = pw?.weatherText
    ? `<div style="color:#9ca3af;font-size:10px;margin-bottom:2px">前年: ${pw.icon} ${pw.weatherText}</div>`
    : ''
  const header = `<div style="font-weight:600;margin-bottom:4px">${day}日</div>${weatherLine}${prevWeatherLine}`
  const lines = items
    .filter((item) => !HIDDEN_NAMES.has(item.seriesName))
    .map((item) => {
      const label = ALL_LABELS[item.seriesName] ?? item.seriesName
      const val =
        item.value == null
          ? '-'
          : PERCENT_SERIES.has(item.seriesName)
            ? fmtPct(item.value / 100)
            : TEMPERATURE_SERIES.has(item.seriesName)
              ? `${item.value}°C`
              : fmtComma(item.value)
      return (
        `<div style="display:flex;justify-content:space-between;gap:12px">` +
        `${item.marker}<span>${label}</span>` +
        `<span style="font-weight:600;font-family:monospace">${val}</span></div>`
      )
    })
    .join('')
  return header + lines
}

/** 右軸のフォーマッタを返す */
export function rightAxisFormatter(mode: RightAxisMode): (v: number) => string {
  if (mode === 'temperature') return (v: number) => `${v}°C`
  return (v: number) => String(Math.round(v).toLocaleString())
}

/** 気温シリーズ名（ツールチップで °C 表示するため判定用） */
export const TEMPERATURE_SERIES = new Set(['tempMax', 'tempMin', 'prevTempMax', 'prevTempMin'])
