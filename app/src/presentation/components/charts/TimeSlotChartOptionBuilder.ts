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
    series.push({
      name: showPrev ? `${curLabel}気温` : '気温',
      type: 'line',
      yAxisIndex: 1,
      data: hours.map((h) => curWeatherMap.get(parseInt(h, 10))?.temp ?? null),
      lineStyle: { color: tempColor, width: 2 },
      itemStyle: { color: tempColor },
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
        lineStyle: { color: tempColor, width: 1.5, type: 'dashed' },
        itemStyle: { color: tempColor },
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

  if (lineMode === 'precipitation') {
    // 実データの最大降水量を取得して段階的にスケールを決定
    let maxPrecip = 0
    for (const h of hours) {
      const hourNum = parseInt(h, 10)
      const curP = curWeatherMap.get(hourNum)?.precip ?? 0
      const prevP = prevWeatherMap.get(hourNum)?.precip ?? 0
      maxPrecip = Math.max(maxPrecip, curP, prevP)
    }
    const precipRange = resolvePrecipitationAxisRange(maxPrecip)
    rightAxisOptions.min = precipRange.min
    rightAxisOptions.max = precipRange.max
    rightAxisOptions.interval = precipRange.interval
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
    yAxis: [
      yenYAxis(theme),
      valueYAxis(theme, rightAxisOptions),
    ],
    series,
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
