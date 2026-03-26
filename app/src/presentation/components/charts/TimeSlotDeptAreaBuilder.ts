/**
 * TimeSlotDeptAreaBuilder — 部門別積み上げ面グラフの ECharts option を構築
 *
 * TimeSlotChart の chartMode='department' 時に使用。
 * CategoryHourlyItem[] から部門×時間帯の積み上げ面グラフを生成する。
 * lineMode に応じて第2軸オーバーレイ（点数/累積構成比/気温/降水量）を追加。
 * 純粋関数。React 非依存。
 */
import type { AppTheme } from '@/presentation/theme/theme'
import { palette } from '@/presentation/theme/tokens'
import type { CategoryHourlyItem } from './CategoryTimeHeatmap'
import type { EChartsOption } from './EChart'
import { yenYAxis, standardGrid, standardTooltip, standardLegend } from './echartsOptionBuilders'
import { valueYAxis, categoryXAxis } from './builders'
import { DEPT_COLORS } from './DeptHourlyChartLogic'
import type { LineMode } from './TimeSlotChartView'
import type { WeatherMapEntry } from './TimeSlotChartOptionBuilder'

const HOUR_MIN = 7
const HOUR_MAX = 22
const TOP_N = 8

/** chartData の行型（TimeSlotChart の chartData と同一） */
interface ChartRow {
  readonly [key: string]: string | number | null
}

export interface DeptAreaOptionInput {
  readonly data: readonly CategoryHourlyItem[]
  readonly theme: AppTheme
  readonly lineMode: LineMode
  /** 時間帯別売上・点数データ（lineMode=quantity 用） */
  readonly chartData: readonly ChartRow[]
  readonly showPrev: boolean
  /** 当年天気マップ（hour → temp/precip） */
  readonly curWeatherMap: ReadonlyMap<number, WeatherMapEntry>
  /** 前年天気マップ */
  readonly prevWeatherMap: ReadonlyMap<number, WeatherMapEntry>
}

