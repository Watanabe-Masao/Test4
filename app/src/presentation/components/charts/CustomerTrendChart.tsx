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
} from 'recharts'
import styled from 'styled-components'
import { useChartTheme, tooltipStyle, toComma } from './chartTheme'
import { DayRangeSlider, useDayRange } from './DayRangeSlider'
import type { DailyRecord } from '@/domain/models'
import type { PrevYearDailyEntry } from '@/application/hooks'

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
  prevYearDaily?: ReadonlyMap<number, PrevYearDailyEntry>
}

/** 日別客数推移チャート（バー: 当年客数 / ライン: 前年客数） */
export function CustomerTrendChart({ daily, daysInMonth, prevYearDaily }: Props) {
  const ct = useChartTheme()
  const [rangeStart, rangeEnd, setRange] = useDayRange(daysInMonth)

  const allData = []
  for (let d = 1; d <= daysInMonth; d++) {
    const rec = daily.get(d)
    const customers = rec?.customers ?? 0
    const prevCustomers = prevYearDaily?.get(d)?.customers ?? null
    allData.push({ day: d, customers, prevCustomers })
  }

  const hasData = allData.some((d) => d.customers > 0)
  if (!hasData) return null

  const data = allData.filter((d) => d.day >= rangeStart && d.day <= rangeEnd)
  const hasPrev = prevYearDaily && allData.some((d) => d.prevCustomers != null && d.prevCustomers > 0)

  return (
    <Wrapper>
      <Title>日別客数推移{hasPrev ? '（前年比較）' : ''}</Title>
      <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="84%">
        <ComposedChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="custGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ct.colors.info} stopOpacity={0.85} />
              <stop offset="100%" stopColor={ct.colors.info} stopOpacity={0.4} />
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
            width={45}
          />
          <Tooltip
            contentStyle={tooltipStyle(ct)}
            formatter={(value, name) => {
              const labels: Record<string, string> = {
                customers: '当年客数',
                prevCustomers: '前年客数',
              }
              return [toComma(value as number) + '人', labels[name as string] ?? name]
            }}
            labelFormatter={(label) => `${label}日`}
          />
          <Legend
            wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
            formatter={(value) => {
              const labels: Record<string, string> = {
                customers: '当年客数',
                prevCustomers: '前年客数',
              }
              return labels[value] ?? value
            }}
          />
          <Bar
            dataKey="customers"
            fill="url(#custGrad)"
            radius={[3, 3, 0, 0]}
            maxBarSize={16}
          />
          {hasPrev && (
            <Line
              type="monotone"
              dataKey="prevCustomers"
              stroke={ct.colors.slate}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
              connectNulls
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      <DayRangeSlider min={1} max={daysInMonth} start={rangeStart} end={rangeEnd} onChange={setRange} />
    </Wrapper>
  )
}
