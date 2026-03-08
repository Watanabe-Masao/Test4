import { useMemo, memo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
} from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import { useChartTheme } from './chartTheme'
import { createChartTooltip } from './createChartTooltip'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import { analyzeTrend } from '@/application/hooks/useStatistics'
import type { MonthlyDataPoint } from '@/application/hooks/useStatistics'
import { ChartHelpButton } from './ChartHeader'
import { CHART_GUIDES } from './chartGuides'
import {
  Wrapper,
  HeaderRow,
  Title,
  InfoRow,
  InfoBadge,
  TrendBadge,
} from './SeasonalBenchmarkChart.styles'

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
  const ct = useChartTheme()

  const { chartData, trend, currentSeasonality, peakMonth, troughMonth } = useMemo(() => {
    const trendResult = analyzeTrend(monthlyData)
    const seasonalIndex = trendResult.seasonalIndex

    const data = MONTH_LABELS.map((label, i) => ({
      month: label,
      monthNum: i + 1,
      seasonality: seasonalIndex[i],
      isCurrent: i + 1 === currentMonth,
    }))

    // ピーク・谷の月を特定
    let peakIdx = 0
    let troughIdx = 0
    for (let i = 0; i < 12; i++) {
      if (seasonalIndex[i] > seasonalIndex[peakIdx]) peakIdx = i
      if (seasonalIndex[i] < seasonalIndex[troughIdx]) troughIdx = i
    }

    return {
      chartData: data,
      trend: trendResult,
      currentSeasonality: seasonalIndex[currentMonth - 1],
      peakMonth: peakIdx + 1,
      troughMonth: troughIdx + 1,
    }
  }, [monthlyData, currentMonth])

  if (monthlyData.length === 0) {
    return (
      <Wrapper aria-label="季節ベンチマークチャート">
        <HeaderRow>
          <Title>
            季節性ベンチマーク
            <ChartHelpButton guide={CHART_GUIDES['seasonal-benchmark']} />
          </Title>
        </HeaderRow>
        <div
          style={{
            padding: '40px',
            textAlign: 'center',
            color: ct.textMuted,
            fontSize: ct.fontSize.sm,
          }}
        >
          過去月データがありません
        </div>
      </Wrapper>
    )
  }

  const seasonLabel =
    currentSeasonality > 1.1 ? '繁忙期' : currentSeasonality < 0.9 ? '閑散期' : '平常期'
  const seasonColor =
    currentSeasonality > 1.1 ? sc.positive : currentSeasonality < 0.9 ? sc.negative : '#6366f1'
  const trendLabel =
    trend.overallTrend === 'up'
      ? '上昇トレンド'
      : trend.overallTrend === 'down'
        ? '下降トレンド'
        : '横ばい'

  return (
    <Wrapper aria-label="季節ベンチマークチャート">
      <HeaderRow>
        <Title>
          季節性ベンチマーク — 月別売上パターン
          <ChartHelpButton guide={CHART_GUIDES['seasonal-benchmark']} />
        </Title>
      </HeaderRow>

      <InfoRow>
        <InfoBadge $color={seasonColor}>
          {currentMonth}月: {seasonLabel}（指数 {Math.round(currentSeasonality * 100)}）
        </InfoBadge>
        <InfoBadge $color={sc.positive}>
          ピーク: {peakMonth}月（指数 {Math.round(trend.seasonalIndex[peakMonth - 1] * 100)}）
        </InfoBadge>
        <InfoBadge $color={sc.negative}>
          谷: {troughMonth}月（指数 {Math.round(trend.seasonalIndex[troughMonth - 1] * 100)}）
        </InfoBadge>
        <TrendBadge $trend={trend.overallTrend}>全体: {trendLabel}</TrendBadge>
        <InfoBadge $color={palette.purpleDark}>データ: {monthlyData.length}ヶ月分</InfoBadge>
      </InfoRow>

      <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="80%">
        <BarChart data={chartData} margin={{ top: 8, right: 20, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="month"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={{ stroke: ct.grid }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={false}
            tickLine={false}
            width={40}
            tickFormatter={(v: number) => String(Math.round(v * 100))}
            label={{
              value: '季節性指数',
              angle: -90,
              position: 'insideLeft',
              offset: 10,
              fontSize: ct.fontSize.xs,
              fill: ct.textMuted,
            }}
          />
          <Tooltip
            content={createChartTooltip({
              ct,
              formatter: (value) => {
                const v = value as number
                return [
                  `指数: ${Math.round(v * 100)}（${v > 1 ? '繁忙' : v < 1 ? '閑散' : '平常'}）`,
                  '季節性',
                ]
              },
            })}
          />
          <Legend wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }} />

          {/* 基準線（100 = 平均） */}
          <ReferenceLine
            y={1}
            stroke={ct.colors.slate}
            strokeDasharray="6 4"
            strokeOpacity={0.8}
            label={{ value: '平均=100', fontSize: 8, fill: ct.textMuted }}
          />
          <ReferenceLine
            y={1.1}
            stroke={ct.colors.success}
            strokeDasharray="3 3"
            strokeOpacity={0.3}
          />
          <ReferenceLine
            y={0.9}
            stroke={ct.colors.danger}
            strokeDasharray="3 3"
            strokeOpacity={0.3}
          />

          <Bar dataKey="seasonality" name="季節性指数" radius={[4, 4, 0, 0]} maxBarSize={40}>
            {chartData.map((entry, i) => (
              <Cell
                key={i}
                fill={
                  entry.isCurrent
                    ? '#6366f1'
                    : entry.seasonality > 1.1
                      ? sc.positive
                      : entry.seasonality < 0.9
                        ? sc.negative
                        : ct.colors.slate
                }
                fillOpacity={entry.isCurrent ? 0.9 : 0.6}
                stroke={entry.isCurrent ? '#6366f1' : 'none'}
                strokeWidth={entry.isCurrent ? 2 : 0}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Wrapper>
  )
})
