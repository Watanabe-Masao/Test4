import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import styled from 'styled-components'
import { useChartTheme, tooltipStyle, toManYen, toComma } from './chartTheme'

const Wrapper = styled.div`
  width: 100%;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[4]};
`

const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  padding-left: ${({ theme }) => theme.spacing[4]};
`

const SummaryRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[6]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
`

const Metric = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 80px;
`

const MetricLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
`

const MetricValue = styled.span<{ $color?: string }>`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ $color, theme }) => $color ?? theme.colors.text};
`

const ProgressBarWrap = styled.div`
  flex: 1;
  min-width: 120px;
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const ProgressTrack = styled.div`
  height: 8px;
  background: ${({ theme }) => theme.colors.bg4};
  border-radius: 4px;
  overflow: hidden;
  position: relative;
`

const ProgressFill = styled.div<{ $pct: number; $color: string }>`
  height: 100%;
  width: ${({ $pct }) => Math.min($pct, 100)}%;
  background: ${({ $color }) => $color};
  border-radius: 4px;
  transition: width 0.6s ease;
`

const ProgressLabel = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text3};
`

const ChartArea = styled.div`
  width: 100%;
  height: 300px;
`

interface DataPoint {
  day: number
  actualCum: number
  budgetCum: number
  prevYearCum?: number | null
}

interface Props {
  data: readonly DataPoint[]
  budget: number
  showPrevYear?: boolean
  /** 営業日数（着地見込み計算用） */
  salesDays?: number
  /** 月の総日数 */
  daysInMonth?: number
}

export function BudgetVsActualChart({ data, budget, showPrevYear, salesDays, daysInMonth }: Props) {
  const ct = useChartTheme()
  const hasPrevYear = showPrevYear && data.some(d => d.prevYearCum != null && d.prevYearCum > 0)

  // 最新の実績データを取得
  const latestWithSales = [...data].reverse().find(d => d.actualCum > 0)
  const currentActual = latestWithSales?.actualCum ?? 0
  const currentBudgetCum = latestWithSales?.budgetCum ?? 0
  const currentDay = latestWithSales?.day ?? 0

  // 達成率（対予算累計）
  const progressRate = currentBudgetCum > 0 ? currentActual / currentBudgetCum : 0
  // 着地見込み
  const totalDays = daysInMonth ?? data.length
  const effectiveSalesDays = salesDays ?? currentDay
  const avgDaily = effectiveSalesDays > 0 ? currentActual / effectiveSalesDays : 0
  const remainingDays = totalDays - currentDay
  const projected = currentActual + avgDaily * remainingDays
  const projectedAchievement = budget > 0 ? projected / budget : 0

  // 色分け: >=100% 緑, >=90% 黄, <90% 赤
  const getStatusColor = (rate: number) => {
    if (rate >= 1.0) return ct.colors.success
    if (rate >= 0.9) return ct.colors.warning
    return ct.colors.danger
  }

  const paceColor = getStatusColor(progressRate)
  const projColor = getStatusColor(projectedAchievement)

  return (
    <Wrapper>
      <Title>{hasPrevYear ? '予算 vs 実績 vs 前年同曜日（累計推移）' : '予算 vs 実績（累計推移）'}</Title>
      {budget > 0 && currentActual > 0 && (
        <SummaryRow>
          <Metric>
            <MetricLabel>実績累計</MetricLabel>
            <MetricValue>{toManYen(currentActual)}円</MetricValue>
          </Metric>
          <ProgressBarWrap>
            <ProgressLabel>
              <span>予算進捗 {(progressRate * 100).toFixed(1)}%</span>
              <span>{toManYen(currentBudgetCum)}円 / {toManYen(budget)}円</span>
            </ProgressLabel>
            <ProgressTrack>
              <ProgressFill $pct={progressRate * 100} $color={paceColor} />
            </ProgressTrack>
          </ProgressBarWrap>
          <Metric>
            <MetricLabel>着地見込</MetricLabel>
            <MetricValue $color={projColor}>{toManYen(projected)}円 ({(projectedAchievement * 100).toFixed(1)}%)</MetricValue>
          </Metric>
        </SummaryRow>
      )}
      <ChartArea>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={[...data]} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="actualArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ct.colors.success} stopOpacity={0.3} />
                <stop offset="100%" stopColor={ct.colors.success} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="budgetArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ct.colors.info} stopOpacity={0.15} />
                <stop offset="100%" stopColor={ct.colors.info} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="prevYearArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ct.colors.slate} stopOpacity={0.15} />
                <stop offset="100%" stopColor={ct.colors.slate} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
            <XAxis
              dataKey="day"
              tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
              axisLine={{ stroke: ct.grid }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
              axisLine={false}
              tickLine={false}
              tickFormatter={toManYen}
              width={55}
            />
            <Tooltip
              contentStyle={tooltipStyle(ct)}
              formatter={(value, name) => {
                const labels: Record<string, string> = {
                  actualCum: '実績累計',
                  budgetCum: '予算累計',
                  prevYearCum: '前年同曜日累計',
                }
                return [value != null ? toComma(value as number) : '-', labels[name as string] ?? String(name)]
              }}
              labelFormatter={(label) => `${label}日`}
            />
            <Legend
              wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
              formatter={(value) => {
                const labels: Record<string, string> = {
                  actualCum: '実績累計',
                  budgetCum: '予算累計',
                  prevYearCum: '前年同曜日累計',
                }
                return labels[value] ?? value
              }}
            />
            <Area
              type="monotone"
              dataKey="budgetCum"
              stroke={ct.colors.info}
              strokeWidth={2}
              strokeDasharray="6 3"
              fill="url(#budgetArea)"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="actualCum"
              stroke={ct.colors.success}
              strokeWidth={2.5}
              fill="url(#actualArea)"
              dot={false}
              activeDot={{ r: 4, fill: ct.colors.success, stroke: ct.bg2, strokeWidth: 2 }}
            />
            {hasPrevYear && (
              <Area
                type="monotone"
                dataKey="prevYearCum"
                stroke={ct.colors.slate}
                strokeWidth={2}
                strokeDasharray="4 3"
                fill="url(#prevYearArea)"
                dot={false}
                connectNulls
              />
            )}
            {budget > 0 && (
              <ReferenceLine
                y={budget}
                stroke={ct.colors.warning}
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `月間予算 ${toManYen(budget)}`,
                  position: 'right',
                  fill: ct.colors.warning,
                  fontSize: ct.fontSize.xs,
                  fontFamily: ct.monoFamily,
                }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </ChartArea>
    </Wrapper>
  )
}
