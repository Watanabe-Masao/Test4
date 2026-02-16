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
import { useChartTheme, toManYen, toComma } from './chartTheme'

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

interface DataPoint {
  day: number
  actualCum: number
  budgetCum: number
}

interface Props {
  data: readonly DataPoint[]
  budget: number
}

export function BudgetVsActualChart({ data, budget }: Props) {
  const ct = useChartTheme()

  return (
    <Wrapper>
      <Title>予算 vs 実績（累計推移）</Title>
      <ResponsiveContainer width="100%" height="90%">
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
            contentStyle={{
              background: ct.bg2,
              border: `1px solid ${ct.grid}`,
              borderRadius: 8,
              fontSize: ct.fontSize.sm,
              fontFamily: ct.fontFamily,
              color: ct.text,
            }}
            formatter={(value, name) => {
              const label = name === 'actualCum' ? '実績累計' : '予算累計'
              return [toComma(value as number), label]
            }}
            labelFormatter={(label) => `${label}日`}
          />
          <Legend
            wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
            formatter={(value) => {
              const labels: Record<string, string> = {
                actualCum: '実績累計',
                budgetCum: '予算累計',
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
    </Wrapper>
  )
}
