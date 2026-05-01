/**
 * 客数×客単価 効率分析チャート (ECharts)
 * @responsibility R:unclassified
 */
import { useMemo, useState, memo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { toComma, toPct } from './chartTheme'
import { CHART_GUIDES } from './chartGuides'
import type { DailyRecord } from '@/domain/models/record'
import { SegmentedControl } from '@/presentation/components/common/layout'
import { ChartCard } from './ChartCard'
import { ChartEmpty } from './ChartState'
import { EChart, type EChartsOption } from './EChart'
import { standardGrid, standardTooltip, standardLegend, valueYAxis } from './builders'
import { QuadrantGrid, QuadrantTag } from './CustomerScatterChart.styles'
import { chartFontSize, palette } from '@/presentation/theme/tokens'
import { buildAbsoluteScatter, buildYoyScatter } from './CustomerScatterChart.builders'

type AxisMode = 'absolute' | 'yoyChange'

const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const
const DOW_COLORS: Record<number, string> = {
  0: palette.dangerDark,
  1: palette.primary,
  2: palette.warningDark,
  3: '#10b981',
  4: palette.orange,
  5: palette.blueDark,
  6: palette.purpleDark,
}

const MODE_OPTIONS: readonly { value: AxisMode; label: string }[] = [
  { value: 'absolute', label: '実数' },
  { value: 'yoyChange', label: '前年比変化率' },
]

interface Props {
  daily: ReadonlyMap<number, DailyRecord>
  daysInMonth: number
  year: number
  month: number
  prevYearDaily?: ReadonlyMap<string, { sales: number; discount: number; customers?: number }>
}

/** @chart-id CHART-004 */
export const CustomerScatterChart = memo(function CustomerScatterChart({
  daily,
  daysInMonth,
  year,
  month,
  prevYearDaily,
}: Props) {
  const theme = useTheme() as AppTheme
  const [axisMode, setAxisMode] = useState<AxisMode>('absolute')
  const hasPrev = !!prevYearDaily

  const { scatterData, prevScatter, avgCustomers, avgTxValue, quadrantCounts } = useMemo(
    () => buildAbsoluteScatter(daily, daysInMonth, year, month, prevYearDaily),
    [daily, daysInMonth, year, month, prevYearDaily],
  )

  const { yoyData, yoyQuadrants } = useMemo(
    () => buildYoyScatter(daily, daysInMonth, year, month, prevYearDaily),
    [daily, daysInMonth, year, month, prevYearDaily],
  )

  const isYoy = axisMode === 'yoyChange' && yoyData.length > 0

  const option = useMemo<EChartsOption>(() => {
    const dataSource = (isYoy ? yoyData : scatterData) as unknown as readonly {
      day: number
      sales: number
      dow: number
      [k: string]: number
    }[]
    const xKey = isYoy ? 'custChange' : 'customers'
    const yKey = isYoy ? 'txChange' : 'txValue'

    // Group by DOW
    const dowMap = new Map<number, (typeof dataSource)[number][]>()
    for (const p of dataSource) {
      const existing = dowMap.get(p.dow)
      if (existing) existing.push(p)
      else dowMap.set(p.dow, [p])
    }

    const series: EChartsOption['series'] = []

    // Prev year scatter (absolute mode only)
    if (!isYoy && prevScatter.length > 0) {
      series.push({
        name: '前年',
        type: 'scatter',
        data: prevScatter.map((p) => ({
          value: [p.customers, p.txValue],
          symbolSize: Math.max(4, Math.sqrt(p.sales / 5000)),
        })),
        itemStyle: { color: theme.colors.palette.slate, opacity: 0.25 },
        symbolSize: 6,
      })
    }

    // DOW-colored series
    for (const [dow, points] of dowMap) {
      series.push({
        name: DOW_LABELS[dow],
        type: 'scatter',
        data: points.map((p) => ({
          value: [(p as Record<string, number>)[xKey], (p as Record<string, number>)[yKey]],
          symbolSize: Math.max(6, Math.min(20, Math.sqrt(p.sales / 5000))),
        })),
        itemStyle: { color: DOW_COLORS[dow], opacity: 0.75 },
      })
    }

    const refLines = isYoy
      ? [
          {
            xAxis: 0,
            lineStyle: { color: theme.colors.palette.slate, type: 'dashed' as const, opacity: 0.8 },
          },
          {
            yAxis: 0,
            lineStyle: { color: theme.colors.palette.slate, type: 'dashed' as const, opacity: 0.8 },
          },
        ]
      : [
          {
            xAxis: avgCustomers,
            lineStyle: { color: theme.colors.palette.slate, type: 'dashed' as const, opacity: 0.6 },
          },
          {
            yAxis: avgTxValue,
            lineStyle: { color: theme.colors.palette.slate, type: 'dashed' as const, opacity: 0.6 },
          },
        ]

    if (series.length > 0) {
      ;(series[series.length - 1] as Record<string, unknown>).markLine = {
        data: refLines,
        symbol: 'none',
        label: { show: false },
      }
    }

    return {
      grid: { ...standardGrid(), left: 60, right: 30, top: 20, bottom: 40 },
      tooltip: {
        ...standardTooltip(theme),
        formatter: (params: unknown) => {
          const p = params as { data?: { value?: [number, number] }; seriesName?: string }
          if (!p?.data?.value || !Array.isArray(p.data.value)) return ''
          const [x, y] = p.data.value
          const name = p.seriesName ?? ''
          if (isYoy) return `${name}<br/>客数変化: ${toPct(x)}<br/>単価変化: ${toPct(y)}`
          return `${name}<br/>客数: ${toComma(x)}人<br/>客単価: ${toComma(y)}円`
        },
      },
      legend: { ...standardLegend(theme) },
      xAxis: {
        type: 'value' as const,
        name: isYoy ? '客数 前年比変化率' : '客数（人）',
        nameLocation: 'center',
        nameGap: 25,
        axisLabel: {
          color: theme.colors.text3,
          fontSize: chartFontSize.axis,
          formatter: isYoy ? (v: number) => toPct(v, 0) : undefined,
        },
        splitLine: {
          lineStyle: { color: theme.colors.border, opacity: 0.3, type: 'dashed' as const },
        },
      },
      yAxis: {
        ...valueYAxis(theme, {
          formatter: isYoy ? (v: number) => toPct(v, 0) : (v: number) => `${toComma(v)}円`,
        }),
        name: isYoy ? '客単価 前年比変化率' : '客単価（円）',
        nameLocation: 'center',
        nameGap: 45,
      },
      series,
    }
  }, [isYoy, scatterData, yoyData, prevScatter, avgCustomers, avgTxValue, theme])

  if (scatterData.length === 0) {
    return (
      <ChartCard title="客数×客単価 効率分析" guide={CHART_GUIDES['customer-scatter']}>
        <ChartEmpty message="客数データがありません" />
      </ChartCard>
    )
  }

  const qc = isYoy ? yoyQuadrants : quadrantCounts
  const qLabels = isYoy
    ? [
        `客数↑単価↑: ${qc.q1}日`,
        `客数↓単価↑: ${qc.q2}日`,
        `客数↑単価↓: ${qc.q4}日`,
        `客数↓単価↓: ${qc.q3}日`,
      ]
    : [
        `高客数+高単価: ${qc.q1}日`,
        `低客数+高単価: ${qc.q2}日`,
        `高客数+低単価: ${qc.q4}日`,
        `低客数+低単価: ${qc.q3}日`,
      ]
  const qColors = [
    theme.chart.barPositive,
    theme.colors.palette.infoDark,
    theme.colors.palette.warningDark,
    theme.chart.barNegative,
  ]

  const title = isYoy ? '前年比 客数変化率×客単価変化率' : '客数×客単価 効率分析'
  const toolbar = hasPrev ? (
    <SegmentedControl
      options={MODE_OPTIONS}
      value={axisMode}
      onChange={setAxisMode}
      ariaLabel="軸モード"
    />
  ) : undefined

  return (
    <ChartCard
      title={title}
      subtitle="バブルサイズ = 売上額 / 色 = 曜日"
      guide={CHART_GUIDES['customer-scatter']}
      toolbar={toolbar}
    >
      <QuadrantGrid>
        {qLabels.map((label, i) => (
          <QuadrantTag key={i} $color={qColors[i]}>
            {label}
          </QuadrantTag>
        ))}
      </QuadrantGrid>
      <EChart option={option} height={320} ariaLabel="客数散布図チャート" />
    </ChartCard>
  )
})
