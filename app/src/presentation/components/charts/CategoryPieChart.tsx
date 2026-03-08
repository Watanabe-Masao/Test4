import { useState, memo } from 'react'
import { PieChart, Pie, Cell, Tooltip, type PieLabelRenderProps } from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import { useChartTheme, toComma, toPct } from './chartTheme'
import { createChartTooltip } from './createChartTooltip'
import type { CostPricePair, CategoryType } from '@/domain/models'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/domain/constants/categories'
import { Wrapper, HeaderRow, Title, TabGroup, Tab } from './CategoryPieChart.styles'

const CATEGORY_COLORS: Record<string, string> = {
  market: '#f59e0b',
  lfc: '#3b82f6',
  saladClub: '#22c55e',
  processed: '#a855f7',
  directDelivery: '#06b6d4',
  flowers: '#ec4899',
  directProduce: '#84cc16',
  consumables: '#ea580c',
  interStore: '#f43f5e',
  interDepartment: '#8b5cf6',
  other: '#64748b',
}

interface Props {
  categoryTotals: ReadonlyMap<CategoryType, CostPricePair>
  mode?: 'cost' | 'price'
}

export const CategoryPieChart = memo(function CategoryPieChart({
  categoryTotals,
  mode: initialMode = 'cost',
}: Props) {
  const ct = useChartTheme()
  const [mode, setMode] = useState<'cost' | 'price'>(initialMode)

  const data = CATEGORY_ORDER.filter((cat) => {
    const pair = categoryTotals.get(cat)
    return pair && (mode === 'cost' ? pair.cost : pair.price) !== 0
  }).map((cat) => {
    const pair = categoryTotals.get(cat) ?? { cost: 0, price: 0 }
    const value = Math.abs(mode === 'cost' ? pair.cost : pair.price)
    return {
      name: CATEGORY_LABELS[cat],
      value,
      color: CATEGORY_COLORS[cat] ?? '#64748b',
    }
  })

  if (data.length === 0) return null

  const renderLabel = (props: PieLabelRenderProps) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent, name } = props
    const pct = Number(percent)
    if (pct < 0.03) return null
    const RADIAN = Math.PI / 180
    const radius = Number(innerRadius) + (Number(outerRadius) - Number(innerRadius)) * 1.25
    const x = Number(cx) + radius * Math.cos(-Number(midAngle) * RADIAN)
    const y = Number(cy) + radius * Math.sin(-Number(midAngle) * RADIAN)
    return (
      <text
        x={x}
        y={y}
        fill={ct.textSecondary}
        textAnchor={x > Number(cx) ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={ct.fontSize.xs}
        fontFamily={ct.fontFamily}
      >
        {String(name)} {toPct(pct, 0)}
      </text>
    )
  }

  return (
    <Wrapper aria-label="カテゴリ構成比チャート">
      <HeaderRow>
        <Title>カテゴリ別{mode === 'cost' ? '原価' : '売価'}構成</Title>
        <TabGroup>
          <Tab $active={mode === 'cost'} onClick={() => setMode('cost')}>
            原価
          </Tab>
          <Tab $active={mode === 'price'} onClick={() => setMode('price')}>
            売価
          </Tab>
        </TabGroup>
      </HeaderRow>
      <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="90%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="48%"
            outerRadius="70%"
            innerRadius="40%"
            dataKey="value"
            label={renderLabel}
            strokeWidth={2}
            stroke={ct.bg3}
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} fillOpacity={0.85} />
            ))}
          </Pie>
          <Tooltip
            content={createChartTooltip({
              ct,
              formatter: (value) => [toComma(value as number), mode === 'cost' ? '原価' : '売価'],
            })}
          />
        </PieChart>
      </ResponsiveContainer>
    </Wrapper>
  )
})
