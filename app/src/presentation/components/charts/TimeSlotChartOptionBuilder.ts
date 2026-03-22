/**
 * TimeSlotChart の ECharts option 構築 — 純粋関数
 *
 * Controller（TimeSlotChart.tsx）から chartOption の useMemo 本体を抽出。
 * theme と lineMode と天気データを受けて EChartsOption を返す。
 * React に依存しない純粋関数。
 */
import type { AppTheme } from '@/presentation/theme/theme'
import { toComma } from './chartTheme'
import { yenYAxis, standardTooltip } from './echartsOptionBuilders'
import { valueYAxis } from './builders'
import { palette } from '@/presentation/theme/tokens'
import type { EChartsOption } from './EChart'
import type { LineMode } from './TimeSlotChartView'
/** chartData の行型 */
interface ChartRow {
  readonly [key: string]: string | number | null
}
import { GRID_LEFT, GRID_RIGHT } from './TimeSlotChartView'

// ── Types ──

export interface WeatherMapEntry {
  readonly temp: number
  readonly precip: number
}

export interface TimeSlotChartOptionInput {
  readonly chartData: readonly ChartRow[]
  readonly hours: string[]
  readonly curLabel: string
  readonly compLabel: string
  readonly showPrev: boolean
  readonly theme: AppTheme
  readonly lineMode: LineMode
  readonly curWeatherMap: ReadonlyMap<number, WeatherMapEntry>
  readonly prevWeatherMap: ReadonlyMap<number, WeatherMapEntry>
}

// ── 降水量軸ポリシー ──

/** 降水量モードの固定軸設定を解決する。0〜5mm を基本とし、大きい値に段階的に拡張。 */
export function resolvePrecipitationAxisRange(maxPrecip: number): {
  min: number
  max: number
  interval: number
} {
  if (maxPrecip <= 5) return { min: 0, max: 5, interval: 1 }
  if (maxPrecip <= 10) return { min: 0, max: 10, interval: 2 }
  return { min: 0, max: 20, interval: 5 }
}

// ── 気温軸ポリシー ──

/** 温度帯の定義 */
export interface TemperatureBand {
  /** 帯の下限（°C） */
  readonly min: number
  /** 帯の上限（°C） */
  readonly max: number
  /** 帯の表示ラベル */
  readonly label: string
  /** 帯の背景色（RGBA 文字列） */
  readonly color: string
}

/** 固定の温度帯定義。季節に関わらず同じ境界を使う。 */
export const TEMPERATURE_BANDS: readonly TemperatureBand[] = [
  { min: -40, max: 0, label: '寒冷', color: 'rgba(59,130,246,0.06)' },
  { min: 0, max: 10, label: '低温', color: 'rgba(96,165,250,0.05)' },
  { min: 10, max: 20, label: '涼快', color: 'rgba(52,211,153,0.05)' },
  { min: 20, max: 28, label: '暖', color: 'rgba(251,191,36,0.05)' },
  { min: 28, max: 60, label: '高温', color: 'rgba(239,68,68,0.06)' },
]

/** 温度帯ごとの線色。背景色より濃い不透明色で視認性を確保する。 */
export const TEMPERATURE_LINE_COLORS: Record<string, string> = {
  寒冷: '#2563eb', // blue-600
  低温: '#3b82f6', // blue-500
  涼快: '#10b981', // emerald-500
  暖: '#f59e0b', // amber-500
  高温: '#ef4444', // red-500
}

/** 温度値が属する帯を返す */
export function classifyTemperatureBand(temp: number): TemperatureBand {
  for (const band of TEMPERATURE_BANDS) {
    if (temp < band.max) return band
  }
  return TEMPERATURE_BANDS[TEMPERATURE_BANDS.length - 1]
}

/**
 * 気温軸を準固定化する。
 * データの min/max を取得し、余白を足して 5°C 刻みに丸める。
 * 0°C をまたぐ場合は 0 を含める。
 */
