/**
 * 天気-売上 相関チャート (ECharts)
 */
import { useMemo, memo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import type { DailyWeatherSummary } from '@/domain/models/record'
import type {
  DailySalesForCorrelation,
  CorrelationResult,
} from '@/application/hooks/useWeatherCorrelation'
import { useWeatherCorrelation } from '@/application/hooks/useWeatherCorrelation'
import { buildTimelineData, getCorrelationStrength } from './WeatherCorrelationChart.vm'
import { ChartCard } from './ChartCard'
import { ChartEmpty } from './ChartState'
import { EChart, type EChartsOption } from './EChart'
import { standardGrid, standardTooltip, standardLegend } from './echartsOptionBuilders'
import { categoryXAxis, valueYAxis, lineDefaults } from './builders'
import {
  CorrelationGrid,
  CorrelationCard,
  CorrelationLabel,
  CorrelationValue,
} from './WeatherCorrelationChart.styles'

interface Props {
  readonly weatherDaily: readonly DailyWeatherSummary[]
  readonly salesDaily: readonly DailySalesForCorrelation[]
  /** サブパネル埋め込み時に ChartCard ラッパーを省略する */
  readonly embedded?: boolean
}

function CorrelationSummaryCard({ label, result }: { label: string; result: CorrelationResult }) {
  const strength = getCorrelationStrength(result.r)
  const sign = result.r >= 0 ? '+' : ''
  return (
    <CorrelationCard $strength={strength}>
      <CorrelationLabel>{label}</CorrelationLabel>
      <CorrelationValue $strength={strength}>
        {sign}
        {result.r.toFixed(3)}
      </CorrelationValue>
    </CorrelationCard>
  )
}

export const WeatherCorrelationChart = memo(function WeatherCorrelationChart({
  weatherDaily,
  salesDaily,
  embedded,
}: Props) {
  const theme = useTheme() as AppTheme
  const correlation = useWeatherCorrelation(weatherDaily, salesDaily)
  const timelineData = buildTimelineData(weatherDaily, salesDaily)

  const option = useMemo<EChartsOption>(() => {
    const days = timelineData.map((d) => String(d.day))
    return {
      grid: standardGrid(),
      tooltip: standardTooltip(theme),
      legend: standardLegend(theme),
      xAxis: categoryXAxis(days, theme),
      yAxis: {
        ...valueYAxis(theme, { min: 0, max: 100 }),
        name: '正規化 (0-100)',
        nameLocation: 'middle',
        nameGap: 40,
      },
      series: [
        {
          name: '売上',
          type: 'line',
          data: timelineData.map((d) => d.salesNorm),
          ...lineDefaults({ color: theme.colors.palette.primary, width: 2 }),
          connectNulls: true,
        },
        {
          name: '気温',
          type: 'line',
          data: timelineData.map((d) => d.tempNorm),
          ...lineDefaults({ color: theme.colors.palette.dangerDark, width: 1.5, dashed: true }),
          connectNulls: true,
        },
        {
          name: '降水量',
          type: 'bar',
          data: timelineData.map((d) => d.precipNorm),
          itemStyle: { color: theme.colors.palette.blueDark, opacity: 0.3 },
          barWidth: 8,
        },
      ],
    }
  }, [timelineData, theme])

  if (!correlation) {
    const empty = <ChartEmpty message="天気データまたは売上データが不足しています" />
    if (embedded) return empty
    return <ChartCard title="天気-売上 相関分析">{empty}</ChartCard>
  }

  const content = (
    <>
      <CorrelationGrid>
        <CorrelationSummaryCard label="売上 × 気温" result={correlation.salesVsTemperature} />
        <CorrelationSummaryCard label="売上 × 降水量" result={correlation.salesVsPrecipitation} />
        <CorrelationSummaryCard label="客数 × 気温" result={correlation.customersVsTemperature} />
        <CorrelationSummaryCard
          label="客数 × 降水量"
          result={correlation.customersVsPrecipitation}
        />
      </CorrelationGrid>

      <EChart option={option} height={220} ariaLabel="天気-売上相関タイムライン" />
    </>
  )

  if (embedded) return content

  return (
    <ChartCard title={`天気-売上 相関分析（n=${correlation.dataPoints}）`}>{content}</ChartCard>
  )
})
