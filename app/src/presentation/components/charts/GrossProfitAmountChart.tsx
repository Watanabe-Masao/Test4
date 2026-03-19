/**
 * 粗利額累計推移チャート (ECharts)
 */
import { useState, useMemo, memo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { toPct } from './chartTheme'
import { DualPeriodSlider } from './DualPeriodSlider'
import { useDualPeriodRange } from './useDualPeriodRange'
import type { DailyRecord } from '@/domain/models'
import { calculateGrossProfitRate } from '@/domain/calculations/utils'
import { toDateKeyFromParts } from '@/domain/models/CalendarDate'
import { SegmentedControl } from '@/presentation/components/common'
import { ChartCard } from './ChartCard'
import { EChart, type EChartsOption } from './EChart'
import { yenYAxis, standardGrid, standardTooltip, standardLegend } from './echartsOptionBuilders'
import { valueYAxis } from './builders'
import { chartFontSize } from '@/presentation/theme/tokens'

type GpView = 'amountRate' | 'rateOnly'

const VIEW_OPTIONS: readonly { value: GpView; label: string }[] = [
  { value: 'amountRate', label: '額+率' },
  { value: 'rateOnly', label: '率のみ' },
]

interface Props {
  daily: ReadonlyMap<number, DailyRecord>
  daysInMonth: number
  grossProfitBudget: number
  targetRate: number
  warningRate?: number
  year: number
  month: number
  prevYearDaily?: ReadonlyMap<string, { sales: number; discount: number; customers?: number }>
  prevYearCostMap?: ReadonlyMap<number, number>
}

function buildGpData(
  daily: ReadonlyMap<number, DailyRecord>,
  daysInMonth: number,
  year: number,
  month: number,
  prevYearDaily?: ReadonlyMap<string, { sales: number }>,
  prevYearCostMap?: ReadonlyMap<number, number>,
) {
  let cumSales = 0,
    cumCost = 0,
    prevCumSales = 0,
    prevCumCost = 0
  const hasPrevGp = !!prevYearDaily && !!prevYearCostMap
  const allData: { day: number; grossProfit: number; rate: number; prevRate: number | null }[] = []

  for (let d = 1; d <= daysInMonth; d++) {
    const rec = daily.get(d)
    if (rec) {
      cumSales += rec.sales
      cumCost += rec.totalCost
    }
    const grossProfit = cumSales - cumCost
    const rate = calculateGrossProfitRate(grossProfit, cumSales)

    let prevRate: number | null = null
    if (hasPrevGp) {
      prevCumSales += prevYearDaily!.get(toDateKeyFromParts(year, month, d))?.sales ?? 0
      prevCumCost += prevYearCostMap!.get(d) ?? 0
      prevRate =
        prevCumSales > 0 ? calculateGrossProfitRate(prevCumSales - prevCumCost, prevCumSales) : null
    }
    allData.push({ day: d, grossProfit, rate, prevRate })
  }
  return allData
}

export const GrossProfitAmountChart = memo(function GrossProfitAmountChart({
  daily,
  daysInMonth,
  targetRate,
  warningRate,
  year,
  month,
  prevYearDaily,
  prevYearCostMap,
}: Props) {
  const theme = useTheme() as AppTheme
  const [gpView, setGpView] = useState<GpView>('amountRate')
  const {
    p1Start: rangeStart,
    p1End: rangeEnd,
    onP1Change: setRange,
    p2Start,
    p2End,
    onP2Change,
    p2Enabled,
  } = useDualPeriodRange(daysInMonth)

  const allData = useMemo(
    () => buildGpData(daily, daysInMonth, year, month, prevYearDaily, prevYearCostMap),
    [daily, daysInMonth, year, month, prevYearDaily, prevYearCostMap],
  )
  const data = useMemo(
    () => allData.filter((d) => d.day >= rangeStart && d.day <= rangeEnd),
    [allData, rangeStart, rangeEnd],
  )
  const hasPrevGp = allData.some((d) => d.prevRate != null)

  const option = useMemo<EChartsOption>(() => {
    const days = data.map((d) => String(d.day))
    const getBarColor = (rate: number) => {
      if (rate >= targetRate) return theme.chart.barPositive
      if (warningRate != null && rate >= warningRate) return theme.colors.palette.warningDark
      return theme.chart.barNegative
    }

    if (gpView === 'rateOnly') {
      const series: EChartsOption['series'] = [
        {
          name: '粗利率',
          type: 'line',
          data: data.map((d) => d.rate),
          lineStyle: { color: theme.colors.palette.primary, width: 2.5 },
          itemStyle: { color: theme.colors.palette.primary },
          symbol: 'none',
          markLine: {
            data: [
              {
                yAxis: targetRate,
                label: { formatter: `目標 ${toPct(targetRate)}`, position: 'end', fontSize: chartFontSize.annotation },
                lineStyle: { color: theme.chart.barPositive, type: 'dashed' },
              },
            ],
            symbol: 'none',
          },
        },
      ]
      if (hasPrevGp) {
        series.push({
          name: '前年粗利率',
          type: 'line',
          data: data.map((d) => d.prevRate),
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
        yAxis: valueYAxis(theme, { formatter: (v: number) => toPct(v) }),
        series,
      }
    }

    // amountRate view
    const series: EChartsOption['series'] = [
      {
        name: '粗利額',
        type: 'bar',
        yAxisIndex: 0,
        data: data.map((d) => ({
          value: d.grossProfit,
          itemStyle: { color: getBarColor(d.rate), opacity: 0.7, borderRadius: [2, 2, 0, 0] },
        })),
        barMaxWidth: 14,
      },
      {
        name: '粗利率',
        type: 'line',
        yAxisIndex: 1,
        data: data.map((d) => d.rate),
        lineStyle: { color: theme.colors.palette.primary, width: 2 },
        itemStyle: { color: theme.colors.palette.primary },
        symbolSize: 3,
      },
    ]
    if (hasPrevGp) {
      series.push({
        name: '前年粗利率',
        type: 'line',
        yAxisIndex: 1,
        data: data.map((d) => d.prevRate),
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
      yAxis: [
        yenYAxis(theme) as Record<string, unknown>,
        valueYAxis(theme, {
          formatter: (v: number) => toPct(v),
          position: 'right',
          showSplitLine: false,
        }) as Record<string, unknown>,
      ],
      series,
    }
  }, [data, gpView, targetRate, warningRate, hasPrevGp, theme])

  const titleText =
    gpView === 'rateOnly'
      ? '粗利率推移（累計ベース）'
      : '粗利額累計推移（バー: 粗利額 / ライン: 粗利率）'
  const toolbar = (
    <SegmentedControl
      options={VIEW_OPTIONS}
      value={gpView}
      onChange={setGpView}
      ariaLabel="表示モード"
    />
  )

  return (
    <ChartCard title={titleText} toolbar={toolbar}>
      <EChart option={option} height={280} ariaLabel="粗利推移チャート" />
      <DualPeriodSlider
        min={1}
        max={daysInMonth}
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
