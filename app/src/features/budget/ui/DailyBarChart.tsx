/**
 * DailyBarChart — 当期 + 前年 side-by-side bars + 2 本の 7日移動平均 line
 *
 * プロトタイプの ProjectionBarChart + MA overlay 相当。
 * - 当期 bar (primary color) + 前年 bar (gray)
 * - 当期 7日MA (solid line) + 前年 7日MA (dashed line)
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
  /** 当期の日別値 (0-indexed、length = daysInMonth) */
  readonly data: readonly number[]
  /** 前年の日別値 (同上)。null/undefined の場合は比較非表示 */
  readonly compare?: readonly number[] | null
  readonly label?: string
  readonly compareLabel?: string
  /** 描画範囲 [start, end) — 0-indexed。省略時は全期間 */
  readonly rangeStart?: number
  readonly rangeEnd?: number
  readonly maWindow?: number
  readonly title?: string
  readonly height?: number
}

function buildOption(
  values: readonly number[],
  compare: readonly number[] | null,
  label: string,
  compareLabel: string,
  startIdx: number,
  maWindow: number,
  theme: AppTheme,
): EChartsOption {
  const days = values.map((_, i) => String(startIdx + i + 1))
  const maCurrent = calculatePartialMovingAverage(values, maWindow).map((v) =>
    v == null ? null : v,
  )
  const maCompare = compare
    ? calculatePartialMovingAverage(compare, maWindow).map((v) => (v == null ? null : v))
    : null

  const series: NonNullable<EChartsOption['series']> = [
    {
      name: label,
      type: 'bar',
      data: values.map((v) => v),
      ...barDefaults({ color: theme.colors.palette.primary, opacity: 0.8 }),
    },
  ]

  if (compare) {
    series.push({
      name: compareLabel,
      type: 'bar',
      // 前年 bar: 当期と同じ x 位置の横に並ぶ (ECharts の grouped bar デフォルト)
      data: compare.map((v) => v),
      itemStyle: {
        color: theme.colors.text3,
        opacity: 0.55,
        borderRadius: [2, 2, 0, 0],
      },
      barMaxWidth: 16,
    })
  }

  series.push({
    name: `${label} ${maWindow}日移動平均`,
    type: 'line',
    data: maCurrent,
    ...lineDefaults({ color: theme.colors.palette.warningDark, width: 2 }),
    connectNulls: true,
    z: 5,
  })

  if (maCompare) {
    series.push({
      name: `${compareLabel} ${maWindow}日移動平均`,
      type: 'line',
      data: maCompare,
      ...lineDefaults({ color: theme.colors.text3, dashed: true, width: 1.5 }),
      connectNulls: true,
      z: 4,
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
  label = '当期',
  compareLabel = '前年',
  rangeStart = 0,
  rangeEnd,
  maWindow = 7,
  title = '日別推移',
  height = 260,
}: Props) {
  const theme = useTheme() as AppTheme

  const slice = useMemo(() => {
    const end = rangeEnd ?? data.length
    return {
      values: data.slice(rangeStart, end),
      cmp: compare ? compare.slice(rangeStart, end) : null,
    }
  }, [data, compare, rangeStart, rangeEnd])

  const option = useMemo(
    () => buildOption(slice.values, slice.cmp, label, compareLabel, rangeStart, maWindow, theme),
    [slice, label, compareLabel, rangeStart, maWindow, theme],
  )

  if (slice.values.length === 0) return null

  return (
    <ChartCard title={title} ariaLabel={title}>
      <EChart option={option} height={height} ariaLabel={`${title} バーチャート`} />
    </ChartCard>
  )
})
