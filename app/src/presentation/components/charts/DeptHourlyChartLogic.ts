/**
 * DeptHourlyChart — 純粋ロジック層
 *
 * DuckDB の CategoryHourlyRow[] を受け取り、部門別時間帯パターンデータに変換する。
 * React 非依存。副作用なし。
 *
 * 責務:
 *   - 上位N部門の抽出・ランキング
 *   - 時間帯×部門のマトリクス構築
 *   - 部門別時間帯パターンベクトル生成
 *   - ピアソン相関によるカニバリゼーション検出
 *   - ECharts option 構築（buildOption / buildRightAxisConfig）
 *
 * @guard G5 hook ≤300行 — 純粋関数を分離
 * @responsibility R:calculation
 */
import type { CategoryHourlyRow } from '@/application/hooks/duckdb'
import { topNByTotal } from '@/application/query-bridge/rawAggregation'
import { STORE_COLORS, toComma } from './chartTheme'
import { palette } from '@/presentation/theme/tokens'
import { pearsonCorrelation } from '@/application/hooks/useStatistics'
import type { AppTheme } from '@/presentation/theme/theme'
import type { EChartsOption } from './EChart'
import { yenYAxis, standardGrid, standardTooltip, standardLegend } from './echartsOptionBuilders'
import { categoryXAxis } from './builders'
import type { RightOverlayMode, HourlyOverlayData } from './DeptHourlyChart'

// ─── Types ──────────────────────────────────────────

export interface DeptInfo {
  readonly code: string
  readonly name: string
  readonly totalAmount: number
  readonly color: string
}

export interface DeptHourlyDataPoint {
  readonly hour: string
  readonly hourNum: number
  readonly [deptKey: string]: string | number
}

export interface CannibalizationResult {
  readonly deptA: string
  readonly deptB: string
  readonly r: number
}

export interface DeptHourlyResult {
  readonly chartData: readonly DeptHourlyDataPoint[]
  readonly departments: readonly DeptInfo[]
  readonly hourlyPatterns: ReadonlyMap<string, number[]>
}

// ─── Constants ──────────────────────────────────────

export const TOP_N_OPTIONS = [3, 5, 7, 10] as const

/** 部門別カラーパレット（STORE_COLORS を拡張） */
export const DEPT_COLORS = [
  ...STORE_COLORS,
  palette.purple,
  palette.orange,
  palette.lime,
  palette.blue,
  palette.pink,
] as const

// ─── Logic ──────────────────────────────────────────

/** CategoryHourlyRow[] → 部門別時間帯チャートデータ */
export function buildDeptHourlyData(
  rows: readonly CategoryHourlyRow[],
  topN: number,
  activeDepts: ReadonlySet<string>,
  hourMin: number,
  hourMax: number,
): DeptHourlyResult {
  const { ranked, topKeys: topCodes } = topNByTotal(
    rows,
    (r) => r.code,
    (r) => r.amount,
    topN,
  )

  // 部門名マップ（nameは最初に出現したものを使用）
  const nameMap = new Map<string, string>()
  for (const row of rows) {
    if (!nameMap.has(row.code)) nameMap.set(row.code, row.name)
  }

  const departments: DeptInfo[] = ranked.map((r, i) => ({
    code: r.key,
    name: nameMap.get(r.key) || r.key,
    totalAmount: Math.round(r.total),
    color: DEPT_COLORS[i % DEPT_COLORS.length],
  }))

  const hourMap = new Map<number, Record<string, number>>()
  for (const row of rows) {
    if (!topCodes.has(row.code)) continue
    if (row.hour < hourMin || row.hour > hourMax) continue

    const existing = hourMap.get(row.hour) ?? {}
    const key = `dept_${row.code}`
    existing[key] = (existing[key] ?? 0) + row.amount
    hourMap.set(row.hour, existing)
  }

  const chartData: DeptHourlyDataPoint[] = []
  const hourlyPatterns = new Map<string, number[]>()
  for (const dept of departments) {
    hourlyPatterns.set(dept.code, [])
  }

  for (let h = hourMin; h <= hourMax; h++) {
    const hourData = hourMap.get(h) ?? {}
    const point: Record<string, string | number> = {
      hour: `${h}時`,
      hourNum: h,
    }

    for (const dept of departments) {
      const key = `dept_${dept.code}`
      const val = Math.round(hourData[key] ?? 0)
      hourlyPatterns.get(dept.code)!.push(val)

      if (activeDepts.size === 0 || activeDepts.has(dept.code)) {
        point[key] = val
      } else {
        point[key] = 0
      }
    }

    chartData.push(point as DeptHourlyDataPoint)
  }

  return { chartData, departments, hourlyPatterns }
}

