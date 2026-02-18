import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, type PieLabelRenderProps } from 'recharts'
import styled from 'styled-components'
import { useChartTheme, tooltipStyle, toComma } from './chartTheme'
import type { CostPricePair, CategoryType } from '@/domain/models'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/domain/constants/categories'

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
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  padding-left: ${({ theme }) => theme.spacing[4]};
`

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
  mode: 'cost' | 'price'
}

export function CategoryPieChart({ categoryTotals, mode }: Props) {
  const ct = useChartTheme()

  const data = CATEGORY_ORDER
    .filter((cat) => {
      const pair = categoryTotals.get(cat)
      return pair && (mode === 'cost' ? pair.cost : pair.price) !== 0
    })
    .map((cat) => {
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
        {String(name)} {(pct * 100).toFixed(0)}%
      </text>
    )
  }

  return (
    <Wrapper>
      <Title>カテゴリ別{mode === 'cost' ? '原価' : '売価'}構成</Title>
      <ResponsiveContainer width="100%" height="90%">
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
            contentStyle={tooltipStyle(ct)}
            formatter={(value) => [toComma(value as number), mode === 'cost' ? '原価' : '売価']}
          />
        </PieChart>
      </ResponsiveContainer>
    </Wrapper>
  )
}
