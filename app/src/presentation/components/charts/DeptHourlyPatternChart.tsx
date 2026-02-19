import { useMemo, useState } from 'react'
import {
  AreaChart,
  Area,
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

const ToggleGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[1]};
`

const Toggle = styled.button<{ $active: boolean }>`
  all: unset;
  cursor: pointer;
  font-size: 0.65rem;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ $active, theme }) => ($active ? theme.colors.bg : theme.colors.text3)};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.palette.primary : theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  &:hover { opacity: 0.85; }
`

const DEPT_COLORS = [
  '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899',
  '#8b5cf6', '#84cc16', '#f97316', '#14b8a6',
]

interface Props {
  categoryTimeSales: CategoryTimeSalesData
  selectedStoreIds: ReadonlySet<string>
}

type ViewMode = 'stacked' | 'separate'

/** 部門別 時間帯パターンチャート */
export function DeptHourlyPatternChart({ categoryTimeSales, selectedStoreIds }: Props) {
  const ct = useChartTheme()
  const [viewMode, setViewMode] = useState<ViewMode>('stacked')

  const { data, departments } = useMemo(() => {
    // dept → hour → amount
    const deptHourMap = new Map<string, Map<number, number>>()
    const deptNames = new Map<string, string>()
    const hourSet = new Set<number>()

    for (const rec of categoryTimeSales.records) {
      if (selectedStoreIds.size > 0 && !selectedStoreIds.has(rec.storeId)) continue
      const deptKey = rec.department.code
      deptNames.set(deptKey, rec.department.name || deptKey)

      if (!deptHourMap.has(deptKey)) deptHourMap.set(deptKey, new Map())
      const hourMap = deptHourMap.get(deptKey)!

      for (const slot of rec.timeSlots) {
        hourSet.add(slot.hour)
        hourMap.set(slot.hour, (hourMap.get(slot.hour) ?? 0) + slot.amount)
      }
    }

    // Sort depts by total amount, take top 8
    const deptTotals = [...deptHourMap.entries()].map(([code, hourMap]) => ({
      code,
      name: deptNames.get(code) ?? code,
      total: [...hourMap.values()].reduce((s, v) => s + v, 0),
      hourMap,
    }))
    deptTotals.sort((a, b) => b.total - a.total)
    const topDepts = deptTotals.slice(0, 8)

    const hours = [...hourSet].sort((a, b) => a - b)
    const data = hours.map((h) => {
      const entry: Record<string, string | number> = { hour: `${h}時` }
      for (const dept of topDepts) {
        entry[dept.name] = dept.hourMap.get(h) ?? 0
      }
      return entry
    })

    return { data, departments: topDepts.map((d) => d.name) }
  }, [categoryTimeSales, selectedStoreIds])

  if (data.length === 0 || departments.length === 0) return null

  return (
    <Wrapper>
      <Header>
        <Title>部門別 時間帯パターン（上位{departments.length}部門）</Title>
        <ToggleGroup>
          <Toggle $active={viewMode === 'stacked'} onClick={() => setViewMode('stacked')}>積み上げ</Toggle>
          <Toggle $active={viewMode === 'separate'} onClick={() => setViewMode('separate')}>独立</Toggle>
        </ToggleGroup>
      </Header>
      <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="88%">
        <AreaChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="hour"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={{ stroke: ct.grid }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={false}
            tickLine={false}
            tickFormatter={toManYen}
            width={50}
          />
          <Tooltip
            contentStyle={tooltipStyle(ct)}
            formatter={(value: number, name: string) => [toComma(value) + '円', name]}
          />
          <Legend wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }} />
          {departments.map((dept, i) => (
            <Area
              key={dept}
              type="monotone"
              dataKey={dept}
              stackId={viewMode === 'stacked' ? 'dept' : undefined}
              stroke={DEPT_COLORS[i % DEPT_COLORS.length]}
              fill={DEPT_COLORS[i % DEPT_COLORS.length]}
              fillOpacity={viewMode === 'stacked' ? 0.6 : 0.15}
              strokeWidth={viewMode === 'stacked' ? 0 : 2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </Wrapper>
  )
}
