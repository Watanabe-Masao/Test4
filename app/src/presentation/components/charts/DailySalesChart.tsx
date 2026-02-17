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
import { useChartTheme, toManYen, toComma } from './chartTheme'
import type { DailyRecord } from '@/domain/models'

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

/** N日移動平均を計算 */
function movingAverage(values: number[], window: number): (number | null)[] {
  return values.map((_, i) => {
    if (i < window - 1) return null
    let sum = 0
    for (let j = i - window + 1; j <= i; j++) sum += values[j]
    return sum / window
  })
}

export function DailySalesChart({ daily, daysInMonth }: Props) {
  const ct = useChartTheme()

  const rawSales: number[] = []
  const baseData = []
  for (let d = 1; d <= daysInMonth; d++) {
    const rec = daily.get(d)
    const sales = rec?.sales ?? 0
    rawSales.push(sales)
    baseData.push({
      day: d,
      sales,
      discount: rec?.discountAbsolute ?? 0,
    })
  }

  // 3日・7日移動平均
  const ma3 = movingAverage(rawSales, 3)
  const ma7 = movingAverage(rawSales, 7)

  const data = baseData.map((d, i) => ({
    ...d,
    ma3: ma3[i],
    ma7: ma7[i],
  }))

  return (
    <Wrapper>
      <Title>日別売上・売変推移（移動平均付き）</Title>
      <ResponsiveContainer width="100%" height="90%">
        <ComposedChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ct.colors.primary} stopOpacity={0.9} />
              <stop offset="100%" stopColor={ct.colors.primary} stopOpacity={0.5} />
            </linearGradient>
            <linearGradient id="discountGrad" x1="0" y1="0" x2="0" y2="1">
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
            tickFormatter={toManYen}
            width={45}
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
              const labels: Record<string, string> = {
                sales: '売上',
                discount: '売変額',
                ma3: '3日移動平均',
                ma7: '7日移動平均',
              }
              return [value != null ? toComma(value as number) : '-', labels[name as string] ?? String(name)]
            }}
            labelFormatter={(label) => `${label}日`}
          />
          <Legend
            wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
            formatter={(value) => {
              const labels: Record<string, string> = {
                sales: '売上',
                discount: '売変額',
                ma3: '3日移動平均',
                ma7: '7日移動平均',
              }
              return labels[value] ?? value
            }}
          />
          <Bar
            yAxisId="left"
            dataKey="sales"
            fill="url(#salesGrad)"
            radius={[3, 3, 0, 0]}
            maxBarSize={18}
          />
          <Bar
            yAxisId="right"
            dataKey="discount"
            fill="url(#discountGrad)"
            radius={[3, 3, 0, 0]}
            maxBarSize={12}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="ma3"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="ma7"
            stroke="#06b6d4"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Wrapper>
  )
}
