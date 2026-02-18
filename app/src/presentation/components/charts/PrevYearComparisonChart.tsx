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
  currentDaily: ReadonlyMap<number, { sales: number }>
  prevYearDaily: ReadonlyMap<number, { sales: number }>
  daysInMonth: number
}

export function PrevYearComparisonChart({ currentDaily, prevYearDaily, daysInMonth }: Props) {
  const ct = useChartTheme()

  // 累計データ構築
  let currentCum = 0
  let prevCum = 0

  const data = []
  for (let d = 1; d <= daysInMonth; d++) {
    currentCum += currentDaily.get(d)?.sales ?? 0
    prevCum += prevYearDaily.get(d)?.sales ?? 0
    data.push({
      day: d,
      currentCum,
      prevYearCum: prevCum > 0 ? prevCum : null,
    })
  }

  // ループ後の prevCum が前年月間合計
  const prevTotal = prevCum

  return (
    <Wrapper>
      <Title>当年 vs 前年同曜日（累計売上推移）</Title>
      <ResponsiveContainer width="100%" height="90%">
        <AreaChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="currentCumArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ct.colors.primary} stopOpacity={0.3} />
              <stop offset="100%" stopColor={ct.colors.primary} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="prevCumArea" x1="0" y1="0" x2="0" y2="1">
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
              const label = name === 'currentCum' ? '当年累計' : '前年同曜日累計'
              return [value != null ? toComma(value as number) : '-', label]
            }}
            labelFormatter={(label) => `${label}日`}
          />
          <Legend
            wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
            formatter={(value) => {
              const labels: Record<string, string> = {
                currentCum: '当年累計',
                prevYearCum: '前年同曜日累計',
              }
              return labels[value] ?? value
            }}
          />
          <Area
            type="monotone"
            dataKey="prevYearCum"
            stroke={ct.colors.slate}
            strokeWidth={2}
            strokeDasharray="4 3"
            fill="url(#prevCumArea)"
            dot={false}
            connectNulls
          />
          <Area
            type="monotone"
            dataKey="currentCum"
            stroke={ct.colors.primary}
            strokeWidth={2.5}
            fill="url(#currentCumArea)"
            dot={false}
            activeDot={{ r: 4, fill: ct.colors.primary, stroke: ct.bg2, strokeWidth: 2 }}
          />
          {prevTotal > 0 && (
            <ReferenceLine
              y={prevTotal}
              stroke={ct.colors.slate}
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `前年同曜日月間 ${toManYen(prevTotal)}`,
                position: 'right',
                fill: ct.colors.slate,
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
