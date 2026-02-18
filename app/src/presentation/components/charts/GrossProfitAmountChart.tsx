import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import styled from 'styled-components'
import { useChartTheme, tooltipStyle, toManYen, toComma, toPct } from './chartTheme'
import { DayRangeSlider, useDayRange } from './DayRangeSlider'
import type { DailyRecord } from '@/domain/models'
import { getDailyTotalCost } from '@/domain/models'

const Wrapper = styled.div`
  width: 100%;
  height: 360px;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[4]};
`

const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  padding-left: ${({ theme }) => theme.spacing[4]};
`

interface Props {
  daily: ReadonlyMap<number, DailyRecord>
  daysInMonth: number
  grossProfitBudget: number
  targetRate: number
}

/** 粗利額累計推移（バー: 粗利額, ライン: 粗利率） */
export function GrossProfitAmountChart({ daily, daysInMonth, grossProfitBudget, targetRate }: Props) {
  const ct = useChartTheme()
  const [rangeStart, rangeEnd, setRange] = useDayRange(daysInMonth)

  let cumSales = 0
  let cumCost = 0

  const allData = []
  for (let d = 1; d <= daysInMonth; d++) {
    const rec = daily.get(d)
    if (rec) {
      cumSales += rec.sales
      cumCost += getDailyTotalCost(rec)
    }
    const grossProfit = cumSales - cumCost
    const rate = cumSales > 0 ? grossProfit / cumSales : 0
    allData.push({
      day: d,
      grossProfit,
      rate,
      hasSales: rec ? rec.sales > 0 : false,
    })
  }

  const data = allData.filter(d => d.day >= rangeStart && d.day <= rangeEnd)

  return (
    <Wrapper>
      <Title>粗利額累計推移（バー: 粗利額 / ライン: 粗利率）</Title>
      <ResponsiveContainer width="100%" height="84%">
        <ComposedChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gpGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ct.colors.success} stopOpacity={0.85} />
              <stop offset="100%" stopColor={ct.colors.success} stopOpacity={0.4} />
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
            yAxisId="left"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={false}
            tickLine={false}
            tickFormatter={toManYen}
            width={55}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
            width={40}
          />
          <Tooltip
            contentStyle={tooltipStyle(ct)}
            formatter={(value, name) => {
              if (name === 'rate') return [toPct(value as number), '粗利率']
              return [toComma(value as number), '粗利額累計']
            }}
            labelFormatter={(label) => `${label}日`}
          />
          <Legend
            wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
            formatter={(value) => {
              const labels: Record<string, string> = { grossProfit: '粗利額累計', rate: '粗利率' }
              return labels[value] ?? value
            }}
          />
          {grossProfitBudget > 0 && (
            <ReferenceLine
              yAxisId="left"
              y={grossProfitBudget}
              stroke={ct.colors.warning}
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `粗利予算 ${toManYen(grossProfitBudget)}`,
                position: 'right',
                fill: ct.colors.warning,
                fontSize: ct.fontSize.xs,
                fontFamily: ct.monoFamily,
              }}
            />
          )}
          {targetRate > 0 && (
            <ReferenceLine
              yAxisId="right"
              y={targetRate}
              stroke={ct.colors.info}
              strokeDasharray="6 3"
              strokeWidth={1}
              label={{
                value: `目標 ${toPct(targetRate)}`,
                position: 'left',
                fill: ct.colors.info,
                fontSize: ct.fontSize.xs,
                fontFamily: ct.monoFamily,
              }}
            />
          )}
          <Bar
            yAxisId="left"
            dataKey="grossProfit"
            fill="url(#gpGrad)"
            radius={[3, 3, 0, 0]}
            maxBarSize={16}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="rate"
            stroke={ct.colors.primary}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
      <DayRangeSlider min={1} max={daysInMonth} start={rangeStart} end={rangeEnd} onChange={setRange} />
    </Wrapper>
  )
}
