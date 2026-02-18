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
  Cell,
} from 'recharts'
import styled from 'styled-components'
import { useChartTheme, tooltipStyle, toManYen, toComma } from './chartTheme'

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
  prevYearCum?: number | null
}

interface Props {
  data: readonly DataPoint[]
  prevYearDaily?: ReadonlyMap<number, { sales: number }>
  daysInMonth?: number
}

/** 予算差・前年差 累計推移チャート */
export function BudgetDiffTrendChart({ data, prevYearDaily, daysInMonth }: Props) {
  const ct = useChartTheme()

  // 前年累計を計算
  let prevCum = 0
  const prevCumMap = new Map<number, number>()
  if (prevYearDaily) {
    const days = daysInMonth ?? data.length
    for (let d = 1; d <= days; d++) {
      prevCum += prevYearDaily.get(d)?.sales ?? 0
      prevCumMap.set(d, prevCum)
    }
  }

  const hasPrevYear = prevCumMap.size > 0 && prevCum > 0

  const chartData = data.map((d) => {
    const budgetDiff = d.actualCum - d.budgetCum
    const prevYearDiff = hasPrevYear ? d.actualCum - (prevCumMap.get(d.day) ?? 0) : null
    return {
      day: d.day,
      budgetDiff,
      prevYearDiff,
      hasActual: d.actualCum > 0,
    }
  })

  return (
    <Wrapper>
      <Title>
        {hasPrevYear
          ? '予算差・前年差 累計推移（実績 − 予算 / 実績 − 前年）'
          : '予算差 累計推移（実績 − 予算）'
        }
      </Title>
      <ResponsiveContainer width="100%" height="90%">
        <ComposedChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
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
          <ReferenceLine y={0} stroke={ct.grid} strokeWidth={1.5} />
          <Tooltip
            contentStyle={tooltipStyle(ct)}
            formatter={(value, name) => {
              const v = value as number
              const labels: Record<string, string> = {
                budgetDiff: '予算差（累計）',
                prevYearDiff: '前年差（累計）',
              }
              const prefix = v >= 0 ? '+' : ''
              return [`${prefix}${toComma(v)}`, labels[name as string] ?? String(name)]
            }}
            labelFormatter={(label) => `${label}日`}
          />
          <Legend
            wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
            formatter={(value) => {
              const labels: Record<string, string> = {
                budgetDiff: '予算差（累計）',
                prevYearDiff: '前年差（累計）',
              }
              return labels[value] ?? value
            }}
          />
          <Bar dataKey="budgetDiff" radius={[3, 3, 0, 0]} maxBarSize={hasPrevYear ? 12 : 18}>
            {chartData.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.hasActual
                  ? (entry.budgetDiff >= 0 ? ct.colors.success : ct.colors.danger)
                  : 'transparent'
                }
                fillOpacity={entry.hasActual ? 0.7 : 0}
              />
            ))}
          </Bar>
          {hasPrevYear && (
            <Line
              type="monotone"
              dataKey="prevYearDiff"
              stroke={ct.colors.primary}
              strokeWidth={2.5}
              dot={false}
              connectNulls
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </Wrapper>
  )
}
