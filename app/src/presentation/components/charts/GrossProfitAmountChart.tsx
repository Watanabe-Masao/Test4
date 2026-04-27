/**
 * 粗利額累計推移チャート (ECharts)
 *
 * @migration unify-period-analysis Phase 5 三段構造: data builder
 *   (`buildGpData`) を `GrossProfitAmountChartLogic.ts` に抽出し、
 *   `ChartRenderModel<GpPoint>` 共通契約に揃えた。
 * @responsibility R:unclassified
 */
import { useState, useMemo, memo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { toPct } from '@/presentation/components/charts/chartTheme'

import type { DailyRecord } from '@/domain/models/record'
import { SegmentedControl } from '@/presentation/components/common/layout'
import { ChartCard } from '@/presentation/components/charts/ChartCard'
import { EChart, type EChartsOption } from '@/presentation/components/charts/EChart'
import {
  yenYAxis,
  standardGrid,
  standardTooltip,
  standardLegend,
} from '@/presentation/components/charts/echartsOptionBuilders'
import { categoryXAxis, valueYAxis, lineDefaults } from '@/presentation/components/charts/builders'
import { chartFontSize } from '@/presentation/theme/tokens'
import { buildGpData } from './GrossProfitAmountChartLogic'

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
  rangeStart?: number
  rangeEnd?: number
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
  rangeStart: rangeStartProp,
  rangeEnd: rangeEndProp,
}: Props) {
  const theme = useTheme() as AppTheme
  const [gpView, setGpView] = useState<GpView>('amountRate')
  const rangeStart = rangeStartProp ?? 1
  const rangeEnd = rangeEndProp ?? daysInMonth

  // Phase 5 三段構造: data builder は GrossProfitAmountChartLogic.ts に剥離
  const renderModel = useMemo(
    () => buildGpData(daily, daysInMonth, year, month, prevYearDaily, prevYearCostMap),
    [daily, daysInMonth, year, month, prevYearDaily, prevYearCostMap],
  )
  const allData = renderModel.points
  const data = useMemo(
    () => allData.filter((d) => d.day >= rangeStart && d.day <= rangeEnd),
    [allData, rangeStart, rangeEnd],
  )
  const hasPrevGp = renderModel.flags?.hasComparison === true

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
          ...lineDefaults({ color: theme.colors.palette.primary, width: 2.5 }),
          markLine: {
            data: [
              {
                yAxis: targetRate,
                label: {
                  formatter: `目標 ${toPct(targetRate)}`,
                  position: 'end',
                  fontSize: chartFontSize.annotation,
                },
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
          ...lineDefaults({ color: theme.chart.previousYear, width: 1.5, dashed: true }),
          connectNulls: true,
        })
      }
      return {
        grid: standardGrid(),
        tooltip: standardTooltip(theme),
        legend: standardLegend(theme),
        xAxis: categoryXAxis(days, theme),
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
        ...lineDefaults({ color: theme.colors.palette.primary, width: 2 }),
        symbolSize: 3,
      },
    ]
    if (hasPrevGp) {
      series.push({
        name: '前年粗利率',
        type: 'line',
        yAxisIndex: 1,
        data: data.map((d) => d.prevRate),
        ...lineDefaults({ color: theme.chart.previousYear, width: 1.5, dashed: true }),
        connectNulls: true,
      })
    }

    return {
      grid: standardGrid(),
      tooltip: standardTooltip(theme),
      legend: standardLegend(theme),
      xAxis: categoryXAxis(days, theme),
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
    </ChartCard>
  )
})
