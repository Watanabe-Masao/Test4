import { useMemo, useState, useCallback } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts'
import styled from 'styled-components'
import { useChartTheme, tooltipStyle, toManYen, toComma } from './chartTheme'
import type { CategoryTimeSalesData } from '@/domain/models'
import { useCategoryHierarchy, filterByHierarchy } from './CategoryHierarchyContext'
import { usePeriodFilter, PeriodFilterBar } from './PeriodFilter'

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

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`

const TabGroup = styled.div`
  display: flex;
  gap: 2px;
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 2px;
`

const Tab = styled.button<{ $active: boolean }>`
  all: unset;
  cursor: pointer;
  font-size: 0.65rem;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ $active, theme }) => ($active ? '#fff' : theme.colors.text3)};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.palette.primary : 'transparent'};
  transition: all 0.15s;
  white-space: nowrap;
  &:hover {
    opacity: 0.85;
  }
`

const Separator = styled.span`
  width: 1px;
  height: 16px;
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'};
`

type Level = 'department' | 'line' | 'klass'
type Metric = 'amount' | 'quantity'

const COLORS = [
  '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899',
  '#8b5cf6', '#84cc16', '#f97316', '#14b8a6', '#e879f9', '#a3e635',
  '#fb923c', '#38bdf8', '#c084fc', '#fbbf24',
]

interface Props {
  categoryTimeSales: CategoryTimeSalesData
  selectedStoreIds: ReadonlySet<string>
  daysInMonth: number
  year: number
  month: number
}

/** 部門・ライン・クラス別売上チャート */
export function CategorySalesBreakdownChart({ categoryTimeSales, selectedStoreIds, daysInMonth, year, month }: Props) {
  const ct = useChartTheme()
  const [level, setLevel] = useState<Level>('department')
  const [metric, setMetric] = useState<Metric>('amount')
  const { filter } = useCategoryHierarchy()
  const pf = usePeriodFilter(daysInMonth, year, month)

  const data = useMemo(() => {
    const map = new Map<string, { name: string; amount: number; quantity: number }>()
    const filtered = filterByHierarchy(pf.filterRecords(categoryTimeSales.records), filter)

    for (const rec of filtered) {
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

    const div = pf.mode !== 'total' ? pf.divisor : 1
    const sorted = Array.from(map.values())
      .map((d) => ({ ...d, amount: Math.round(d.amount / div), quantity: Math.round(d.quantity / div) }))
      .sort((a, b) => metric === 'amount' ? b.amount - a.amount : b.quantity - a.quantity)
      .slice(0, 20)

    // 構成比を計算
    const total = sorted.reduce((s, d) => s + (metric === 'amount' ? d.amount : d.quantity), 0)
    return sorted.map((d) => ({
      ...d,
      pct: total > 0 ? ((metric === 'amount' ? d.amount : d.quantity) / total) * 100 : 0,
    }))
  }, [categoryTimeSales, selectedStoreIds, level, filter, metric, pf])

  // バー内のカスタムラベル（金額＋構成比）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderBarLabel = useCallback((props: any) => {
    const { x, y, width, height, index } = props as {
      x: number; y: number; width: number; height: number; index: number
    }
    if (width < 60 || !data[index]) return null
    const d = data[index]
    const val = metric === 'amount'
      ? `${toComma(d.amount)}円`
      : `${toComma(d.quantity)}点`
    const pctStr = `${d.pct.toFixed(1)}%`
    const textX = x + width - 6
    const textY = y + height / 2

    return (
      <g>
        <text
          x={textX} y={textY - 5}
          textAnchor="end" fill="#fff" fontSize="0.6rem"
          fontWeight={600} fontFamily={ct.monoFamily}
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}
        >
          {val}
        </text>
        <text
          x={textX} y={textY + 8}
          textAnchor="end" fill="rgba(255,255,255,0.8)" fontSize="0.52rem"
          fontFamily={ct.monoFamily}
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
        >
          {pctStr}
        </text>
      </g>
    )
  }, [data, metric, ct.monoFamily])

  if (data.length === 0) return null

  const chartHeight = Math.max(300, data.length * 32 + 40)
  const levelLabels: Record<Level, string> = { department: '部門', line: 'ライン', klass: 'クラス' }
  const metricLabels: Record<Metric, string> = { amount: '売上', quantity: '点数' }
  const titleSuffix = metric === 'amount' ? '売上' : '点数'

  return (
    <Wrapper>
      <Header>
        <Title>{levelLabels[level]}別{titleSuffix}{pf.mode === 'dailyAvg' || pf.mode === 'dowAvg' ? '（日平均）' : ''}</Title>
        <Controls>
          <TabGroup>
            {(['amount', 'quantity'] as Metric[]).map((m) => (
              <Tab key={m} $active={metric === m} onClick={() => setMetric(m)}>
                {metricLabels[m]}
              </Tab>
            ))}
          </TabGroup>
          <Separator />
          <TabGroup>
            {(['department', 'line', 'klass'] as Level[]).map((l) => (
              <Tab key={l} $active={level === l} onClick={() => setLevel(l)}>
                {levelLabels[l]}
              </Tab>
            ))}
          </TabGroup>
        </Controls>
      </Header>
      <PeriodFilterBar pf={pf} daysInMonth={daysInMonth} />
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
            tickFormatter={metric === 'amount' ? toManYen : (v: number) => `${toComma(v)}点`}
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
          <Bar dataKey={metric} radius={[0, 4, 4, 0]} maxBarSize={24}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.8} />
            ))}
            <LabelList content={renderBarLabel} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Wrapper>
  )
}
