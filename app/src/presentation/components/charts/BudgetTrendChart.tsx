/**
 * 予算トレンドチャート (ECharts)
 */
import { useState, useMemo, memo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { DualPeriodSlider } from './DualPeriodSlider'
import { useDualPeriodRange } from './useDualPeriodRange'
import { SegmentedControl } from '@/presentation/components/common'
import { ChartCard } from './ChartCard'
import { EChart, type EChartsOption } from './EChart'
import {
  yenYAxis,
  standardGrid,
  standardTooltip,
  standardLegend,
  toCommaYen,
} from './echartsOptionBuilders'
import { valueYAxis, lineDefaults } from './builders'
import { chartFontSize } from '@/presentation/theme/tokens'

type ViewType = 'line' | 'diff' | 'rate'

const VIEW_OPTIONS: readonly { value: ViewType; label: string }[] = [
  { value: 'line', label: '累計推移' },
  { value: 'diff', label: '差分' },
  { value: 'rate', label: '達成率' },
]

const VIEW_TITLES: Record<ViewType, string> = {
  line: '予算 vs 実績（累計推移）',
  diff: '予算差異（実績 − 予算）',
  rate: '予算達成率推移',
}

interface DataPoint {
  day: number
  actualCum: number
  budgetCum: number
  prevYearCum?: number | null
}

interface Props {
  readonly data: readonly DataPoint[]
  readonly budget: number
  readonly showPrevYear?: boolean
  readonly daysInMonth?: number
  readonly year: number
  readonly month: number
}

function buildOption(
  chartData: readonly (DataPoint & { diff: number | null; achieveRate: number | null })[],
  view: ViewType,
  hasPrevYear: boolean,
  budget: number,
  theme: AppTheme,
): EChartsOption {
  const days = chartData.map((d) => String(d.day))

  if (view === 'line') {
    const series: EChartsOption['series'] = [
      {
        name: '実績累計',
        type: 'line',
        data: chartData.map((d) => d.actualCum),
        lineStyle: { color: theme.chart.barPositive, width: 2.5 },
        itemStyle: { color: theme.chart.barPositive },
        symbol: 'none',
      },
      {
        name: '予算累計',
        type: 'line',
        data: chartData.map((d) => d.budgetCum),
        ...lineDefaults({ color: theme.chart.budget, dashed: true }),
      },
    ]
    if (budget > 0) {
      // 月間予算ライン (markLine on 実績系列)
      ;(series[0] as Record<string, unknown>).markLine = {
        data: [
          {
            yAxis: budget,
            label: { formatter: `月間予算`, position: 'end', fontSize: chartFontSize.annotation },
          },
        ],
        lineStyle: { color: theme.colors.palette.warningDark, type: 'dashed', width: 1.5 },
        symbol: 'none',
      }
    }
    if (hasPrevYear) {
      series.push({
        name: '比較期累計',
        type: 'line',
        data: chartData.map((d) => d.prevYearCum ?? null),
        lineStyle: { color: theme.chart.previousYear, width: 1.5, type: 'dashed' },
        itemStyle: { color: theme.chart.previousYear },
        symbol: 'none',
        connectNulls: true,
      })
    }
    return {
      grid: standardGrid(),
      tooltip: standardTooltip(theme),
      legend: standardLegend(theme),
      xAxis: {
        type: 'category',
        data: days,
        axisLabel: {
          color: theme.colors.text3,
          fontSize: chartFontSize.axis,
          fontFamily: theme.typography.fontFamily.mono,
        },
      },
      yAxis: yenYAxis(theme),
      series,
    }
  }

  if (view === 'diff') {
    return {
      grid: standardGrid(),
      tooltip: {
        ...standardTooltip(theme),
        formatter: (params: unknown) => {
          const p = params as { name: string; value: number }[]
          if (!Array.isArray(p) || !p[0]) return ''
          return `${p[0].name}日<br/>予算差異: ${toCommaYen(p[0].value)}`
        },
      },
      xAxis: {
        type: 'category',
        data: days,
        axisLabel: {
          color: theme.colors.text3,
          fontSize: chartFontSize.axis,
          fontFamily: theme.typography.fontFamily.mono,
        },
      },
      yAxis: yenYAxis(theme),
      series: [
        {
          type: 'bar',
          data: chartData.map((d) => ({
            value: d.diff,
            itemStyle: {
              color:
                d.diff == null
                  ? 'transparent'
                  : d.diff >= 0
                    ? theme.chart.barPositive
                    : theme.chart.barNegative,
              opacity: 0.7,
              borderRadius: [2, 2, 0, 0],
            },
          })),
          barMaxWidth: 16,
        },
      ],
    }
  }

  // rate view
  return {
    grid: standardGrid(),
    tooltip: {
      ...standardTooltip(theme),
      formatter: (params: unknown) => {
        const p = params as { name: string; value: number }[]
        if (!Array.isArray(p) || !p[0]) return ''
        return `${p[0].name}日<br/>達成率: ${p[0].value?.toFixed(1)}%`
      },
    },
    xAxis: {
      type: 'category',
      data: days,
      axisLabel: {
        color: theme.colors.text3,
        fontSize: chartFontSize.axis,
        fontFamily: theme.typography.fontFamily.mono,
      },
    },
    yAxis: valueYAxis(theme, { formatter: (v: number) => `${v}%` }),
    series: [
      {
        name: '達成率',
        type: 'line',
        data: chartData.map((d) => d.achieveRate),
        lineStyle: { color: theme.colors.palette.primary, width: 2.5 },
        itemStyle: { color: theme.colors.palette.primary },
        symbol: 'none',
        connectNulls: true,
        markLine: {
          data: [{ yAxis: 100, label: { formatter: '100%', position: 'end' } }],
          lineStyle: { color: theme.chart.barPositive, type: 'dashed', width: 1.5 },
          symbol: 'none',
        },
      },
    ],
  }
}

export const BudgetTrendChart = memo(function BudgetTrendChart({
  data,
  budget,
  showPrevYear,
  daysInMonth,
}: Props) {
  const theme = useTheme() as AppTheme
  const [view, setView] = useState<ViewType>('line')

  const totalDaysForSlider = daysInMonth ?? data.length
  const {
    p1Start: rangeStart,
    p1End: rangeEnd,
    onP1Change: setRange,
    p2Start,
    p2End,
    onP2Change,
    p2Enabled,
  } = useDualPeriodRange(totalDaysForSlider)

  const hasPrevYear = showPrevYear || data.some((d) => d.prevYearCum != null && d.prevYearCum > 0)

  const chartData = useMemo(
    () =>
      [...data]
        .map((d) => ({
          ...d,
          diff: d.actualCum > 0 ? d.actualCum - d.budgetCum : null,
          achieveRate:
            d.budgetCum > 0 && d.actualCum > 0 ? (d.actualCum / d.budgetCum) * 100 : null,
        }))
        .filter((d) => d.day >= rangeStart && d.day <= rangeEnd),
    [data, rangeStart, rangeEnd],
  )

  const option = useMemo(
    () => buildOption(chartData, view, hasPrevYear, budget, theme),
    [chartData, view, hasPrevYear, budget, theme],
  )

  const toolbar = (
    <SegmentedControl
      options={VIEW_OPTIONS}
      value={view}
      onChange={setView}
      ariaLabel="ビュー切替"
    />
  )

  return (
    <ChartCard title={VIEW_TITLES[view]} toolbar={toolbar} ariaLabel="予算トレンド">
      <EChart option={option} height={280} ariaLabel="予算トレンドチャート" />

      <DualPeriodSlider
        min={1}
        max={totalDaysForSlider}
        p1Start={rangeStart}
        p1End={rangeEnd}
        onP1Change={setRange}
        p2Start={p2Start}
        p2End={p2End}
        onP2Change={onP2Change}
        p2Enabled={p2Enabled}
      />
    </ChartCard>
  )
})
