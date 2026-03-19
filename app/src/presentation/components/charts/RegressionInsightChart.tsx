/**
 * 回帰分析インサイトチャート (ECharts)
 */
import { useMemo, useState, memo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { toComma, toManYen, toPct } from './chartTheme'
import { sc } from '@/presentation/theme/semanticColors'
import { chartFontSize, palette } from '@/presentation/theme/tokens'
import {
  linearRegression,
  calculateWMA,
  calculateMonthEndProjection,
  calculateStdDev,
} from '@/application/hooks/useStatistics'
import { safeDivide } from '@/domain/calculations/utils'
import type { StoreResult } from '@/domain/models'
import { CHART_GUIDES } from './chartGuides'
import { SegmentedControl } from '@/presentation/components/common'
import { ChartCard } from './ChartCard'
import { ChartEmpty } from './ChartState'
import { EChart, type EChartsOption } from './EChart'
import { standardGrid, standardTooltip, standardLegend } from './echartsOptionBuilders'
import { valueYAxis } from './builders'
import {
  StatRow,
  StatBadge,
  ProjectionTable,
  ProjectionCard,
} from './RegressionInsightChart.styles'

type ViewMode = 'regression' | 'residual'

const VIEW_OPTIONS: readonly { value: ViewMode; label: string }[] = [
  { value: 'regression', label: '回帰+信頼区間' },
  { value: 'residual', label: '残差プロット' },
]

interface Props {
  result: StoreResult
  year: number
  month: number
}

export const RegressionInsightChart = memo(function RegressionInsightChart({
  result,
  year,
  month,
}: Props) {
  const theme = useTheme() as AppTheme
  const [viewMode, setViewMode] = useState<ViewMode>('regression')

  const { chartData, reg, projection, stats } = useMemo(() => {
    const dailySalesMap = new Map<number, number>()
    const salesValues: number[] = []
    for (const [day, rec] of result.daily) {
      if (rec.sales > 0) {
        dailySalesMap.set(day, rec.sales)
        salesValues.push(rec.sales)
      }
    }
    const regResult = linearRegression(dailySalesMap)
    const wma = calculateWMA(dailySalesMap)
    const proj = calculateMonthEndProjection(year, month, dailySalesMap)

    const wmaMap = new Map(wma.map((w) => [w.day, w.wma]))
    const { stdDev } = salesValues.length > 0 ? calculateStdDev(salesValues) : { stdDev: 0 }
    const z95 = 1.96
    const se = safeDivide(stdDev, Math.sqrt(salesValues.length), stdDev)

    const data: {
      day: number
      sales: number
      regression: number
      wma: number | null
      residual: number
      ciUpper: number
      ciLower: number
    }[] = []
    for (const [day, rec] of result.daily) {
      if (rec.sales <= 0) continue
      const regVal = regResult.slope * day + regResult.intercept
      data.push({
        day,
        sales: rec.sales,
        regression: regVal,
        wma: wmaMap.get(day) ?? null,
        residual: rec.sales - regVal,
        ciUpper: regVal + z95 * se,
        ciLower: Math.max(0, regVal - z95 * se),
      })
    }
    data.sort((a, b) => a.day - b.day)

    return {
      chartData: data,
      reg: regResult,
      projection: proj,
      stats: {
        rSquaredPct: toPct(regResult.rSquared),
        dailyTrend: regResult.slope,
        stdDev,
        avgSales:
          salesValues.length > 0 ? salesValues.reduce((s, v) => s + v, 0) / salesValues.length : 0,
      },
    }
  }, [result, year, month])

  const option = useMemo<EChartsOption>(() => {
    const days = chartData.map((d) => String(d.day))

    if (viewMode === 'regression') {
      return {
        grid: standardGrid(),
        tooltip: {
          ...standardTooltip(theme),
          formatter: (params: unknown) => {
            const items = params as { seriesName: string; value: number | null; name: string }[]
            if (!Array.isArray(items)) return ''
            const header = `<div style="font-weight:600">${items[0]?.name}日</div>`
            return (
              header +
              items
                .filter((i) => i.value != null)
                .map(
                  (i) => `<div>${i.seriesName}: ${toComma(Math.round(i.value as number))}円</div>`,
                )
                .join('')
            )
          },
        },
        legend: standardLegend(theme),
        xAxis: {
          type: 'category',
          data: days,
          axisLabel: {
            color: theme.colors.text3,
            fontSize: chartFontSize.axis,
            fontFamily: theme.typography.fontFamily.mono,
            formatter: (v: string) => `${v}日`,
          },
          axisLine: { lineStyle: { color: theme.colors.border } },
          axisTick: { lineStyle: { color: theme.colors.border } },
        },
        yAxis: valueYAxis(theme, { formatter: (v: number) => toManYen(v) }),
        series: [
          {
            name: '信頼上限',
            type: 'line',
            data: chartData.map((d) => d.ciUpper),
            lineStyle: { opacity: 0 },
            areaStyle: { color: `${theme.colors.palette.primary}14` },
            symbol: 'none',
            stack: 'ci',
          },
          {
            name: '信頼下限',
            type: 'line',
            data: chartData.map((d) => d.ciLower),
            lineStyle: { opacity: 0 },
            areaStyle: { color: theme.colors.bg3 },
            symbol: 'none',
            stack: 'ci',
          },
          {
            name: '回帰直線',
            type: 'line',
            data: chartData.map((d) => d.regression),
            lineStyle: { color: theme.colors.palette.primary, width: 2, type: 'dashed' },
            itemStyle: { color: theme.colors.palette.primary },
            symbol: 'none',
          },
          {
            name: '加重移動平均',
            type: 'line',
            data: chartData.map((d) => d.wma),
            lineStyle: { color: theme.colors.palette.orange, width: 1.5 },
            itemStyle: { color: theme.colors.palette.orange },
            symbol: 'none',
          },
          {
            name: '日別売上',
            type: 'scatter',
            data: chartData.map((d) => d.sales),
            itemStyle: { color: theme.chart.barPositive, opacity: 0.7 },
            symbolSize: 6,
          },
        ],
      }
    }

    // Residual view
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
          formatter: (v: string) => `${v}日`,
        },
        axisLine: { lineStyle: { color: theme.colors.border } },
        axisTick: { lineStyle: { color: theme.colors.border } },
      },
      yAxis: valueYAxis(theme, {
        formatter: (v: number) => toManYen(v),
      }),
      series: [
        {
          name: '残差',
          type: 'scatter',
          data: chartData.map((d) => d.residual),
          itemStyle: { color: theme.colors.palette.infoDark, opacity: 0.7 },
          symbolSize: 6,
          markLine: {
            data: [
              { yAxis: 0, lineStyle: { color: theme.colors.palette.slate, type: 'dashed' } },
              {
                yAxis: stats.stdDev,
                label: { formatter: '+1σ', fontSize: chartFontSize.annotation },
                lineStyle: {
                  color: theme.colors.palette.warningDark,
                  type: 'dashed',
                  opacity: 0.5,
                },
              },
              {
                yAxis: -stats.stdDev,
                label: { formatter: '-1σ', fontSize: chartFontSize.annotation },
                lineStyle: {
                  color: theme.colors.palette.warningDark,
                  type: 'dashed',
                  opacity: 0.5,
                },
              },
              {
                yAxis: stats.stdDev * 2,
                label: { formatter: '+2σ', fontSize: chartFontSize.annotation },
                lineStyle: { color: theme.colors.palette.dangerDark, type: 'dashed', opacity: 0.3 },
              },
              {
                yAxis: -stats.stdDev * 2,
                label: { formatter: '-2σ', fontSize: chartFontSize.annotation },
                lineStyle: { color: theme.colors.palette.dangerDark, type: 'dashed', opacity: 0.3 },
              },
            ],
            symbol: 'none',
          },
        },
      ],
    }
  }, [chartData, viewMode, stats, theme])

  if (chartData.length < 2) {
    return (
      <ChartCard title="回帰分析インサイト" guide={CHART_GUIDES['regression-insight']}>
        <ChartEmpty message="データが不足しています（最低2日分必要）" />
      </ChartCard>
    )
  }

  const rColor = reg.rSquared >= 0.7 ? sc.positive : reg.rSquared >= 0.4 ? sc.caution : sc.negative
  const trendLabel = reg.slope > 0 ? '上昇' : reg.slope < 0 ? '下降' : '横ばい'
  const toolbar = (
    <SegmentedControl
      options={VIEW_OPTIONS}
      value={viewMode}
      onChange={setViewMode}
      ariaLabel="表示モード"
    />
  )

  return (
    <ChartCard
      title="回帰分析インサイト — 予測の信頼性と手法比較"
      guide={CHART_GUIDES['regression-insight']}
      toolbar={toolbar}
    >
      <StatRow>
        <StatBadge $color={rColor}>R² = {stats.rSquaredPct}（予測の説明力）</StatBadge>
        <StatBadge $color={sc.cond(reg.slope >= 0)}>
          日次トレンド: {trendLabel} {toComma(Math.round(stats.dailyTrend))}円/日
        </StatBadge>
        <StatBadge $color={palette.primary}>日平均売上: {toManYen(stats.avgSales)}</StatBadge>
        <StatBadge $color={palette.purpleDark}>標準偏差: {toManYen(stats.stdDev)}</StatBadge>
      </StatRow>

      <ProjectionTable>
        <ProjectionCard>単純平均: {toManYen(projection.linearProjection)}</ProjectionCard>
        <ProjectionCard>曜日調整: {toManYen(projection.dowAdjustedProjection)}</ProjectionCard>
        <ProjectionCard>WMA: {toManYen(projection.wmaProjection)}</ProjectionCard>
        <ProjectionCard $highlight>
          回帰: {toManYen(projection.regressionProjection)}
        </ProjectionCard>
        <ProjectionCard>
          95%CI: {toManYen(projection.confidenceInterval.lower)}〜
          {toManYen(projection.confidenceInterval.upper)}
        </ProjectionCard>
      </ProjectionTable>

      <EChart option={option} height={260} ariaLabel="回帰分析チャート" />
    </ChartCard>
  )
})
