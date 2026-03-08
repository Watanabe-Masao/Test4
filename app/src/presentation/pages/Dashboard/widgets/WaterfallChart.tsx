import { memo, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
  LabelList,
} from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import { useChartTheme, useCurrencyFormatter, toAxisYen } from '@/presentation/components/charts'
import { createChartTooltip } from '@/presentation/components/charts/createChartTooltip'
import { formatCurrency } from '@/domain/formatting'
import type { WidgetContext } from './types'
import { sc } from '@/presentation/theme/semanticColors'
import { Wrapper, Title } from './WaterfallChart.styles'

interface WaterfallItem {
  name: string
  value: number
  // For waterfall: invisible base + visible bar
  base: number
  bar: number
  isTotal?: boolean
}

export const WaterfallChartWidget = memo(function WaterfallChartWidget({
  ctx,
}: {
  ctx: WidgetContext
}) {
  const r = ctx.result
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()

  const data = useMemo(() => {
    const totalSales = r.totalSales
    const totalCost = r.totalCost
    const discountLoss = -r.totalDiscount
    const costInclusion = -r.totalCostInclusion

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
      name: '原価算入費',
      value: costInclusion,
      base: afterDiscount + costInclusion,
      bar: Math.abs(costInclusion),
    })

    // 5. Gross Profit (result)
    const finalGP = afterDiscount + costInclusion
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
    positive: sc.positive,
    negative: sc.negative,
    total: ct.colors.primary,
  }

  return (
    <Wrapper>
      <Title>粗利益ウォーターフォール（要因分解）</Title>
      <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height={340}>
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
            tickFormatter={toAxisYen}
          />
          <Tooltip
            content={createChartTooltip({
              ct,
              formatter: (_value, name, entry) => {
                if (name === 'base') return [null, null]
                const item = entry.payload as WaterfallItem | undefined
                if (!item) return ['-', '-']
                return [formatCurrency(item.value), item.name]
              },
            })}
          />
          <ReferenceLine y={0} stroke={ct.grid} />
          {/* Invisible base bar */}
          <Bar dataKey="base" stackId="waterfall" fill="transparent" isAnimationActive={false} />
          {/* Visible bar */}
          <Bar dataKey="bar" stackId="waterfall" radius={[3, 3, 0, 0]}>
            <LabelList
              dataKey="value"
              position="top"
              formatter={(v: unknown) => fmt(Number(v))}
              style={{ fontSize: ct.fontSize.xs, fill: ct.text, fontFamily: ct.monoFamily }}
            />
            {data.map((item, idx) => (
              <Cell
                key={idx}
                fill={
                  item.isTotal ? colors.total : item.value >= 0 ? colors.positive : colors.negative
                }
                opacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Wrapper>
  )
})