/** 部門間のピアソン相関を計算し、カニバリゼーション（負の相関）を検出する */
export function detectCannibalization(
  departments: readonly DeptInfo[],
  hourlyPatterns: ReadonlyMap<string, number[]>,
): CannibalizationResult[] {
  if (departments.length < 2) return []

  const results: CannibalizationResult[] = []
  for (let i = 0; i < departments.length; i++) {
    const patternA = hourlyPatterns.get(departments[i].code)
    if (!patternA || patternA.length < 3) continue

    for (let j = i + 1; j < departments.length; j++) {
      const patternB = hourlyPatterns.get(departments[j].code)
      if (!patternB || patternB.length < 3) continue

      const { r } = pearsonCorrelation(patternA, patternB)
      if (r < -0.3) {
        results.push({
          deptA: departments[i].name,
          deptB: departments[j].name,
          r,
        })
      }
    }
  }

  return results.sort((a, b) => a.r - b.r)
}

// ─── ECharts Option Builders ───────────────────────

// 軸ラベル formatter は module-level 名前付き関数として extract (DFR-002 = inline lambda 禁止、
// canonical な useAxisFormatter は React hook で pure builder からは呼べないため、本 file 内
// scope の formatter を named function 化することで axisLabel.formatter inline 記述を避ける)。
const formatQuantityAxis = (v: number): string => toComma(v)
const formatCumRatioAxis = (v: number): string => `${v}%`
const formatTemperatureAxis = (v: number): string => `${v}°`
const formatPrecipitationAxis = (v: number): string => `${v}mm`

export function buildRightAxisConfig(mode: RightOverlayMode, theme: AppTheme): object {
  const base = {
    type: 'value' as const,
    position: 'right' as const,
    splitLine: { show: false },
    axisLine: { show: true, lineStyle: { color: theme.colors.border } },
  }
  switch (mode) {
    case 'quantity':
      return {
        ...base,
        name: '点数',
        nameTextStyle: { color: theme.colors.text4 },
        axisLabel: { color: theme.colors.text4, formatter: formatQuantityAxis },
      }
    case 'cumRatio':
      return {
        ...base,
        name: '累積構成比',
        nameTextStyle: { color: theme.colors.text4 },
        min: 0,
        max: 100,
        axisLabel: { color: theme.colors.text4, formatter: formatCumRatioAxis },
      }
    case 'temperature':
      return {
        ...base,
        name: '気温(°C)',
        nameTextStyle: { color: theme.colors.text4 },
        axisLabel: { color: theme.colors.text4, formatter: formatTemperatureAxis },
      }
    case 'precipitation':
      return {
        ...base,
        name: '降水量(mm)',
        nameTextStyle: { color: theme.colors.text4 },
        min: 0,
        axisLabel: { color: theme.colors.text4, formatter: formatPrecipitationAxis },
      }
  }
}