export function buildDeptStackedAreaOption(input: DeptAreaOptionInput): EChartsOption {
  const { data, theme, lineMode, chartData, showPrev, curWeatherMap, prevWeatherMap } = input
  if (data.length === 0) return {}

  // 部門合計でソート → 上位N件
  const totals = new Map<string, { name: string; total: number }>()
  for (const d of data) {
    const e = totals.get(d.code) ?? { name: d.name, total: 0 }
    e.total += d.amount
    totals.set(d.code, e)
  }
  const ranked = [...totals.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, TOP_N)
  const topCodes = new Set(ranked.map(([code]) => code))

  const departments = ranked.map(([code, info], i) => ({
    code,
    name: info.name,
    color: DEPT_COLORS[i % DEPT_COLORS.length],
  }))

  // 時間帯
  const hours = new Set<number>()
  for (const d of data) {
    if (d.hour >= HOUR_MIN && d.hour <= HOUR_MAX) hours.add(d.hour)
  }
  const sortedHours = [...hours].sort((a, b) => a - b)
  const hourLabels = sortedHours.map((h) => `${h}時`)

  // 時間帯×部門マップ
  const hourMap = new Map<number, Record<string, number>>()
  for (const d of data) {
    if (!topCodes.has(d.code) || d.hour < HOUR_MIN || d.hour > HOUR_MAX) continue
    const e = hourMap.get(d.hour) ?? {}
    const key = `dept_${d.code}`
    e[key] = (e[key] ?? 0) + d.amount
    hourMap.set(d.hour, e)
  }

  // chartData の hour → index マップ（オーバーレイデータ参照用）
  const chartDataByHour = new Map<number, ChartRow>()
  for (const row of chartData) {
    const h = Number(row.hour)
    if (!isNaN(h)) chartDataByHour.set(h, row)
  }

  // 第1軸: 部門別積み上げ面グラフ
  const deptSeries = [...departments].reverse().map((dept) => ({
    name: dept.name,
    type: 'line' as const,
    stack: 'depts',
    areaStyle: { opacity: 0.4 },
    data: sortedHours.map((h) => {
      const row = hourMap.get(h)
      return Math.round(row?.[`dept_${dept.code}`] ?? 0)
    }),
    lineStyle: { color: dept.color, width: 1.5 },
    itemStyle: { color: dept.color },
    symbol: 'none',
    smooth: true,
    yAxisIndex: 0,
  }))

  // ── 第2軸: lineMode に応じたオーバーレイ ──
  const overlaySeries: object[] = []
  let rightAxis: object = { type: 'value', show: false }

  if (lineMode === 'quantity') {
    overlaySeries.push({
      name: '点数',
      type: 'line',
      yAxisIndex: 1,
      data: sortedHours.map((h) => {
        const row = chartDataByHour.get(h)
        return row?.curQuantity ?? row?.curQty ?? null
      }),
      lineStyle: { color: palette.cyan, width: 2.5 },
      itemStyle: { color: palette.cyan },
      symbol: 'circle',
      symbolSize: 4,
      smooth: true,
      z: 10,
    })
    if (showPrev) {
      overlaySeries.push({
        name: '前年点数',
        type: 'line',
        yAxisIndex: 1,
        data: sortedHours.map((h) => {
          const row = chartDataByHour.get(h)
          return row?.compQuantity ?? row?.compQty ?? null
        }),
        lineStyle: { color: palette.cyan, width: 1.5, type: 'dashed', opacity: 0.5 },
        itemStyle: { color: palette.cyan, opacity: 0.5 },
        symbol: 'none',
        smooth: true,
        z: 10,
      })
    }
    rightAxis = {
      ...valueYAxis(theme, { formatter: (v: number) => v.toLocaleString() }),
      position: 'right',
      name: '点数',
      nameTextStyle: { color: theme.colors.text4 },
      splitLine: { show: false },
    }
  } else if (lineMode === 'cumulative') {
    // 累積構成比（部門別積み上げの合計を元に各時間帯の割合を累積）
    const hourTotals = sortedHours.map((h) => {
      const row = hourMap.get(h) ?? {}
      let sum = 0
      for (const dept of departments) sum += row[`dept_${dept.code}`] ?? 0
      return sum
    })
    const grandTotal = hourTotals.reduce((a, b) => a + b, 0) || 1
    let cumRatio = 0
    const cumData = hourTotals.map((t) => {
      cumRatio += t / grandTotal
      return Math.round(cumRatio * 10000) / 100
    })
    overlaySeries.push({
      name: '累積構成比',
      type: 'line',
      yAxisIndex: 1,
      data: cumData,
      lineStyle: { color: palette.purpleDark, width: 2.5 },
      itemStyle: { color: palette.purpleDark },
      areaStyle: { color: `${palette.purpleDark}15` },
      symbol: 'circle',
      symbolSize: 4,
      smooth: true,
      z: 10,
    })
    rightAxis = {
      ...valueYAxis(theme, { formatter: (v: number) => `${v}%` }),
      position: 'right',
      name: '累積構成比',
      nameTextStyle: { color: theme.colors.text4 },
      min: 0,
      max: 100,
      splitLine: { show: false },
    }
  } else if (lineMode === 'temperature') {
    overlaySeries.push({
      name: '気温',
      type: 'line',
      yAxisIndex: 1,
      data: sortedHours.map((h) => curWeatherMap.get(h)?.temp ?? null),
      lineStyle: { color: palette.warningDark, width: 2.5 },
      itemStyle: { color: palette.warningDark },
      symbol: 'circle',
      symbolSize: 4,
      smooth: true,
      z: 10,
    })
    if (showPrev && prevWeatherMap.size > 0) {
      overlaySeries.push({
        name: '前年気温',
        type: 'line',
        yAxisIndex: 1,
        data: sortedHours.map((h) => prevWeatherMap.get(h)?.temp ?? null),
        lineStyle: { color: palette.warningDark, width: 1.5, type: 'dashed', opacity: 0.5 },
        itemStyle: { color: palette.warningDark, opacity: 0.5 },
        symbol: 'none',
        smooth: true,
        z: 10,
      })
    }
    const temps = sortedHours
      .map((h) => curWeatherMap.get(h)?.temp)
      .filter((t): t is number => t != null)
    const minT = Math.min(...temps) - 3
    const maxT = Math.max(...temps) + 3
    rightAxis = {
      ...valueYAxis(theme, { formatter: (v: number) => `${v}°` }),
      position: 'right',
      name: '気温(°C)',
      nameTextStyle: { color: theme.colors.text4 },
      min: Math.floor(minT),
      max: Math.ceil(maxT),
      splitLine: { show: false },
    }
  } else if (lineMode === 'precipitation') {
    overlaySeries.push({
      name: '降水量',
      type: 'bar',
      yAxisIndex: 1,
      data: sortedHours.map((h) => curWeatherMap.get(h)?.precip ?? null),
      barWidth: '30%',
      itemStyle: { color: `${palette.primary}60` },
      z: 5,
    })
    rightAxis = {
      ...valueYAxis(theme, { formatter: (v: number) => `${v}mm` }),
      position: 'right',
      name: '降水量(mm)',
      nameTextStyle: { color: theme.colors.text4 },
      min: 0,
      splitLine: { show: false },
    }
  }

  return {
    grid: { ...standardGrid(), right: 60 },
    tooltip: { ...standardTooltip(theme), trigger: 'axis' },
    legend: { ...standardLegend(theme), type: 'scroll' },
    xAxis: categoryXAxis(hourLabels, theme),
    yAxis: [yenYAxis(theme), rightAxis],
    series: [...deptSeries, ...overlaySeries],
  }
}
