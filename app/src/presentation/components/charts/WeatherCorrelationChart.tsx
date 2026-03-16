/**
 * 天気-売上 相関チャート
 *
 * 売上・気温・降水量の正規化タイムラインと、
 * ペアワイズ相関係数のサマリカードを表示する。
 */
import { memo } from 'react'
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from './SafeResponsiveContainer'
import type { DailyWeatherSummary } from '@/domain/models'
import type { DailySalesForCorrelation } from '@/application/hooks/useWeatherCorrelation'
import { useWeatherCorrelation } from '@/application/hooks/useWeatherCorrelation'
import { buildTimelineData, getCorrelationStrength } from './WeatherCorrelationChart.vm'
import {
  Wrapper,
  Title,
  CorrelationGrid,
  CorrelationCard,
  CorrelationLabel,
  CorrelationValue,
  ChartContainer,
  NoDataMessage,
} from './WeatherCorrelationChart.styles'
import { useChartTheme } from './chartTheme'
import { createChartTooltip } from './createChartTooltip'
import { palette } from '@/presentation/theme/tokens'
import type { CorrelationResult } from '@/application/hooks/useWeatherCorrelation'

interface Props {
  readonly weatherDaily: readonly DailyWeatherSummary[]
  readonly salesDaily: readonly DailySalesForCorrelation[]
}

const COLORS = {
  sales: palette.primary,
  temperature: '#ef4444', // red
  precipitation: '#3b82f6', // blue
} as const

function CorrelationSummaryCard({
  label,
  result,
}: {
  readonly label: string
  readonly result: CorrelationResult
}) {
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
}: Props) {
  const correlation = useWeatherCorrelation(weatherDaily, salesDaily)
  const timelineData = buildTimelineData(weatherDaily, salesDaily)
  const ct = useChartTheme()
  const chartMargin = { top: 20, right: 20, left: 20, bottom: 5 }

  if (!correlation) {
    return (
      <Wrapper>
        <Title>天気-売上 相関分析</Title>
        <NoDataMessage>天気データまたは売上データが不足しています</NoDataMessage>
      </Wrapper>
    )
  }

  return (
    <Wrapper>
      <Title>天気-売上 相関分析（n={correlation.dataPoints}）</Title>

      <CorrelationGrid>
        <CorrelationSummaryCard label="売上 × 気温" result={correlation.salesVsTemperature} />
        <CorrelationSummaryCard label="売上 × 降水量" result={correlation.salesVsPrecipitation} />
        <CorrelationSummaryCard label="客数 × 気温" result={correlation.customersVsTemperature} />
        <CorrelationSummaryCard
          label="客数 × 降水量"
          result={correlation.customersVsPrecipitation}
        />
      </CorrelationGrid>

      <ChartContainer>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={timelineData as unknown[]} margin={chartMargin}>
            <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10, fill: ct.text }}
              tickLine={false}
              axisLine={{ stroke: ct.grid }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: ct.text }}
              tickLine={false}
              axisLine={false}
              label={{
                value: '正規化 (0-100)',
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 10, fill: ct.text },
              }}
            />
            <Tooltip content={createChartTooltip({ ct, formatter: tooltipFormatter })} />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              formatter={(value: string) => <span style={{ color: ct.text }}>{value}</span>}
            />
            <Line
              type="monotone"
              dataKey="salesNorm"
              name="売上"
              stroke={COLORS.sales}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="tempNorm"
              name="気温"
              stroke={COLORS.temperature}
              strokeWidth={1.5}
              dot={false}
              strokeDasharray="4 2"
              connectNulls
            />
            <Bar
              dataKey="precipNorm"
              name="降水量"
              fill={COLORS.precipitation}
              opacity={0.3}
              barSize={8}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartContainer>
    </Wrapper>
  )
})

function tooltipFormatter(value: unknown, name: string): readonly [string, string] {
  return [`${Math.round(Number(value))}`, name]
}