export function buildDeptHourlyOption(
  chartData: readonly { hour: string; hourNum: number; [k: string]: string | number }[],
  departments: readonly { code: string; name: string; color: string }[],
  viewMode: 'stacked' | 'separate',
  theme: AppTheme,
  rightMode: RightOverlayMode,
  overlayByHour: ReadonlyMap<number, HourlyOverlayData>,
  prevQtyByHour?: ReadonlyMap<number, number>,
): EChartsOption {
  const hours = chartData.map((d) => d.hour)

  // 第1軸: 部門別積み上げ面グラフ
  const deptSeries = [...departments].reverse().map((dept) => ({
    name: dept.name,
    type: 'line' as const,
    stack: viewMode === 'stacked' ? 'depts' : undefined,
    areaStyle: { opacity: viewMode === 'stacked' ? 0.4 : 0.15 },
    data: chartData.map((d) => (d[`dept_${dept.code}`] as number) ?? 0),
    lineStyle: { color: dept.color, width: viewMode === 'stacked' ? 1.5 : 2 },
    itemStyle: { color: dept.color },
    symbol: 'none',
    smooth: true,
    yAxisIndex: 0,
  }))

  // 第2軸: オーバーレイ series
  const overlaySeries: object[] = []
  const rightAxisConfig = buildRightAxisConfig(rightMode, theme)

  if (rightMode === 'quantity') {
    overlaySeries.push({
      name: '点数',
      type: 'line',
      yAxisIndex: 1,
      data: chartData.map((d) => overlayByHour.get(d.hourNum)?.quantity ?? null),
      lineStyle: { color: theme.colors.palette.primary, width: 2, type: 'solid' },
      itemStyle: { color: theme.colors.palette.primary },
      symbol: 'circle',
      symbolSize: 4,
      smooth: true,
      z: 10,
    })
    if (prevQtyByHour && prevQtyByHour.size > 0) {
      overlaySeries.push({
        name: '前年点数',
        type: 'line',
        yAxisIndex: 1,
        data: chartData.map((d) => prevQtyByHour.get(d.hourNum) ?? null),
        lineStyle: {
          color: theme.colors.palette.primary,
          width: 1.5,
          type: 'dashed',
          opacity: 0.5,
        },
        itemStyle: { color: theme.colors.palette.primary, opacity: 0.5 },
        symbol: 'none',
        smooth: true,
        z: 10,
      })
    }
  } else if (rightMode === 'cumRatio') {
    const hourTotals = chartData.map((d) => {
      let sum = 0
      for (const dept of departments) sum += (d[`dept_${dept.code}`] as number) ?? 0
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
      lineStyle: { color: '#8b5cf6', width: 2 },
      itemStyle: { color: '#8b5cf6' },
      areaStyle: { color: '#8b5cf620' },
      symbol: 'circle',
      symbolSize: 4,
      smooth: true,
      z: 10,
    })
  } else if (rightMode === 'temperature') {
    overlaySeries.push({
      name: '気温',
      type: 'line',
      yAxisIndex: 1,
      data: chartData.map((d) => overlayByHour.get(d.hourNum)?.temperature ?? null),
      lineStyle: { color: '#ef4444', width: 2 },
      itemStyle: { color: '#ef4444' },
      symbol: 'circle',
      symbolSize: 4,
      smooth: true,
      z: 10,
    })
  } else if (rightMode === 'precipitation') {
    overlaySeries.push({
      name: '降水量',
      type: 'bar',
      yAxisIndex: 1,
      data: chartData.map((d) => overlayByHour.get(d.hourNum)?.precipitation ?? null),
      barWidth: '30%',
      itemStyle: { color: '#3b82f680' },
      z: 5,
    })
  }

  return {
    grid: { ...standardGrid(), right: 60 },
    tooltip: {
      ...standardTooltip(theme),
      trigger: 'axis',
    },
    legend: { ...standardLegend(theme), type: 'scroll' },
    xAxis: categoryXAxis(hours, theme),
    yAxis: [yenYAxis(theme), rightAxisConfig],
    series: [...deptSeries, ...overlaySeries],
  }
}
