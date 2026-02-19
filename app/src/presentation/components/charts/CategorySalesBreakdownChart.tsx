import { useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import styled from 'styled-components'
import { useChartTheme, tooltipStyle, toManYen, toComma } from './chartTheme'
import type { CategoryTimeSalesData } from '@/domain/models'

const Wrapper = styled.div`
  width: 100%;
  min-height: 400px;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[4]};
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  padding: 0 ${({ theme }) => theme.spacing[4]};
`

const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
`

const LevelTabs = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[1]};
`

const Tab = styled.button<{ $active: boolean }>`
  all: unset;
  cursor: pointer;
  font-size: 0.65rem;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ $active, theme }) => ($active ? theme.colors.bg : theme.colors.text3)};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.palette.primary : theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  &:hover {
    opacity: 0.85;
  }
`

type Level = 'department' | 'line' | 'klass'

const COLORS = [
  '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899',
  '#8b5cf6', '#84cc16', '#f97316', '#14b8a6', '#e879f9', '#a3e635',
  '#fb923c', '#38bdf8', '#c084fc', '#fbbf24',
]

interface Props {
  categoryTimeSales: CategoryTimeSalesData
  selectedStoreIds: ReadonlySet<string>
}

/** 部門・ライン・クラス別売上チャート */
export function CategorySalesBreakdownChart({ categoryTimeSales, selectedStoreIds }: Props) {
  const ct = useChartTheme()
  const [level, setLevel] = useState<Level>('department')

  const data = useMemo(() => {
    const map = new Map<string, { name: string; amount: number; quantity: number }>()

    for (const rec of categoryTimeSales.records) {
      if (selectedStoreIds.size > 0 && !selectedStoreIds.has(rec.storeId)) continue

      let key: string
      let name: string
      if (level === 'department') {
        key = rec.department.code
        name = rec.department.name || rec.department.code
      } else if (level === 'line') {
        key = rec.line.code
        name = rec.line.name || rec.line.code
      } else {
        key = rec.klass.code
        name = rec.klass.name || rec.klass.code
      }

      const existing = map.get(key) ?? { name, amount: 0, quantity: 0 }
      map.set(key, {
        name,
        amount: existing.amount + rec.totalAmount,
        quantity: existing.quantity + rec.totalQuantity,
      })
    }

    return Array.from(map.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 20) // 上位20件
  }, [categoryTimeSales, selectedStoreIds, level])

  if (data.length === 0) return null

  const chartHeight = Math.max(300, data.length * 28 + 40)
  const levelLabels: Record<Level, string> = { department: '部門', line: 'ライン', klass: 'クラス' }

  return (
    <Wrapper>
      <Header>
        <Title>{levelLabels[level]}別売上</Title>
        <LevelTabs>
          {(['department', 'line', 'klass'] as Level[]).map((l) => (
            <Tab key={l} $active={level === l} onClick={() => setLevel(l)}>
              {levelLabels[l]}
            </Tab>
          ))}
        </LevelTabs>
      </Header>
      <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height={chartHeight}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 20, left: 0, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.3} horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={false}
            tickLine={false}
            tickFormatter={toManYen}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: ct.textSecondary, fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
            axisLine={false}
            tickLine={false}
            width={100}
          />
          <Tooltip
            contentStyle={tooltipStyle(ct)}
            formatter={(value, name) => {
              if (name === 'amount') return [toComma(value as number) + '円', '売上金額']
              return [toComma(value as number) + '点', '数量']
            }}
          />
          <Bar dataKey="amount" radius={[0, 4, 4, 0]} maxBarSize={22}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.75} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Wrapper>
  )
}
