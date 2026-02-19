import { useMemo } from 'react'
import styled from 'styled-components'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  ResponsiveContainer, ReferenceLine, LabelList,
} from 'recharts'
import { useChartTheme, tooltipStyle, toManYen } from '@/presentation/components/charts'
import { formatCurrency } from '@/domain/calculations/utils'
import type { WidgetContext } from './types'

const Wrapper = styled.div`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]};
`

const Title = styled.h4`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

interface WaterfallItem {
  name: string
  value: number
  // For waterfall: invisible base + visible bar
  base: number
  bar: number
  isTotal?: boolean
}

export function WaterfallChartWidget({ ctx }: { ctx: WidgetContext }) {
  const r = ctx.result
  const ct = useChartTheme()

  const data = useMemo(() => {
    const totalSales = r.totalSales
    const totalCost = r.totalCost
    const discountLoss = -r.totalDiscount
    const consumable = -r.totalConsumable

    // Waterfall items: Start from sales, subtract factors
    const items: WaterfallItem[] = []

    // 1. Total Sales (starting point)
    items.push({
      name: '売上高',
      value: totalSales,
      base: 0,
      bar: totalSales,
      isTotal: true,
    })

    // 2. Cost of goods (negative impact from sales)
    items.push({
      name: '仕入原価',
      value: -totalCost,
      base: totalSales - totalCost,
      bar: totalCost,
    })

    // Running total after cost = markup amount (= grossSales - totalCost)
    // 3. Discount loss (negative impact)
    const afterCost = totalSales - totalCost
    items.push({
      name: '売変ロス',
      value: discountLoss,
      base: afterCost + discountLoss,
      bar: Math.abs(discountLoss),
    })

    // 4. Consumables (negative impact)
    const afterDiscount = afterCost + discountLoss
    items.push({
      name: '消耗品費',
      value: consumable,
      base: afterDiscount + consumable,
      bar: Math.abs(consumable),
    })

    // 5. Gross Profit (result)
    const finalGP = afterDiscount + consumable
    items.push({
      name: '粗利益',
      value: finalGP,
      base: 0,
      bar: finalGP,
      isTotal: true,
    })

    return items
  }, [r])

  const colors = {
    positive: '#22c55e',
    negative: '#ef4444',
    total: ct.colors.primary,
  }

  return (
    <Wrapper>
      <Title>粗利益ウォーターフォール（要因分解）</Title>
      <ResponsiveContainer width="100%" height={340}>
        <BarChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: ct.fontSize.sm, fill: ct.text, fontFamily: ct.fontFamily }}
            axisLine={{ stroke: ct.grid }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: ct.fontSize.xs, fill: ct.textSecondary, fontFamily: ct.monoFamily }}
            axisLine={false}
            tickLine={false}
            tickFormatter={toManYen}
          />
          <Tooltip
            contentStyle={tooltipStyle(ct)}
            formatter={(value: number, name: string, props: { payload: WaterfallItem }) => {
              const item = props.payload
              return [formatCurrency(item.value), item.name]
            }}
          />
          <ReferenceLine y={0} stroke={ct.grid} />
          {/* Invisible base bar */}
          <Bar dataKey="base" stackId="waterfall" fill="transparent" isAnimationActive={false} />
          {/* Visible bar */}
          <Bar dataKey="bar" stackId="waterfall" radius={[3, 3, 0, 0]}>
            <LabelList
              dataKey="value"
              position="top"
              formatter={(v: number) => toManYen(v)}
              style={{ fontSize: ct.fontSize.xs, fill: ct.text, fontFamily: ct.monoFamily }}
            />
            {data.map((item, idx) => (
              <Cell
                key={idx}
                fill={item.isTotal ? colors.total : item.value >= 0 ? colors.positive : colors.negative}
                opacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Wrapper>
  )
}
