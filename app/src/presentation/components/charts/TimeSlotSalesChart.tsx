import { useState, useMemo } from 'react'
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
import { useCategoryHierarchy, filterByHierarchy } from './CategoryHierarchyContext'
import { usePeriodFilter, PeriodFilterBar, useHierarchyDropdown, HierarchyDropdowns } from './PeriodFilter'

const Wrapper = styled.div`
  width: 100%;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[4]};
`

const HeaderRow = styled.div`
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
  &:hover { opacity: 0.85; }
`

/* KPI Grid */
const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: ${({ theme }) => theme.spacing[3]};
  padding: 0 ${({ theme }) => theme.spacing[2]};
`

const Card = styled.div<{ $accent: string }>`
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 3px solid ${({ $accent }) => $accent};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
`

const CardLabel = styled.div`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text4};
  margin-bottom: 2px;
`

const CardValue = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

const CardSub = styled.div`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text3};
  margin-top: 2px;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

type ViewMode = 'chart' | 'kpi'

interface Props {
  categoryTimeSales: CategoryTimeSalesData
  selectedStoreIds: ReadonlySet<string>
  daysInMonth: number
  year: number
  month: number
}

/** 時間帯別売上チャート（チャート / KPIサマリー 切替） */
export function TimeSlotSalesChart({ categoryTimeSales, selectedStoreIds, daysInMonth, year, month }: Props) {
  const ct = useChartTheme()
  const { filter } = useCategoryHierarchy()
  const [viewMode, setViewMode] = useState<ViewMode>('chart')
  const pf = usePeriodFilter(daysInMonth, year, month)
  const periodRecords = useMemo(() => pf.filterRecords(categoryTimeSales.records), [categoryTimeSales, pf])
  const hf = useHierarchyDropdown(periodRecords, selectedStoreIds)

  const { chartData, kpi } = useMemo(() => {
    const hourly = new Map<number, { amount: number; quantity: number }>()
    const filtered = hf.applyFilter(filterByHierarchy(periodRecords, filter))
    const records = filtered.filter(
      (r) => selectedStoreIds.size === 0 || selectedStoreIds.has(r.storeId),
    )

    let totalAmount = 0, totalQuantity = 0
    for (const rec of records) {
      totalAmount += rec.totalAmount
      totalQuantity += rec.totalQuantity
      for (const slot of rec.timeSlots) {
        const existing = hourly.get(slot.hour) ?? { amount: 0, quantity: 0 }
        hourly.set(slot.hour, {
          amount: existing.amount + slot.amount,
          quantity: existing.quantity + slot.quantity,
        })
      }
    }

    // 集計モードに応じた除算 (dowAvg は日平均にフォールバック)
    const div = pf.mode !== 'total' ? pf.divisor : 1
    const chartData = []
    for (let h = 0; h < 24; h++) {
      const entry = hourly.get(h)
      if (entry) {
        chartData.push({
          hour: `${h}時`,
          amount: Math.round(entry.amount / div),
          quantity: Math.round(entry.quantity / div),
        })
      }
    }

    // KPI
    let peakHour = 0, peakHourAmount = 0
    for (const [h, v] of hourly) {
      if (v.amount > peakHourAmount) { peakHour = h; peakHourAmount = v.amount }
    }
    const peakHourPct = totalAmount > 0 ? (peakHourAmount / totalAmount * 100).toFixed(1) : '0'

    const deptMap = new Map<string, { name: string; amount: number }>()
    for (const rec of records) {
      const key = rec.department.code
      const existing = deptMap.get(key) ?? { name: rec.department.name, amount: 0 }
      deptMap.set(key, { name: existing.name, amount: existing.amount + rec.totalAmount })
    }
    let topDeptName = '-', topDeptAmount = 0
    for (const [, v] of deptMap) {
      if (v.amount > topDeptAmount) { topDeptName = v.name; topDeptAmount = v.amount }
    }
    const topDeptPct = totalAmount > 0 ? (topDeptAmount / totalAmount * 100).toFixed(1) : '0'

    const storeCount = new Set(records.map(r => r.storeId)).size
    const dayCount = new Set(records.map(r => r.day)).size
    const categoryCount = new Set(records.map(r => `${r.department.code}-${r.line.code}-${r.klass.code}`)).size
    const activeHours = hourly.size
    const avgPerHour = activeHours > 0 ? Math.round(totalAmount / activeHours) : 0

    return {
      chartData,
      kpi: records.length > 0 ? {
        totalAmount, totalQuantity, peakHour, peakHourPct,
        topDeptName, topDeptPct, storeCount, dayCount, categoryCount,
        activeHours, avgPerHour, recordCount: records.length,
      } : null,
    }
  }, [periodRecords, selectedStoreIds, filter, pf, hf])

  if (chartData.length === 0) return null

  return (
    <Wrapper>
      <HeaderRow>
        <Title>時間帯別売上{viewMode === 'kpi' ? ' サマリー' : ''}{pf.mode === 'dailyAvg' ? '（日平均）' : pf.mode === 'dowAvg' ? '（曜日別平均）' : ''}</Title>
        <TabGroup>
          <Tab $active={viewMode === 'chart'} onClick={() => setViewMode('chart')}>チャート</Tab>
          <Tab $active={viewMode === 'kpi'} onClick={() => setViewMode('kpi')}>KPI</Tab>
        </TabGroup>
      </HeaderRow>
      {viewMode === 'chart' ? (
        <div style={{ width: '100%', height: 340 }}>
          <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
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
        </div>
      ) : kpi ? (
        <Grid>
          <Card $accent="#6366f1">
            <CardLabel>総売上金額</CardLabel>
            <CardValue>{Math.round(kpi.totalAmount / 10000).toLocaleString()}万円</CardValue>
            <CardSub>{kpi.totalAmount.toLocaleString()}円</CardSub>
          </Card>
          <Card $accent="#06b6d4">
            <CardLabel>総数量</CardLabel>
            <CardValue>{kpi.totalQuantity.toLocaleString()}点</CardValue>
            <CardSub>{kpi.recordCount.toLocaleString()}レコード</CardSub>
          </Card>
          <Card $accent="#f59e0b">
            <CardLabel>ピーク時間帯</CardLabel>
            <CardValue>{kpi.peakHour}時台</CardValue>
            <CardSub>構成比 {kpi.peakHourPct}%</CardSub>
          </Card>
          <Card $accent="#22c55e">
            <CardLabel>売上1位部門</CardLabel>
            <CardValue style={{ fontSize: kpi.topDeptName.length > 5 ? '0.85rem' : undefined }}>
              {kpi.topDeptName}
            </CardValue>
            <CardSub>構成比 {kpi.topDeptPct}%</CardSub>
          </Card>
          <Card $accent="#ec4899">
            <CardLabel>対象店舗/日数</CardLabel>
            <CardValue>{kpi.storeCount}店 / {kpi.dayCount}日</CardValue>
            <CardSub>{kpi.categoryCount}分類</CardSub>
          </Card>
          <Card $accent="#8b5cf6">
            <CardLabel>時間帯平均</CardLabel>
            <CardValue>{Math.round(kpi.avgPerHour / 10000).toLocaleString()}万</CardValue>
            <CardSub>{kpi.activeHours}時間帯</CardSub>
          </Card>
        </Grid>
      ) : null}
      <PeriodFilterBar pf={pf} daysInMonth={daysInMonth} />
      <HierarchyDropdowns hf={hf} />
    </Wrapper>
  )
}
