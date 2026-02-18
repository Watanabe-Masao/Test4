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
import { useChartTheme, tooltipStyle, toManYen, toComma } from './chartTheme'
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

export type DailyChartMode = 'sales' | 'discount' | 'all'

interface Props {
  daily: ReadonlyMap<number, DailyRecord>
  daysInMonth: number
  prevYearDaily?: ReadonlyMap<number, { sales: number }>
  mode?: DailyChartMode
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

const TITLES: Record<DailyChartMode, string> = {
  sales: '日別売上推移',
  discount: '日別売変推移',
  all: '日別売上・売変推移',
}

export function DailySalesChart({ daily, daysInMonth, prevYearDaily, mode = 'all' }: Props) {
  const ct = useChartTheme()

  const rawSales: number[] = []
  const rawDiscount: number[] = []
  const baseData = []
  for (let d = 1; d <= daysInMonth; d++) {
    const rec = daily.get(d)
    const sales = rec?.sales ?? 0
    const discount = rec?.discountAbsolute ?? 0
    rawSales.push(sales)
    rawDiscount.push(discount)
    const prevSales = prevYearDaily?.get(d)?.sales ?? null
    baseData.push({ day: d, sales, discount, prevYearSales: prevSales })
  }

  // 7日移動平均
  const salesMa7 = movingAverage(rawSales, 7)
  const discountMa7 = movingAverage(rawDiscount, 7)

  const data = baseData.map((d, i) => ({
    ...d,
    salesMa7: salesMa7[i],
    discountMa7: discountMa7[i],
  }))

  const showSales = mode === 'sales' || mode === 'all'
  const showDiscount = mode === 'discount' || mode === 'all'
  const showPrevYear = showSales && !!prevYearDaily

  // Build label maps per mode
  const allLabels: Record<string, string> = {
    sales: '売上',
    discount: '売変額',
    salesMa7: '売上7日移動平均',
    discountMa7: '売変額7日移動平均',
    prevYearSales: '前年同曜日売上',
  }

  return (
    <Wrapper>
      <Title>{TITLES[mode]}</Title>
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
          {showDiscount && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
              axisLine={false}
              tickLine={false}
              tickFormatter={toManYen}
              width={45}
            />
          )}
          <Tooltip
            contentStyle={tooltipStyle(ct)}
            formatter={(value, name) => {
              return [value != null ? toComma(value as number) : '-', allLabels[name as string] ?? String(name)]
            }}
            labelFormatter={(label) => `${label}日`}
          />
          <Legend
            wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
            formatter={(value) => allLabels[value] ?? value}
          />
          {showSales && (
            <Bar
              yAxisId="left"
              dataKey="sales"
              fill="url(#salesGrad)"
              radius={[3, 3, 0, 0]}
              maxBarSize={showDiscount ? 18 : 24}
            />
          )}
          {showDiscount && (
            <Bar
              yAxisId={showSales ? 'right' : 'left'}
              dataKey="discount"
              fill="url(#discountGrad)"
              radius={[3, 3, 0, 0]}
              maxBarSize={showSales ? 12 : 24}
            />
          )}
          {showSales && (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="salesMa7"
              stroke={ct.colors.cyanDark}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          )}
          {showDiscount && (
            <Line
              yAxisId={showSales ? 'right' : 'left'}
              type="monotone"
              dataKey="discountMa7"
              stroke={ct.colors.orange}
              strokeWidth={2}
              strokeDasharray="5 3"
              dot={false}
              connectNulls
            />
          )}
          {showPrevYear && (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="prevYearSales"
              stroke={ct.colors.slate}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
              connectNulls
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </Wrapper>
  )
}