export function roundTemperatureAxis(
  minTemp: number,
  maxTemp: number,
): { min: number; max: number; interval: number } {
  const STEP = 5
  const PADDING = 2

  const rawMin = minTemp - PADDING
  const rawMax = maxTemp + PADDING

  const axisMin = Math.floor(rawMin / STEP) * STEP
  // Math.ceil(-3/5)*5 は -0 になるため、+0 で正規化
  const axisMax = Math.ceil(rawMax / STEP) * STEP || 0

  // 0°C をまたぐ場合は両側を含める
  const finalMin = rawMin <= 0 && rawMax >= 0 ? Math.min(axisMin, 0) : axisMin
  const finalMax = rawMin <= 0 && rawMax >= 0 ? Math.max(axisMax, 0) : axisMax

  return { min: finalMin, max: finalMax, interval: STEP }
}

/**
 * 軸レンジ内に収まる温度帯バンドを ECharts markArea 用データに変換する。
 * 軸レンジ外のバンドはクリップされる。
 */
export function buildTemperatureBandMarkAreas(
  axisMin: number,
  axisMax: number,
): readonly {
  readonly name: string
  readonly yAxis: number
  readonly itemStyle: { readonly color: string }
}[][] {
  const areas: { name: string; yAxis: number; itemStyle: { color: string } }[][] = []

  for (const band of TEMPERATURE_BANDS) {
    const clippedMin = Math.max(band.min, axisMin)
    const clippedMax = Math.min(band.max, axisMax)

    if (clippedMin >= clippedMax) continue

    areas.push([
      { name: band.label, yAxis: clippedMin, itemStyle: { color: band.color } },
      { name: '', yAxis: clippedMax, itemStyle: { color: band.color } },
    ])
  }

  return areas
}

/**
 * 当年気温線の動的色分け用 visualMap pieces を生成する。
 * ECharts の piecewise visualMap で、データ値に応じて線色を温度帯に合わせる。
 */
export function buildTemperatureVisualMapPieces(): readonly {
  readonly min: number
  readonly max: number
  readonly color: string
}[] {
  return TEMPERATURE_BANDS.map((band) => ({
    min: band.min,
    max: band.max,
    color: TEMPERATURE_LINE_COLORS[band.label] ?? palette.warningDark,
  }))
}

// ── 純粋関数 ──

