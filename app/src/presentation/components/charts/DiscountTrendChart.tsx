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
import { useChartTheme, tooltipStyle, toManYen, toComma, toPct } from './chartTheme'
import { DayRangeSlider, useDayRange } from './DayRangeSlider'
import type { DailyRecord } from '@/domain/models'
import { safeDivide } from '@/domain/calculations'

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
}

/** 売変インパクト分析チャート（バー: 日別売変額 / ライン: 累計売変率） */
export function DiscountTrendChart({ daily, daysInMonth }: Props) {
  const ct = useChartTheme()
  const [rangeStart, rangeEnd, setRange] = useDayRange(daysInMonth)

  let cumDiscount = 0
  let cumGrossSales = 0

  const allData = []
  for (let d = 1; d <= daysInMonth; d++) {
    const rec = daily.get(d)
    const dayDiscount = rec?.discountAbsolute ?? 0
    const dayGross = rec?.grossSales ?? 0

    cumDiscount += dayDiscount
    cumGrossSales += dayGross

    const cumRate = safeDivide(cumDiscount, cumGrossSales, 0)

    allData.push({
      day: d,
      discount: dayDiscount,
      cumRate,
      hasSales: rec ? rec.sales > 0 : false,
    })
  }

  const hasData = allData.some(d => d.discount > 0)
  if (!hasData) return null

  const data = allData.filter(d => d.day >= rangeStart && d.day <= rangeEnd)

  return (
    <Wrapper>
      <Title>売変インパクト分析（バー: 日別売変額 / ライン: 累計売変率）</Title>
      <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="84%">
        <ComposedChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="discGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ct.colors.danger} stopOpacity={0.85} />
              <stop offset="100%" stopColor={ct.colors.danger} stopOpacity={0.4} />
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
            width={50}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${(v * 100).toFixed(1)}%`}
            width={45}
          />
          <Tooltip
            contentStyle={tooltipStyle(ct)}
            formatter={(value, name) => {
              if (name === 'cumRate') return [toPct(value as number), '累計売変率']
              return [toComma(value as number), '日別売変額']
            }}
            labelFormatter={(label) => `${label}日`}
          />
          <Legend
            wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
            formatter={(value) => {
              const labels: Record<string, string> = { discount: '日別売変額', cumRate: '累計売変率' }
              return labels[value] ?? value
            }}
          />
          <Bar
            yAxisId="left"
            dataKey="discount"
            fill="url(#discGrad)"
            radius={[3, 3, 0, 0]}
            maxBarSize={16}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="cumRate"
            stroke={ct.colors.orange}
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
