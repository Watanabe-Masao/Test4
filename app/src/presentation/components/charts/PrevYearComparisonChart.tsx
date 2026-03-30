/**
 * 期間比較チャート (ECharts)
 */
import { useMemo, memo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { chartFontSize } from '@/presentation/theme/tokens'
import { useCurrencyFormatter, toPct } from './chartTheme'
import { toDateKeyFromParts } from '@/domain/models/CalendarDate'
import { ChartCard } from './ChartCard'
import { EChart, type EChartsOption } from './EChart'
import {
  yenYAxis,
  standardGrid,
  standardTooltip,
  standardLegend,
  toCommaYen,
} from './echartsOptionBuilders'
import { categoryXAxis, lineDefaults } from './builders'
import {
  SummaryRow,
  Metric,
  MetricLabel,
  MetricValue,
  ProgressBarWrap,
  ProgressTrack,
  ProgressFill,
  ProgressLabel,
} from './PrevYearComparisonChart.styles'

interface Props {
  currentDaily: ReadonlyMap<number, { sales: number }>
  prevYearDaily: ReadonlyMap<string, { sales: number }>
  daysInMonth: number
  year: number
  month: number
  /** 表示開始日（ページレベル Slider から） */
  rangeStart?: number
  /** 表示終了日（ページレベル Slider から） */
  rangeEnd?: number
}

/** 累計データ構築（純粋関数） */
function buildCumulativeData(
  currentDaily: ReadonlyMap<number, { sales: number }>,
  prevYearDaily: ReadonlyMap<string, { sales: number }>,
  year: number,
  month: number,
  daysInMonth: number,
) {
  let currentCum = 0
  let prevCum = 0
  const allData: { day: number; currentCum: number; prevYearCum: number | null }[] = []

  for (let d = 1; d <= daysInMonth; d++) {
    currentCum += currentDaily.get(d)?.sales ?? 0
    prevCum += prevYearDaily.get(toDateKeyFromParts(year, month, d))?.sales ?? 0
    allData.push({ day: d, currentCum, prevYearCum: prevCum > 0 ? prevCum : null })
  }

  const latestDay =
    [...currentDaily.keys()]
      .filter((d) => (currentDaily.get(d)?.sales ?? 0) > 0)
      .sort((a, b) => b - a)[0] ?? 0

  let prevCumAtLatest = 0
  for (let d = 1; d <= latestDay; d++) {
    prevCumAtLatest += prevYearDaily.get(toDateKeyFromParts(year, month, d))?.sales ?? 0
  }

  const latestCurrentCum =
    latestDay > 0 ? (allData.find((d) => d.day === latestDay)?.currentCum ?? 0) : 0
  const yoyRatio = prevCumAtLatest > 0 ? latestCurrentCum / prevCumAtLatest : 0
  const yoyDiff = latestCurrentCum - prevCumAtLatest

  return { allData, prevTotal: prevCum, latestCurrentCum, prevCumAtLatest, yoyRatio, yoyDiff }
}

export const PrevYearComparisonChart = memo(function PrevYearComparisonChart({
  currentDaily,
  prevYearDaily,
  daysInMonth,
  year,
  month,
  rangeStart: rangeStartProp,
  rangeEnd: rangeEndProp,
}: Props) {
  const theme = useTheme() as AppTheme
  const fmt = useCurrencyFormatter()
  const rangeStart = rangeStartProp ?? 1
  const rangeEnd = rangeEndProp ?? daysInMonth

  const { allData, prevTotal, latestCurrentCum, prevCumAtLatest, yoyRatio, yoyDiff } = useMemo(
    () => buildCumulativeData(currentDaily, prevYearDaily, year, month, daysInMonth),
    [currentDaily, prevYearDaily, year, month, daysInMonth],
  )

  const data = useMemo(
    () => allData.filter((d) => d.day >= rangeStart && d.day <= rangeEnd),
    [allData, rangeStart, rangeEnd],
  )

  const option = useMemo<EChartsOption>(() => {
    const days = data.map((d) => String(d.day))
    const series: EChartsOption['series'] = [
      {
        name: '比較期累計',
        type: 'line',
        data: data.map((d) => d.prevYearCum),
        ...lineDefaults({ color: theme.chart.previousYear, width: 2, dashed: true }),
        areaStyle: { color: `${theme.chart.previousYear}26` },
        connectNulls: true,
      },
      {
        name: '当期累計',
        type: 'line',
        data: data.map((d) => d.currentCum),
        ...lineDefaults({ color: theme.chart.currentYear, width: 2.5 }),
        areaStyle: { color: `${theme.chart.currentYear}4d` },
      },
    ]
    if (prevTotal > 0) {
      ;(series[1] as Record<string, unknown>).markLine = {
        data: [
          {
            yAxis: prevTotal,
            label: {
              formatter: `比較期月間 ${fmt(prevTotal)}`,
              position: 'end',
              fontSize: chartFontSize.annotation,
            },
          },
        ],
        lineStyle: { color: theme.chart.previousYear, type: 'dashed', width: 1.5 },
        symbol: 'none',
      }
    }
    return {
      grid: standardGrid(),
      tooltip: {
        ...standardTooltip(theme),
        formatter: (params: unknown) => {
          const items = params as { name: string; seriesName: string; value: number | null }[]
          if (!Array.isArray(items)) return ''
          const header = `<div style="font-weight:600">${items[0]?.name}日</div>`
          const rows = items
            .filter((i) => i.value != null)
            .map((i) => `<div>${i.seriesName}: ${toCommaYen(i.value!)}</div>`)
            .join('')
          return header + rows
        },
      },
      legend: standardLegend(theme),
      xAxis: categoryXAxis(days, theme),
      yAxis: yenYAxis(theme),
      series,
    }
  }, [data, prevTotal, fmt, theme])

  const hasSummary = latestCurrentCum > 0 && prevCumAtLatest > 0
  const yoyColor = yoyRatio >= 1.0 ? theme.chart.barPositive : theme.chart.barNegative

  return (
    <ChartCard title="当期 vs 比較期（累計売上推移）">
      {hasSummary && (
        <SummaryRow>
          <Metric>
            <MetricLabel>当期累計</MetricLabel>
            <MetricValue>{fmt(latestCurrentCum)}円</MetricValue>
          </Metric>
          <ProgressBarWrap>
            <ProgressLabel>
              <span>比較期比 {toPct(yoyRatio)}</span>
              <span>
                {yoyDiff >= 0 ? '+' : ''}
                {fmt(yoyDiff)}円
              </span>
            </ProgressLabel>
            <ProgressTrack>
              <ProgressFill $pct={yoyRatio * 100} $color={yoyColor} />
            </ProgressTrack>
          </ProgressBarWrap>
          <Metric>
            <MetricLabel>比較期同時点</MetricLabel>
            <MetricValue $color={theme.chart.previousYear}>{fmt(prevCumAtLatest)}円</MetricValue>
          </Metric>
        </SummaryRow>
      )}

      <EChart option={option} height={280} ariaLabel="期間比較チャート" />
    </ChartCard>
  )
})