/** ECharts の chartOption を構築する。React 非依存の純粋関数。 */
export function buildTimeSlotChartOption(input: TimeSlotChartOptionInput): EChartsOption {
  const {
    chartData,
    hours,
    curLabel,
    compLabel,
    showPrev,
    theme,
    lineMode,
    curWeatherMap,
    prevWeatherMap,
  } = input

  const barColor = theme.colors.palette.primary
  const qtyColor = theme.colors.palette.cyan

  // ── 棒グラフ（売上金額） ──
  const series: EChartsOption['series'] = [
    {
      name: showPrev ? `${curLabel}売上` : '売上金額',
      type: 'bar',
      yAxisIndex: 0,
      data: chartData.map((r) => r.amount as number),
      itemStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: `${barColor}d9` },
            { offset: 1, color: `${barColor}66` },
          ],
        },
        borderRadius: [3, 3, 0, 0],
      },
      barMaxWidth: 20,
    },
  ]

  if (showPrev) {
    series.push({
      name: `${compLabel}売上`,
      type: 'bar',
      yAxisIndex: 0,
      data: chartData.map((r) => (r.prevAmount as number) ?? null),
      itemStyle: {
        color: `${theme.colors.palette.slate}80`,
        borderRadius: [3, 3, 0, 0],
      },
      barMaxWidth: 20,
    })
  }

  // ── 折れ線（lineMode に応じて切替） ──
  const tempColor = palette.warningDark
  const precipColor = palette.infoDark
  let curTempSeriesIndex = -1

  if (lineMode === 'quantity') {
    series.push({
      name: showPrev ? `${curLabel}点数` : '点数',
      type: 'line',
      yAxisIndex: 1,
      data: chartData.map((r) => r.quantity as number),
      lineStyle: { color: qtyColor, width: 2 },
      itemStyle: { color: qtyColor },
      symbol: 'none',
      smooth: true,
    })
    if (showPrev) {
      series.push({
        name: `${compLabel}点数`,
        type: 'line',
        yAxisIndex: 1,
        data: chartData.map((r) => (r.prevQuantity as number) ?? null),
        lineStyle: { color: qtyColor, width: 1.5, type: 'dashed' },
        itemStyle: { color: qtyColor },
        symbol: 'none',
        smooth: true,
        connectNulls: true,
      })
    }
  } else if (lineMode === 'temperature') {
    // 当年気温シリーズ: 色は visualMap で温度帯ごとに動的に適用
    curTempSeriesIndex = series.length
    series.push({
      name: showPrev ? `${curLabel}気温` : '気温',
      type: 'line',
      yAxisIndex: 1,
      data: hours.map((h) => curWeatherMap.get(parseInt(h, 10))?.temp ?? null),
      lineStyle: { width: 2 },
      symbol: 'circle',
      symbolSize: 4,
      smooth: true,
    })
    if (showPrev && prevWeatherMap.size > 0) {
      series.push({
        name: `${compLabel}気温`,
        type: 'line',
        yAxisIndex: 1,
        data: hours.map((h) => prevWeatherMap.get(parseInt(h, 10))?.temp ?? null),
        lineStyle: { color: `${tempColor}99`, width: 1.5, type: 'dashed' },
        itemStyle: { color: `${tempColor}99` },
        symbol: 'circle',
        symbolSize: 3,
        smooth: true,
        connectNulls: true,
      })
    }
  } else {
    // precipitation
    series.push({
      name: showPrev ? `${curLabel}降水量` : '降水量',
      type: 'line',
      yAxisIndex: 1,
      data: hours.map((h) => curWeatherMap.get(parseInt(h, 10))?.precip ?? null),
      lineStyle: { color: precipColor, width: 2 },
      itemStyle: { color: precipColor },
      areaStyle: { color: `${precipColor}20` },
      symbol: 'circle',
      symbolSize: 4,
      smooth: true,
    })
    if (showPrev && prevWeatherMap.size > 0) {
      series.push({
        name: `${compLabel}降水量`,
        type: 'line',
        yAxisIndex: 1,
        data: hours.map((h) => prevWeatherMap.get(parseInt(h, 10))?.precip ?? null),
        lineStyle: { color: precipColor, width: 1.5, type: 'dashed' },
        itemStyle: { color: precipColor },
        symbol: 'circle',
        symbolSize: 3,
        smooth: true,
        connectNulls: true,
      })
    }
  }

  // ── 右Y軸の構築 ──
  const rightYAxisFormatter =
    lineMode === 'quantity'
      ? (v: number) => toComma(v)
      : lineMode === 'temperature'
        ? (v: number) => `${v}°`
        : (v: number) => `${v}mm`

  // 降水量モード: 固定スケールで小さい値の誇張を防ぐ
  const rightAxisOptions: Parameters<typeof valueYAxis>[1] = {
    formatter: rightYAxisFormatter,
    position: 'right' as const,
    showSplitLine: false,
  }

  // 天気データの min/max を収集（気温・降水量の軸レンジ決定に使用）
  let minTemp = Infinity
  let maxTemp = -Infinity
  let maxPrecip = 0

  if (lineMode === 'temperature' || lineMode === 'precipitation') {
    for (const h of hours) {
      const hourNum = parseInt(h, 10)
      const curEntry = curWeatherMap.get(hourNum)
      const prevEntry = prevWeatherMap.get(hourNum)

      if (lineMode === 'temperature') {
        if (curEntry != null) {
          minTemp = Math.min(minTemp, curEntry.temp)
          maxTemp = Math.max(maxTemp, curEntry.temp)
        }
        if (prevEntry != null) {
          minTemp = Math.min(minTemp, prevEntry.temp)
          maxTemp = Math.max(maxTemp, prevEntry.temp)
        }
      } else {
        maxPrecip = Math.max(maxPrecip, curEntry?.precip ?? 0, prevEntry?.precip ?? 0)
      }
    }
  }

  if (lineMode === 'precipitation') {
    const precipRange = resolvePrecipitationAxisRange(maxPrecip)
    rightAxisOptions.min = precipRange.min
    rightAxisOptions.max = precipRange.max
    rightAxisOptions.interval = precipRange.interval
  }

  if (lineMode === 'temperature' && isFinite(minTemp) && isFinite(maxTemp)) {
    const tempRange = roundTemperatureAxis(minTemp, maxTemp)
    rightAxisOptions.min = tempRange.min
    rightAxisOptions.max = tempRange.max
    rightAxisOptions.interval = tempRange.interval
  }

  // 気温モード: visualMap で当年気温線を温度帯ごとに色分け
  let visualMap: EChartsOption['visualMap'] = undefined
  if (
    lineMode === 'temperature' &&
    isFinite(minTemp) &&
    isFinite(maxTemp) &&
    curTempSeriesIndex >= 0
  ) {
    const pieces = buildTemperatureVisualMapPieces()
    visualMap = {
      show: false,
      type: 'piecewise',
      dimension: 1, // y値（気温）で色分け
      seriesIndex: curTempSeriesIndex,
      pieces: pieces.map((p) => ({
        gte: p.min,
        lt: p.max,
        color: p.color,
      })),
    }
  }

  // 気温モード: 温度帯バンドを markArea で追加
  if (lineMode === 'temperature' && isFinite(minTemp) && isFinite(maxTemp)) {
    const tempRange = roundTemperatureAxis(minTemp, maxTemp)
    const bandAreas = buildTemperatureBandMarkAreas(tempRange.min, tempRange.max)

    if (bandAreas.length > 0) {
      // 温度帯バンドを透明な補助シリーズとして追加
      series.push({
        name: '温度帯',
        type: 'line',
        yAxisIndex: 1,
        data: [],
        markArea: {
          silent: true,
          data: bandAreas.map(([start, end]) => [
            { yAxis: start.yAxis, itemStyle: start.itemStyle },
            { yAxis: end.yAxis, itemStyle: end.itemStyle },
          ]),
        },
        legendHoverLink: false,
      } as unknown as typeof series extends readonly (infer T)[] ? T : never)
    }
  }

  return {
    grid: { left: GRID_LEFT, right: GRID_RIGHT, top: 10, bottom: 40, containLabel: false },
    tooltip: standardTooltip(theme),
    legend: { show: false },
    xAxis: {
      type: 'category',
      data: [...hours],
      axisLabel: {
        color: theme.colors.text3,
        fontSize: 10,
        fontFamily: theme.typography.fontFamily.mono,
        formatter: (v: string) => `${v}時`,
      },
      axisLine: { lineStyle: { color: theme.colors.border } },
    },
    yAxis: [yenYAxis(theme), valueYAxis(theme, rightAxisOptions)],
    series,
    ...(visualMap != null ? { visualMap } : {}),
  }
}

/** 天気データ配列を hour→{temp, precip} Map に変換する純粋関数 */
export function buildWeatherMap(
  weatherAvg:
    | readonly { hour: number; avgTemperature: number; totalPrecipitation: number }[]
    | null,
): Map<number, WeatherMapEntry> {
  const m = new Map<number, WeatherMapEntry>()
  if (weatherAvg) {
    for (const w of weatherAvg) {
      m.set(w.hour, { temp: w.avgTemperature, precip: w.totalPrecipitation })
    }
  }
  return m
}
