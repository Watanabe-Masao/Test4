import { useMemo, useState, memo } from 'react'
import {
  ComposedChart,
  Scatter,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import styled from 'styled-components'
import { useChartTheme, tooltipStyle, toComma, toManYen, toPct } from './chartTheme'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import {
  linearRegression,
  calculateWMA,
  calculateMonthEndProjection,
  calculateStdDev,
} from '@/application/hooks/useStatistics'
import { safeDivide } from '@/domain/calculations/utils'
import type { StoreResult } from '@/domain/models'
import { ChartHelpButton } from './ChartHeader'
import { CHART_GUIDES } from './chartGuides'

const Wrapper = styled.div`
  width: 100%;
  height: 520px;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[4]}
    ${({ theme }) => theme.spacing[4]};
`

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  padding: 0 ${({ theme }) => theme.spacing[4]};
`

const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
`

const StatRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: 0 ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
`

const StatBadge = styled.div<{ $color: string }>`
  font-size: 0.6rem;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ $color }) => $color}15;
  color: ${({ $color }) => $color};
  border: 1px solid ${({ $color }) => $color}30;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  white-space: nowrap;
`

const ViewToggle = styled.div`
  display: flex;
  gap: 2px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 2px;
`

const ViewBtn = styled.button<{ $active?: boolean }>`
  all: unset;
  cursor: pointer;
  font-size: 0.65rem;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.white : theme.colors.text3)};
  background: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : 'transparent')};
  transition: all 0.15s;
  white-space: nowrap;
  &:hover {
    opacity: 0.85;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`

const ProjectionTable = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: 0 ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
`

const ProjectionCard = styled.div<{ $highlight?: boolean }>`
  font-size: 0.6rem;
  padding: 4px 8px;
  background: ${({ $highlight, theme }) =>
    $highlight ? 'rgba(99,102,241,0.1)' : theme.colors.bg2};
  border: 1px solid ${({ $highlight }) => ($highlight ? 'rgba(99,102,241,0.3)' : 'transparent')};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text2};
`

type ViewMode = 'regression' | 'residual'

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
  const ct = useChartTheme()
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

    // チャートデータ作成
    const wmaMap = new Map(wma.map((w) => [w.day, w.wma]))
    const data: {
      day: number
      sales: number
      regression: number
      wma: number | null
      residual: number
      ciUpper: number
      ciLower: number
    }[] = []

    const { stdDev } = salesValues.length > 0 ? calculateStdDev(salesValues) : { stdDev: 0 }
    const z95 = 1.96
    const se = safeDivide(stdDev, Math.sqrt(salesValues.length), stdDev)

    for (const [day, rec] of result.daily) {
      const sales = rec.sales
      if (sales <= 0) continue
      const regVal = regResult.slope * day + regResult.intercept
      const wmaVal = wmaMap.get(day) ?? null

      data.push({
        day,
        sales,
        regression: regVal,
        wma: wmaVal,
        residual: sales - regVal,
        ciUpper: regVal + z95 * se,
        ciLower: Math.max(0, regVal - z95 * se),
      })
    }
    data.sort((a, b) => a.day - b.day)

    // 統計情報
    const rSquaredPct = toPct(regResult.rSquared)
    const dailyTrend = regResult.slope
    const avgSales =
      salesValues.length > 0 ? salesValues.reduce((s, v) => s + v, 0) / salesValues.length : 0

    return {
      chartData: data,
      reg: regResult,
      // wma used via wmaMap above
      projection: proj,
      stats: { rSquaredPct, dailyTrend, stdDev, avgSales },
    }
  }, [result, year, month])

  if (chartData.length < 2) {
    return (
      <Wrapper aria-label="回帰分析チャート">
        <HeaderRow>
          <Title>
            回帰分析インサイト
            <ChartHelpButton guide={CHART_GUIDES['regression-insight']} />
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
          データが不足しています（最低2日分必要）
        </div>
      </Wrapper>
    )
  }

  const rColor = reg.rSquared >= 0.7 ? sc.positive : reg.rSquared >= 0.4 ? sc.caution : sc.negative
  const trendLabel = reg.slope > 0 ? '上昇' : reg.slope < 0 ? '下降' : '横ばい'

  return (
    <Wrapper aria-label="回帰分析チャート">
      <HeaderRow>
        <Title>
          回帰分析インサイト — 予測の信頼性と手法比較
          <ChartHelpButton guide={CHART_GUIDES['regression-insight']} />
        </Title>
        <ViewToggle>
          <ViewBtn $active={viewMode === 'regression'} onClick={() => setViewMode('regression')}>
            回帰+信頼区間
          </ViewBtn>
          <ViewBtn $active={viewMode === 'residual'} onClick={() => setViewMode('residual')}>
            残差プロット
          </ViewBtn>
        </ViewToggle>
      </HeaderRow>

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

      <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="72%">
        <ComposedChart data={chartData} margin={{ top: 8, right: 20, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="day"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={{ stroke: ct.grid }}
            tickLine={false}
            tickFormatter={(v: number) => `${v}日`}
          />

          {viewMode === 'regression' ? (
            <>
              <YAxis
                tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
                axisLine={false}
                tickLine={false}
                width={55}
                tickFormatter={(v: number) => toManYen(v)}
              />
              <Tooltip
                contentStyle={tooltipStyle(ct)}
                formatter={(value, name) => [toComma(Math.round(value as number)) + '円', name]}
                labelFormatter={(label) => `${label}日`}
              />

              {/* 95% 信頼区間バンド */}
              <Area
                type="monotone"
                dataKey="ciUpper"
                stroke="none"
                fill={ct.colors.primary}
                fillOpacity={0.08}
                name="信頼上限"
                legendType="none"
              />
              <Area
                type="monotone"
                dataKey="ciLower"
                stroke="none"
                fill={ct.bg3}
                fillOpacity={1}
                name="信頼下限"
                legendType="none"
              />

              {/* 回帰直線 */}
              <Line
                type="monotone"
                dataKey="regression"
                name="回帰直線"
                stroke={ct.colors.primary}
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={false}
              />

              {/* WMA */}
              <Line
                type="monotone"
                dataKey="wma"
                name="加重移動平均"
                stroke={ct.colors.orange}
                strokeWidth={1.5}
                dot={false}
              />

              {/* 実績散布図 */}
              <Scatter
                dataKey="sales"
                name="日別売上"
                fill={ct.colors.success}
                fillOpacity={0.7}
                shape="circle"
              />

              <Legend wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }} />
            </>
          ) : (
            <>
              <YAxis
                tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
                axisLine={false}
                tickLine={false}
                width={55}
                tickFormatter={(v: number) => toManYen(v)}
                label={{
                  value: '残差（実績-回帰値）',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 10,
                  fontSize: ct.fontSize.xs,
                  fill: ct.textMuted,
                }}
              />
              <Tooltip
                contentStyle={tooltipStyle(ct)}
                formatter={(value, name) => [toComma(Math.round(value as number)) + '円', name]}
                labelFormatter={(label) => `${label}日`}
              />

              <ReferenceLine y={0} stroke={ct.colors.slate} strokeDasharray="6 4" />
              <ReferenceLine
                y={stats.stdDev}
                stroke={ct.colors.warning}
                strokeDasharray="3 3"
                strokeOpacity={0.5}
                label={{ value: '+1σ', fontSize: 8, fill: ct.textMuted }}
              />
              <ReferenceLine
                y={-stats.stdDev}
                stroke={ct.colors.warning}
                strokeDasharray="3 3"
                strokeOpacity={0.5}
                label={{ value: '-1σ', fontSize: 8, fill: ct.textMuted }}
              />
              <ReferenceLine
                y={stats.stdDev * 2}
                stroke={ct.colors.danger}
                strokeDasharray="3 3"
                strokeOpacity={0.3}
                label={{ value: '+2σ', fontSize: 8, fill: ct.textMuted }}
              />
              <ReferenceLine
                y={-stats.stdDev * 2}
                stroke={ct.colors.danger}
                strokeDasharray="3 3"
                strokeOpacity={0.3}
                label={{ value: '-2σ', fontSize: 8, fill: ct.textMuted }}
              />

              <Scatter
                dataKey="residual"
                name="残差"
                fill={ct.colors.info}
                fillOpacity={0.7}
                shape="circle"
              />

              <Legend wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }} />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </Wrapper>
  )
})
