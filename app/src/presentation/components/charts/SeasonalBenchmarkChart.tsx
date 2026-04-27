/**
 * 季節性ベンチマークチャート (ECharts)
 * @responsibility R:unclassified
 */
import { useMemo, memo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { sc } from '@/presentation/theme/semanticColors'
import type { MonthlyDataPoint } from '@/application/hooks/useStatistics'
import { buildSeasonalBenchmark } from './SeasonalBenchmarkChart.builders'
import { chartFontSize } from '@/presentation/theme/tokens'
import { CHART_GUIDES } from './chartGuides'
import { ChartCard } from './ChartCard'
import { ChartEmpty } from './ChartState'
import { EChart, type EChartsOption } from './EChart'
import { standardGrid, standardTooltip, categoryXAxis, valueYAxis, barDefaults } from './builders'
import { InfoRow, InfoBadge, TrendBadge } from './SeasonalBenchmarkChart.styles'

const MONTH_LABELS = [
  '1月',
  '2月',
  '3月',
  '4月',
  '5月',
  '6月',
  '7月',
  '8月',
  '9月',
  '10月',
  '11月',
  '12月',
] as const

interface Props {
  monthlyData: readonly MonthlyDataPoint[]
  currentMonth: number
}

export const SeasonalBenchmarkChart = memo(function SeasonalBenchmarkChart({
  monthlyData,
  currentMonth,
}: Props) {
  const theme = useTheme() as AppTheme

  const { chartData, trend, currentSeasonality, peakMonth, troughMonth } = useMemo(
    () => buildSeasonalBenchmark(monthlyData, currentMonth, MONTH_LABELS),
    [monthlyData, currentMonth],
  )

  const option = useMemo<EChartsOption>(() => {
    const months = chartData.map((d) => d.month)
    return {
      grid: standardGrid(),
      tooltip: {
        ...standardTooltip(theme),
        formatter: (params: unknown) => {
          const p = params as { name: string; value: number }[]
          if (!Array.isArray(p) || !p[0]) return ''
          const v = p[0].value
          return `${p[0].name}<br/>季節性指数: ${Math.round(v * 100)}（${v > 1 ? '繁忙' : v < 1 ? '閑散' : '平常'}）`
        },
      },
      xAxis: categoryXAxis(months, theme),
      yAxis: {
        ...valueYAxis(theme, {
          formatter: (v: number) => String(Math.round(v * 100)),
        }),
        name: '季節性指数',
        nameLocation: 'middle',
        nameGap: 35,
      },
      series: [
        {
          type: 'bar',
          data: chartData.map((d) => ({
            value: d.seasonality,
            itemStyle: {
              color: d.isCurrent
                ? theme.colors.palette.primary
                : d.seasonality > 1.1
                  ? sc.positive
                  : d.seasonality < 0.9
                    ? sc.negative
                    : theme.colors.palette.slate,
              opacity: d.isCurrent ? 0.9 : 0.6,
              borderColor: d.isCurrent ? theme.colors.palette.primary : undefined,
              borderWidth: d.isCurrent ? 2 : 0,
              borderRadius: [4, 4, 0, 0],
            },
          })),
          ...barDefaults({ color: theme.colors.palette.primary }),
          barMaxWidth: 40,
          markLine: {
            data: [
              {
                yAxis: 1,
                label: { formatter: '平均=100', fontSize: chartFontSize.annotation },
                lineStyle: { color: theme.colors.palette.slate, type: 'dashed', opacity: 0.8 },
              },
              {
                yAxis: 1.1,
                lineStyle: { color: sc.positive, type: 'dashed', opacity: 0.3 },
                label: { show: false },
              },
              {
                yAxis: 0.9,
                lineStyle: { color: sc.negative, type: 'dashed', opacity: 0.3 },
                label: { show: false },
              },
            ],
            symbol: 'none',
          },
        },
      ],
    }
  }, [chartData, theme])

  if (monthlyData.length === 0) {
    return (
      <ChartCard title="季節性ベンチマーク" guide={CHART_GUIDES['seasonal-benchmark']}>
        <ChartEmpty message="過去月データがありません" />
      </ChartCard>
    )
  }

  const seasonLabel =
    currentSeasonality > 1.1 ? '繁忙期' : currentSeasonality < 0.9 ? '閑散期' : '平常期'
  const seasonColor =
    currentSeasonality > 1.1
      ? sc.positive
      : currentSeasonality < 0.9
        ? sc.negative
        : theme.colors.palette.primary
  const trendLabel =
    trend?.overallTrend === 'up'
      ? '上昇トレンド'
      : trend?.overallTrend === 'down'
        ? '下降トレンド'
        : '横ばい'

  return (
    <ChartCard
      title="季節性ベンチマーク — 月別売上パターン"
      guide={CHART_GUIDES['seasonal-benchmark']}
    >
      <InfoRow>
        <InfoBadge $color={seasonColor}>
          {currentMonth}月: {seasonLabel}（指数 {Math.round(currentSeasonality * 100)}）
        </InfoBadge>
        <InfoBadge $color={sc.positive}>
          ピーク: {peakMonth}月（指数 {Math.round((trend?.seasonalIndex[peakMonth - 1] ?? 1) * 100)}
          ）
        </InfoBadge>
        <InfoBadge $color={sc.negative}>
          谷: {troughMonth}月（指数 {Math.round((trend?.seasonalIndex[troughMonth - 1] ?? 1) * 100)}
          ）
        </InfoBadge>
        <TrendBadge $trend={trend?.overallTrend ?? 'stable'}>全体: {trendLabel}</TrendBadge>
        <InfoBadge $color={theme.colors.palette.purpleDark}>
          データ: {monthlyData.length}ヶ月分
        </InfoBadge>
      </InfoRow>

      <EChart option={option} height={280} ariaLabel="季節性ベンチマークチャート" />
    </ChartCard>
  )
})
