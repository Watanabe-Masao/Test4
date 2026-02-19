import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import styled from 'styled-components'
import { useChartTheme, tooltipStyle, toManYen, toComma } from './chartTheme'
import type { CategoryTimeSalesData } from '@/domain/models'

const Wrapper = styled.div`
  width: 100%;
  height: 400px;
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
  categoryTimeSales: CategoryTimeSalesData
  selectedStoreIds: ReadonlySet<string>
}

/** 時間帯別売上チャート（棒: 売上金額 / 数量） */
export function TimeSlotSalesChart({ categoryTimeSales, selectedStoreIds }: Props) {
  const ct = useChartTheme()

  const data = useMemo(() => {
    const hourly = new Map<number, { amount: number; quantity: number }>()

    for (const rec of categoryTimeSales.records) {
      if (selectedStoreIds.size > 0 && !selectedStoreIds.has(rec.storeId)) continue
      for (const slot of rec.timeSlots) {
        const existing = hourly.get(slot.hour) ?? { amount: 0, quantity: 0 }
        hourly.set(slot.hour, {
          amount: existing.amount + slot.amount,
          quantity: existing.quantity + slot.quantity,
        })
      }
    }

    const result = []
    for (let h = 0; h < 24; h++) {
      const entry = hourly.get(h)
      if (entry) {
        result.push({ hour: `${h}時`, amount: entry.amount, quantity: entry.quantity })
      }
    }
    return result
  }, [categoryTimeSales, selectedStoreIds])

  if (data.length === 0) return null

  return (
    <Wrapper>
      <Title>時間帯別売上</Title>
      <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="90%">
        <BarChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="timeAmtGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ct.colors.primary} stopOpacity={0.85} />
              <stop offset="100%" stopColor={ct.colors.primary} stopOpacity={0.4} />
            </linearGradient>
            <linearGradient id="timeQtyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ct.colors.cyan} stopOpacity={0.85} />
              <stop offset="100%" stopColor={ct.colors.cyan} stopOpacity={0.4} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="hour"
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
            width={45}
          />
          <Tooltip
            contentStyle={tooltipStyle(ct)}
            formatter={(value, name) => {
              if (name === 'amount') return [toComma(value as number) + '円', '売上金額']
              return [toComma(value as number) + '点', '数量']
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
            formatter={(value) => {
              const labels: Record<string, string> = { amount: '売上金額', quantity: '数量' }
              return labels[value] ?? value
            }}
          />
          <Bar yAxisId="left" dataKey="amount" fill="url(#timeAmtGrad)" radius={[3, 3, 0, 0]} maxBarSize={20} />
          <Bar yAxisId="right" dataKey="quantity" fill="url(#timeQtyGrad)" radius={[3, 3, 0, 0]} maxBarSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </Wrapper>
  )
}
