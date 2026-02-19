import { useState } from 'react'
import {
  ComposedChart,
  Line,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts'
import styled from 'styled-components'
import { useChartTheme, tooltipStyle, toManYen, toComma } from './chartTheme'
import { DayRangeSlider, useDayRange } from './DayRangeSlider'

const Wrapper = styled.div`
  width: 100%;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[4]};
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

const ViewToggle = styled.div`
  display: flex;
  gap: 2px;
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 2px;
`

const ViewBtn = styled.button<{ $active?: boolean }>`
  all: unset;
  cursor: pointer;
  font-size: 0.65rem;
  padding: 3px 8px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ $active, theme }) => $active ? '#fff' : theme.colors.text3};
  background: ${({ $active, theme }) => $active
    ? theme.colors.palette.primary
    : 'transparent'};
  transition: all 0.15s;
  white-space: nowrap;
  &:hover {
    background: ${({ $active, theme }) => $active
      ? theme.colors.palette.primary
      : theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'};
  }
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

type BudgetViewType = 'line' | 'diff' | 'rate' | 'area'

const VIEW_LABELS: Record<BudgetViewType, string> = {
  line: '線グラフ',
  diff: '差分',
  rate: '達成率',
  area: 'エリア',
}

const VIEW_TITLES: Record<BudgetViewType, string> = {
  line: '予算 vs 実績（累計推移）',
  diff: '予算差異（実績 − 予算）',
  rate: '予算達成率推移',
  area: '予算 vs 実績（エリア）',
}

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
  const [view, setView] = useState<BudgetViewType>('line')
  const totalDaysForSlider = daysInMonth ?? data.length
  const [rangeStart, rangeEnd, setRange] = useDayRange(totalDaysForSlider)
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

  // 差分・達成率を含む拡張データ
  const chartData = [...data]
    .map(d => ({
      ...d,
      diff: d.actualCum > 0 ? d.actualCum - d.budgetCum : null,
      achieveRate: d.budgetCum > 0 && d.actualCum > 0 ? (d.actualCum / d.budgetCum) * 100 : null,
    }))
    .filter(d => d.day >= rangeStart && d.day <= rangeEnd)

  const allLabels: Record<string, string> = {
    actualCum: '実績累計',
    budgetCum: '予算累計',
    prevYearCum: '前年同曜日累計',
    diff: '予算差異',
    achieveRate: '達成率(%)',
  }

  return (
    <Wrapper>
      <HeaderRow>
        <Title>{hasPrevYear && view === 'line' ? '予算 vs 実績 vs 前年同曜日（累計推移）' : VIEW_TITLES[view]}</Title>
        <ViewToggle>
          {(Object.keys(VIEW_LABELS) as BudgetViewType[]).map((v) => (
            <ViewBtn key={v} $active={view === v} onClick={() => setView(v)}>
              {VIEW_LABELS[v]}
            </ViewBtn>
          ))}
        </ViewToggle>
      </HeaderRow>
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
        <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="actualAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ct.colors.success} stopOpacity={0.3} />
                <stop offset="100%" stopColor={ct.colors.success} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="budgetAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ct.colors.info} stopOpacity={0.15} />
                <stop offset="100%" stopColor={ct.colors.info} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="prevYearAreaGrad" x1="0" y1="0" x2="0" y2="1">
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

            {/* ── 線グラフ / エリア: 金額Y軸 ── */}
            {(view === 'line' || view === 'area') && (
              <YAxis
                yAxisId="left"
                tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
                axisLine={false}
                tickLine={false}
                tickFormatter={toManYen}
                width={55}
              />
            )}

            {/* ── 差分: 金額Y軸（マイナスあり） ── */}
            {view === 'diff' && (
              <YAxis
                yAxisId="left"
                tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
                axisLine={false}
                tickLine={false}
                tickFormatter={toManYen}
                width={55}
              />
            )}

            {/* ── 達成率: %Y軸 ── */}
            {view === 'rate' && (
              <YAxis
                yAxisId="left"
                tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
                width={50}
                domain={['auto', 'auto']}
              />
            )}

            <Tooltip
              contentStyle={tooltipStyle(ct)}
              formatter={(value, name) => {
                if (name === 'achieveRate') {
                  return [value != null ? `${(value as number).toFixed(1)}%` : '-', allLabels[name]]
                }
                return [value != null ? toComma(value as number) : '-', allLabels[name as string] ?? String(name)]
              }}
              labelFormatter={(label) => `${label}日`}
            />
            <Legend
              wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
              formatter={(value) => allLabels[value] ?? value}
            />

            {/* ── 線グラフ: 塗りなし、太い線で明確に区別 ── */}
            {view === 'line' && (
              <>
                <Line
                  yAxisId="left" type="monotone" dataKey="actualCum"
                  stroke={ct.colors.success} strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, fill: ct.colors.success, stroke: ct.bg2, strokeWidth: 2 }}
                />
                <Line
                  yAxisId="left" type="monotone" dataKey="budgetCum"
                  stroke={ct.colors.info} strokeWidth={2} strokeDasharray="8 4"
                  dot={false}
                />
                {hasPrevYear && (
                  <Line
                    yAxisId="left" type="monotone" dataKey="prevYearCum"
                    stroke={ct.colors.slate} strokeWidth={1.5} strokeDasharray="4 3"
                    dot={false} connectNulls
                  />
                )}
                {budget > 0 && (
                  <ReferenceLine
                    yAxisId="left" y={budget}
                    stroke={ct.colors.warning} strokeDasharray="4 4" strokeWidth={1.5}
                    label={{
                      value: `月間予算 ${toManYen(budget)}`,
                      position: 'right',
                      fill: ct.colors.warning,
                      fontSize: ct.fontSize.xs,
                      fontFamily: ct.monoFamily,
                    }}
                  />
                )}
              </>
            )}

            {/* ── 差分: 予算差異を棒グラフ（+緑 / -赤）── */}
            {view === 'diff' && (
              <>
                <Bar yAxisId="left" dataKey="diff" radius={[2, 2, 0, 0]} maxBarSize={16}>
                  {chartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        entry.diff == null ? 'transparent'
                        : entry.diff >= 0 ? ct.colors.success
                        : ct.colors.danger
                      }
                      fillOpacity={0.7}
                    />
                  ))}
                </Bar>
                <ReferenceLine yAxisId="left" y={0} stroke={ct.grid} strokeWidth={1} />
              </>
            )}

            {/* ── 達成率: 折れ線 + 100%基準線 ── */}
            {view === 'rate' && (
              <>
                <Line
                  yAxisId="left" type="monotone" dataKey="achieveRate"
                  stroke={ct.colors.primary} strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, fill: ct.colors.primary, stroke: ct.bg2, strokeWidth: 2 }}
                  connectNulls
                />
                <ReferenceLine
                  yAxisId="left" y={100}
                  stroke={ct.colors.success} strokeDasharray="6 3" strokeWidth={1.5}
                  label={{
                    value: '100%',
                    position: 'right',
                    fill: ct.colors.success,
                    fontSize: ct.fontSize.xs,
                    fontFamily: ct.monoFamily,
                  }}
                />
              </>
            )}

            {/* ── エリア: 従来のエリアチャート ── */}
            {view === 'area' && (
              <>
                <Area
                  yAxisId="left" type="monotone" dataKey="budgetCum"
                  stroke={ct.colors.info} strokeWidth={2} strokeDasharray="6 3"
                  fill="url(#budgetAreaGrad)" dot={false}
                />
                <Area
                  yAxisId="left" type="monotone" dataKey="actualCum"
                  stroke={ct.colors.success} strokeWidth={2.5}
                  fill="url(#actualAreaGrad)" dot={false}
                  activeDot={{ r: 4, fill: ct.colors.success, stroke: ct.bg2, strokeWidth: 2 }}
                />
                {hasPrevYear && (
                  <Area
                    yAxisId="left" type="monotone" dataKey="prevYearCum"
                    stroke={ct.colors.slate} strokeWidth={2} strokeDasharray="4 3"
                    fill="url(#prevYearAreaGrad)" dot={false} connectNulls
                  />
                )}
                {budget > 0 && (
                  <ReferenceLine
                    yAxisId="left" y={budget}
                    stroke={ct.colors.warning} strokeDasharray="4 4" strokeWidth={1.5}
                    label={{
                      value: `月間予算 ${toManYen(budget)}`,
                      position: 'right',
                      fill: ct.colors.warning,
                      fontSize: ct.fontSize.xs,
                      fontFamily: ct.monoFamily,
                    }}
                  />
                )}
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </ChartArea>
      <DayRangeSlider min={1} max={totalDaysForSlider} start={rangeStart} end={rangeEnd} onChange={setRange} />
    </Wrapper>
  )
}
