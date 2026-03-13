/**
 * 予算トレンドチャート (L2: 説明)
 *
 * 予算 vs 実績の累計推移を3つのビューで表示する。
 * BudgetProgressCard（L1）で判断した内容の根拠を示す。
 *
 * ビュー:
 * - 累計推移（線グラフ）
 * - 予算差異（棒グラフ）
 * - 達成率推移（折れ線）
 */
import { useState, memo } from 'react'
import {
  ComposedChart,
  Line,
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
import { useChartTheme, useCurrencyFormatter, toAxisYen, toComma } from './chartTheme'
import { createChartTooltip } from './createChartTooltip'
import { DualPeriodSlider } from './DualPeriodSlider'
import { useDualPeriodRange } from './useDualPeriodRange'
import { Wrapper, HeaderRow, Title, TabGroup, Tab, ChartArea } from './BudgetTrendChart.styles'

type ViewType = 'line' | 'diff' | 'rate'

const VIEW_LABELS: Record<ViewType, string> = {
  line: '累計推移',
  diff: '差分',
  rate: '達成率',
}

const VIEW_TITLES: Record<ViewType, string> = {
  line: '予算 vs 実績（累計推移）',
  diff: '予算差異（実績 − 予算）',
  rate: '予算達成率推移',
}

interface DataPoint {
  day: number
  actualCum: number
  budgetCum: number
  prevYearCum?: number | null
}

interface Props {
  readonly data: readonly DataPoint[]
  readonly budget: number
  readonly showPrevYear?: boolean
  readonly daysInMonth?: number
  readonly year: number
  readonly month: number
}

const ALL_LABELS: Record<string, string> = {
  actualCum: '実績累計',
  budgetCum: '予算累計',
  prevYearCum: '比較期累計',
  diff: '予算差異',
  achieveRate: '達成率(%)',
}

const VIEWS: ViewType[] = ['line', 'diff', 'rate']

export const BudgetTrendChart = memo(function BudgetTrendChart({
  data,
  budget,
  showPrevYear,
  daysInMonth,
}: Props) {
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()
  const [view, setView] = useState<ViewType>('line')

  const totalDaysForSlider = daysInMonth ?? data.length
  const {
    p1Start: rangeStart,
    p1End: rangeEnd,
    onP1Change: setRange,
    p2Start,
    p2End,
    onP2Change,
    p2Enabled,
  } = useDualPeriodRange(totalDaysForSlider)

  const hasPrevYear = showPrevYear || data.some((d) => d.prevYearCum != null && d.prevYearCum > 0)

  const chartData = [...data]
    .map((d) => ({
      ...d,
      diff: d.actualCum > 0 ? d.actualCum - d.budgetCum : null,
      achieveRate: d.budgetCum > 0 && d.actualCum > 0 ? (d.actualCum / d.budgetCum) * 100 : null,
    }))
    .filter((d) => d.day >= rangeStart && d.day <= rangeEnd)

  return (
    <Wrapper aria-label="予算トレンド">
      <HeaderRow>
        <Title>{VIEW_TITLES[view]}</Title>
        <TabGroup>
          {VIEWS.map((v) => (
            <Tab key={v} $active={view === v} onClick={() => setView(v)}>
              {VIEW_LABELS[v]}
            </Tab>
          ))}
        </TabGroup>
      </HeaderRow>

      <ChartArea>
        <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
            <XAxis
              dataKey="day"
              tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
              axisLine={{ stroke: ct.grid }}
              tickLine={false}
            />

            {view !== 'rate' && (
              <YAxis
                yAxisId="left"
                tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
                axisLine={false}
                tickLine={false}
                tickFormatter={toAxisYen}
                width={55}
              />
            )}

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
              content={createChartTooltip({
                ct,
                formatter: (value, name) => {
                  if (name === 'achieveRate') {
                    return [
                      value != null ? `${(value as number).toFixed(1)}%` : '-',
                      ALL_LABELS[name],
                    ]
                  }
                  return [
                    value != null ? toComma(value as number) : '-',
                    ALL_LABELS[name as string] ?? String(name),
                  ]
                },
                labelFormatter: (label) => `${label}日`,
              })}
            />
            <Legend
              wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
              formatter={(value) => ALL_LABELS[value] ?? value}
            />

            {view === 'line' && (
              <>
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="actualCum"
                  stroke={ct.colors.success}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, fill: ct.colors.success, stroke: ct.bg2, strokeWidth: 2 }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="budgetCum"
                  stroke={ct.colors.info}
                  strokeWidth={2}
                  strokeDasharray="8 4"
                  dot={false}
                />
                {hasPrevYear && (
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="prevYearCum"
                    stroke={ct.colors.slate}
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    dot={false}
                    connectNulls
                  />
                )}
                {budget > 0 && (
                  <ReferenceLine
                    yAxisId="left"
                    y={budget}
                    stroke={ct.colors.warning}
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `月間予算 ${fmt(budget)}`,
                      position: 'right',
                      fill: ct.colors.warning,
                      fontSize: ct.fontSize.xs,
                      fontFamily: ct.monoFamily,
                    }}
                  />
                )}
              </>
            )}

            {view === 'diff' && (
              <>
                <Bar yAxisId="left" dataKey="diff" radius={[2, 2, 0, 0]} maxBarSize={16}>
                  {chartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        entry.diff == null
                          ? 'transparent'
                          : entry.diff >= 0
                            ? ct.colors.success
                            : ct.colors.danger
                      }
                      fillOpacity={0.7}
                    />
                  ))}
                </Bar>
                <ReferenceLine yAxisId="left" y={0} stroke={ct.grid} strokeWidth={1} />
              </>
            )}

            {view === 'rate' && (
              <>
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="achieveRate"
                  stroke={ct.colors.primary}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, fill: ct.colors.primary, stroke: ct.bg2, strokeWidth: 2 }}
                  connectNulls
                />
                <ReferenceLine
                  yAxisId="left"
                  y={100}
                  stroke={ct.colors.success}
                  strokeDasharray="6 3"
                  strokeWidth={1.5}
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
          </ComposedChart>
        </ResponsiveContainer>
      </ChartArea>

      <DualPeriodSlider
        min={1}
        max={totalDaysForSlider}
        p1Start={rangeStart}
        p1End={rangeEnd}
        onP1Change={setRange}
        p2Start={p2Start}
        p2End={p2End}
        onP2Change={onP2Change}
        p2Enabled={p2Enabled}
      />
    </Wrapper>
  )
})
