/**
 * TimeSlotDeptAreaBuilder — 部門別積み上げ面グラフの ECharts option を構築
 *
 * TimeSlotChart の chartMode='department' 時に使用。
 * CategoryHourlyItem[] から部門×時間帯の積み上げ面グラフを生成する。
 * 純粋関数。React 非依存。
 */
import type { AppTheme } from '@/presentation/theme/theme'
import type { CategoryHourlyItem } from './CategoryTimeHeatmap'
import type { EChartsOption } from './EChart'
import { yenYAxis, standardGrid, standardTooltip, standardLegend } from './echartsOptionBuilders'
import { categoryXAxis } from './builders'
import { DEPT_COLORS } from './DeptHourlyChartLogic'

const HOUR_MIN = 7
const HOUR_MAX = 22
const TOP_N = 8

export function buildDeptStackedAreaOption(
  data: readonly CategoryHourlyItem[],
  theme: AppTheme,
): EChartsOption {
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

  // series (reversed for stacking order: bottom = largest)
  const series = [...departments].reverse().map((dept) => ({
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
  }))

  return {
    grid: standardGrid(),
    tooltip: { ...standardTooltip(theme), trigger: 'axis' },
    legend: { ...standardLegend(theme), type: 'scroll' },
    xAxis: categoryXAxis(hourLabels, theme),
    yAxis: yenYAxis(theme),
    series,
  }
}
