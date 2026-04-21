/**
 * DailyBarChart — 日別売上バー + 移動平均ライン (ECharts)
 *
 * 任意の日別シリーズ (actualDaily / dailyBudget / lyDaily) を bar として描画し、
 * 移動平均を line overlay で重ねる。drilldown 等で使用。
 *
 * @responsibility R:chart-view
 */
import { memo, useMemo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { calculatePartialMovingAverage } from '@/domain/calculations/utils'
import { ChartCard } from '@/presentation/components/charts/ChartCard'
import { EChart, type EChartsOption } from '@/presentation/components/charts/EChart'
import {
  barDefaults,
  categoryXAxis,
  lineDefaults,
  standardGrid,
  standardLegend,
  standardTooltip,
  yenYAxis,
} from '@/presentation/components/charts/builders'
import { toCommaYen } from '@/presentation/components/charts/echartsOptionBuilders'

interface Props {
  /** 日別値配列 (0-indexed、length = daysInMonth) */
  readonly data: readonly number[]
  /** 日別比較値配列 (前年等)。省略時は非表示 */
  readonly compare?: readonly number[] | null
  /** 系列ラベル */
  readonly label?: string
  /** 比較系列ラベル */
  readonly compareLabel?: string
  /** 描画範囲 [start, end) — 0-indexed。省略時は全期間 */
  readonly rangeStart?: number
  readonly rangeEnd?: number
  /** 移動平均ウィンドウ */
  readonly maWindow?: number
  /** bar の色。省略時は theme primary */
  readonly color?: string
  readonly title?: string
  readonly height?: number
}

function buildOption(
  values: readonly number[],
  compare: readonly number[] | null,
  compareLabel: string,
  label: string,
  startIdx: number,
  maWindow: number,
  color: string,
  theme: AppTheme,
): EChartsOption {
  const days = values.map((_, i) => String(startIdx + i + 1))
  const maRaw = calculatePartialMovingAverage(values, maWindow)
  const ma = maRaw.map((v) => (v == null ? null : v))

  const series: NonNullable<EChartsOption['series']> = [
    {
      name: label,
      type: 'bar',
      data: values.map((v) => v),
      ...barDefaults({ color, opacity: 0.75 }),
    },
    {
      name: `${maWindow}日移動平均`,
      type: 'line',
      data: ma,
      ...lineDefaults({ color: theme.colors.palette.primaryDark, width: 2 }),
      connectNulls: true,
      z: 5,
    },
  ]

  if (compare) {
    series.push({
      name: compareLabel,
      type: 'line',
      data: compare.map((v) => v),
      ...lineDefaults({ color: theme.chart.previousYear, dashed: true, width: 1.5 }),
      connectNulls: true,
    })
  }

  return {
    grid: standardGrid(),
    tooltip: {
      ...standardTooltip(theme),
      formatter: (params: unknown) => {
        const arr = params as { name: string; value: number; seriesName: string }[]
        if (!Array.isArray(arr) || arr.length === 0) return ''
        const head = `${arr[0].name}日`
        const rows = arr
          .map((p) => `${p.seriesName}: ${p.value != null ? toCommaYen(p.value) : '—'}`)
          .join('<br/>')
        return `${head}<br/>${rows}`
      },
    },
    legend: standardLegend(theme),
    xAxis: categoryXAxis(days, theme),
    yAxis: yenYAxis(theme),
    series,
  }
}

export const DailyBarChart = memo(function DailyBarChart({
  data,
  compare,
  label = '実績',
  compareLabel = '前年',
  rangeStart = 0,
  rangeEnd,
  maWindow = 7,
  color,
  title = '日別推移',
  height = 260,
}: Props) {
  const theme = useTheme() as AppTheme
  const effColor = color ?? theme.colors.palette.primary

  const slice = useMemo(() => {
    const end = rangeEnd ?? data.length
    return {
      values: data.slice(rangeStart, end),
      cmp: compare ? compare.slice(rangeStart, end) : null,
    }
  }, [data, compare, rangeStart, rangeEnd])

  const option = useMemo(
    () =>
      buildOption(
        slice.values,
        slice.cmp,
        compareLabel,
        label,
        rangeStart,
        maWindow,
        effColor,
        theme,
      ),
    [slice, label, compareLabel, rangeStart, maWindow, effColor, theme],
  )

  if (slice.values.length === 0) {
    return null
  }

  return (
    <ChartCard title={title} ariaLabel={title}>
      <EChart option={option} height={height} ariaLabel={`${title} バーチャート`} />
    </ChartCard>
  )
})
