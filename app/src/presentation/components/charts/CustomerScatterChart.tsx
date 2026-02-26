import { useMemo } from 'react'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ZAxis, ReferenceLine, Legend } from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import styled from 'styled-components'
import { useChartTheme, tooltipStyle, toComma } from './chartTheme'
import type { DailyRecord } from '@/domain/models'
import { calculateTransactionValue } from '@/domain/calculations/utils'

const Wrapper = styled.div`
  width: 100%;
  height: 420px;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[4]};
`

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  padding: 0 ${({ theme }) => theme.spacing[4]};
`

const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
`

const QuadrantGrid = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: 0 ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

const QuadrantTag = styled.div<{ $color: string }>`
  font-size: 0.6rem;
  padding: 2px 6px;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ $color }) => $color}18;
  color: ${({ $color }) => $color};
  border: 1px solid ${({ $color }) => $color}30;
  white-space: nowrap;
`

const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const

const DOW_COLORS: Record<number, string> = {
  0: '#ef4444', // 日 - red
  1: '#6366f1', // 月 - indigo
  2: '#f59e0b', // 火 - amber
  3: '#10b981', // 水 - emerald
  4: '#f97316', // 木 - orange
  5: '#3b82f6', // 金 - blue
  6: '#8b5cf6', // 土 - purple
}

interface Props {
  daily: ReadonlyMap<number, DailyRecord>
  daysInMonth: number
  year: number
  month: number
  prevYearDaily?: ReadonlyMap<number, { sales: number; discount: number; customers?: number }>
}

export function CustomerScatterChart({ daily, daysInMonth, year, month, prevYearDaily }: Props) {
  const ct = useChartTheme()

  const { scatterData, prevScatter, avgCustomers, avgTxValue, quadrantCounts, dowGroups } = useMemo(() => {
    const points: { day: number; customers: number; txValue: number; sales: number; dow: number; dowLabel: string }[] = []
    const prevPoints: { day: number; customers: number; txValue: number; sales: number }[] = []
    let totalCustomers = 0, totalTxValue = 0, count = 0

    for (let d = 1; d <= daysInMonth; d++) {
      const rec = daily.get(d)
      const customers = rec?.customers ?? 0
      if (customers <= 0) continue
      const sales = rec?.sales ?? 0
      const txValue = calculateTransactionValue(sales, customers)
      const date = new Date(year, month - 1, d)
      const dow = date.getDay()
      points.push({ day: d, customers, txValue, sales, dow, dowLabel: DOW_LABELS[dow] })
      totalCustomers += customers
      totalTxValue += txValue
      count++
    }

    if (prevYearDaily) {
      for (let d = 1; d <= daysInMonth; d++) {
        const prev = prevYearDaily.get(d)
        if (!prev || !prev.customers || prev.customers <= 0) continue
        const txVal = calculateTransactionValue(prev.sales, prev.customers)
        prevPoints.push({ day: d, customers: prev.customers, txValue: txVal, sales: prev.sales })
      }
    }

    const avgC = count > 0 ? totalCustomers / count : 0
    const avgT = count > 0 ? totalTxValue / count : 0

    // Quadrant counts
    let q1 = 0, q2 = 0, q3 = 0, q4 = 0
    for (const p of points) {
      if (p.customers >= avgC && p.txValue >= avgT) q1++
      else if (p.customers < avgC && p.txValue >= avgT) q2++
      else if (p.customers < avgC && p.txValue < avgT) q3++
      else q4++
    }

    // Group by day-of-week for legend
    const dowGrp = new Map<number, typeof points>()
    for (const p of points) {
      const existing = dowGrp.get(p.dow)
      if (existing) existing.push(p)
      else dowGrp.set(p.dow, [p])
    }

    return { scatterData: points, prevScatter: prevPoints, avgCustomers: avgC, avgTxValue: avgT, quadrantCounts: { q1, q2, q3, q4 }, dowGroups: dowGrp }
  }, [daily, daysInMonth, year, month, prevYearDaily])

  if (scatterData.length === 0) {
    return (
      <Wrapper>
        <HeaderRow><Title>客数×客単価 効率分析</Title></HeaderRow>
        <div style={{ padding: '40px', textAlign: 'center', color: ct.textMuted, fontSize: ct.fontSize.sm }}>
          客数データがありません
        </div>
      </Wrapper>
    )
  }

  return (
    <Wrapper>
      <HeaderRow>
        <Title>客数×客単価 効率分析（バブルサイズ = 売上額 / 色 = 曜日）</Title>
      </HeaderRow>
      <QuadrantGrid>
        <QuadrantTag $color={ct.colors.success}>
          高客数+高単価: {quadrantCounts.q1}日
        </QuadrantTag>
        <QuadrantTag $color={ct.colors.info}>
          低客数+高単価: {quadrantCounts.q2}日
        </QuadrantTag>
        <QuadrantTag $color={ct.colors.warning}>
          高客数+低単価: {quadrantCounts.q4}日
        </QuadrantTag>
        <QuadrantTag $color={ct.colors.danger}>
          低客数+低単価: {quadrantCounts.q3}日
        </QuadrantTag>
      </QuadrantGrid>
      <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="82%">
        <ScatterChart margin={{ top: 8, right: 20, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="customers"
            type="number"
            name="客数"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={{ stroke: ct.grid }}
            tickLine={false}
            label={{ value: '客数（人）', position: 'insideBottomRight', offset: -5, fontSize: ct.fontSize.xs, fill: ct.textMuted }}
          />
          <YAxis
            dataKey="txValue"
            type="number"
            name="客単価"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${toComma(v)}円`}
            width={60}
            label={{ value: '客単価（円）', angle: -90, position: 'insideLeft', offset: 10, fontSize: ct.fontSize.xs, fill: ct.textMuted }}
          />
          <ZAxis dataKey="sales" range={[40, 400]} name="売上" />
          <Tooltip
            contentStyle={tooltipStyle(ct)}
            formatter={(value, name) => {
              if (name === '客数') return [`${toComma(value as number)}人`, name]
              if (name === '客単価') return [`${toComma(value as number)}円`, name]
              if (name === '売上') return [toComma(value as number), name]
              return [String(value), String(name)]
            }}
            labelFormatter={(_, payload) => {
              if (payload && payload.length > 0) {
                const p = payload[0].payload as { day?: number; dowLabel?: string }
                return p.day != null ? `${p.day}日（${p.dowLabel ?? ''}）` : ''
              }
              return ''
            }}
          />
          {/* Average reference lines */}
          <ReferenceLine x={avgCustomers} stroke={ct.colors.slate} strokeDasharray="6 4" strokeOpacity={0.6} />
          <ReferenceLine y={avgTxValue} stroke={ct.colors.slate} strokeDasharray="6 4" strokeOpacity={0.6} />

          {/* Previous year scatter (gray, smaller) */}
          {prevScatter.length > 0 && (
            <Scatter
              name="前年"
              data={prevScatter}
              fill={ct.colors.slate}
              fillOpacity={0.25}
              shape="circle"
            />
          )}

          {/* Current year scatter by day-of-week */}
          {Array.from(dowGroups.entries()).map(([dow, points]) => (
            <Scatter
              key={dow}
              name={DOW_LABELS[dow]}
              data={points}
              fill={DOW_COLORS[dow]}
              fillOpacity={0.75}
              shape="circle"
            />
          ))}

          <Legend
            wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </Wrapper>
  )
}
