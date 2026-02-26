import { useState, useMemo } from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ReferenceLine } from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import styled from 'styled-components'
import { useChartTheme, tooltipStyle, toComma, toPct } from './chartTheme'
import { DayRangeSlider, useDayRange } from './DayRangeSlider'
import type { DailyRecord } from '@/domain/models'
import { safeDivide, calculateTransactionValue } from '@/domain/calculations/utils'

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
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  padding: 0 ${({ theme }) => theme.spacing[4]};
`

const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
`

const ViewToggle = styled.div`
  display: flex;
  gap: 2px;
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 2px;
`

const ViewBtn = styled.button<{ $active?: boolean }>`
  all: unset;
  cursor: pointer;
  font-size: 0.65rem;
  padding: 3px 8px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ $active, theme }) => $active ? '#fff' : theme.colors.text3};
  background: ${({ $active, theme }) => $active
    ? theme.colors.palette.primary
    : 'transparent'};
  transition: all 0.15s;
  white-space: nowrap;
  &:hover {
    background: ${({ $active, theme }) => $active
      ? theme.colors.palette.primary
      : theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'};
  }
`

const SummaryRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: 0 ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

const SummaryItem = styled.div<{ $positive?: boolean }>`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ $positive, theme }) => $positive ? theme.colors.palette.success : theme.colors.palette.danger};
`

const SummaryLabel = styled.span`
  color: ${({ theme }) => theme.colors.text3};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  margin-right: 4px;
`

type ViewType = 'salesGap' | 'multiGap' | 'growthRate'

const VIEW_LABELS: Record<ViewType, string> = {
  salesGap: '売上差異',
  multiGap: '複合差異',
  growthRate: '成長率',
}

const VIEW_TITLES: Record<ViewType, string> = {
  salesGap: '前年売上差異分析（バー: 日別差異 / ライン: 累計差異）',
  multiGap: '前年複合差異分析（売上・売変・客数の差異を重ね合わせ）',
  growthRate: '前年成長率推移（日別: 売上・客数・客単価の前年比%）',
}

interface Props {
  daily: ReadonlyMap<number, DailyRecord>
  daysInMonth: number
  prevYearDaily: ReadonlyMap<number, { sales: number; discount: number; customers?: number }>
}

export function YoYVarianceChart({ daily, daysInMonth, prevYearDaily }: Props) {
  const ct = useChartTheme()
  const [view, setView] = useState<ViewType>('salesGap')
  const [rangeStart, rangeEnd, setRange] = useDayRange(daysInMonth)

  const { chartData, totals } = useMemo(() => {
    let cumSalesDiff = 0, cumDiscountDiff = 0, cumCustomerDiff = 0
    let totalSalesDiff = 0, totalDiscountDiff = 0, totalCustomerDiff = 0
    const rows: {
      day: number
      salesDiff: number; discountDiff: number; customerDiff: number; txValueDiff: number | null
      cumSalesDiff: number; cumDiscountDiff: number; cumCustomerDiff: number
      salesGrowth: number | null; customerGrowth: number | null; txValueGrowth: number | null
    }[] = []

    for (let d = 1; d <= daysInMonth; d++) {
      const rec = daily.get(d)
      const prev = prevYearDaily.get(d)
      const curSales = rec?.sales ?? 0
      const prevSales = prev?.sales ?? 0
      const curDiscount = rec?.discountAbsolute ?? 0
      const prevDiscount = prev?.discount ?? 0
      const curCustomers = rec?.customers ?? 0
      const prevCustomers = prev?.customers ?? 0

      const salesDiff = curSales - prevSales
      const discountDiff = curDiscount - prevDiscount
      const customerDiff = curCustomers - prevCustomers

      const curTxValue = curCustomers > 0 ? calculateTransactionValue(curSales, curCustomers) : null
      const prevTxValue = prevCustomers > 0 ? calculateTransactionValue(prevSales, prevCustomers) : null
      const txValueDiff = curTxValue != null && prevTxValue != null ? curTxValue - prevTxValue : null

      cumSalesDiff += salesDiff
      cumDiscountDiff += discountDiff
      cumCustomerDiff += customerDiff
      totalSalesDiff += salesDiff
      totalDiscountDiff += discountDiff
      totalCustomerDiff += customerDiff

      const salesGrowth = prevSales > 0 ? safeDivide(curSales - prevSales, prevSales, 0) : null
      const customerGrowth = prevCustomers > 0 ? safeDivide(curCustomers - prevCustomers, prevCustomers, 0) : null
      const txValueGrowth = curTxValue != null && prevTxValue != null && prevTxValue > 0
        ? safeDivide(curTxValue - prevTxValue, prevTxValue, 0) : null

      rows.push({
        day: d,
        salesDiff, discountDiff, customerDiff, txValueDiff,
        cumSalesDiff, cumDiscountDiff, cumCustomerDiff,
        salesGrowth, customerGrowth, txValueGrowth,
      })
    }
    return {
      chartData: rows,
      totals: { salesDiff: totalSalesDiff, discountDiff: totalDiscountDiff, customerDiff: totalCustomerDiff },
    }
  }, [daily, daysInMonth, prevYearDaily])

  const data = chartData.filter(d => d.day >= rangeStart && d.day <= rangeEnd)

  const allLabels: Record<string, string> = {
    salesDiff: '売上差異', discountDiff: '売変差異', customerDiff: '客数差異', txValueDiff: '客単価差異',
    cumSalesDiff: '累計売上差異', cumDiscountDiff: '累計売変差異', cumCustomerDiff: '累計客数差異',
    salesGrowth: '売上成長率', customerGrowth: '客数成長率', txValueGrowth: '客単価成長率',
  }

  return (
    <Wrapper>
      <HeaderRow>
        <Title>{VIEW_TITLES[view]}</Title>
        <ViewToggle>
          {(Object.keys(VIEW_LABELS) as ViewType[]).map((v) => (
            <ViewBtn key={v} $active={view === v} onClick={() => setView(v)}>
              {VIEW_LABELS[v]}
            </ViewBtn>
          ))}
        </ViewToggle>
      </HeaderRow>
      <SummaryRow>
        <SummaryItem $positive={totals.salesDiff >= 0}>
          <SummaryLabel>売上差:</SummaryLabel>
          {totals.salesDiff >= 0 ? '+' : ''}{toComma(totals.salesDiff)}
        </SummaryItem>
        <SummaryItem $positive={totals.discountDiff <= 0}>
          <SummaryLabel>売変差:</SummaryLabel>
          {totals.discountDiff >= 0 ? '+' : ''}{toComma(totals.discountDiff)}
        </SummaryItem>
        <SummaryItem $positive={totals.customerDiff >= 0}>
          <SummaryLabel>客数差:</SummaryLabel>
          {totals.customerDiff >= 0 ? '+' : ''}{toComma(totals.customerDiff)}人
        </SummaryItem>
      </SummaryRow>
      <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="74%">
        <ComposedChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="day"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={{ stroke: ct.grid }}
            tickLine={false}
          />
          <ReferenceLine yAxisId="left" y={0} stroke={ct.grid} strokeOpacity={0.7} />

          {/* Sales gap view */}
          {view === 'salesGap' && (
            <>
              <YAxis
                yAxisId="left"
                tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
                axisLine={false} tickLine={false}
                tickFormatter={(v: number) => toComma(v)}
                width={55}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
                axisLine={false} tickLine={false}
                tickFormatter={(v: number) => toComma(v)}
                width={55}
              />
              <Bar yAxisId="left" dataKey="salesDiff" maxBarSize={16} radius={[2, 2, 0, 0]}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.salesDiff >= 0 ? ct.colors.success : ct.colors.danger} fillOpacity={0.7} />
                ))}
              </Bar>
              <Line yAxisId="right" type="monotone" dataKey="cumSalesDiff" stroke={ct.colors.primary} strokeWidth={2} dot={false} connectNulls />
            </>
          )}

          {/* Multi-gap view */}
          {view === 'multiGap' && (
            <>
              <YAxis
                yAxisId="left"
                tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
                axisLine={false} tickLine={false}
                tickFormatter={(v: number) => toComma(v)}
                width={55}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
                axisLine={false} tickLine={false}
                tickFormatter={(v: number) => `${toComma(v)}人`}
                width={50}
              />
              <Bar yAxisId="left" dataKey="salesDiff" maxBarSize={12} opacity={0.7}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.salesDiff >= 0 ? ct.colors.primary : ct.colors.slateDark} />
                ))}
              </Bar>
              <Line yAxisId="left" type="monotone" dataKey="discountDiff" stroke={ct.colors.danger} strokeWidth={2} dot={false} connectNulls />
              <Line yAxisId="right" type="monotone" dataKey="customerDiff" stroke={ct.colors.info} strokeWidth={2} strokeDasharray="6 3" dot={false} connectNulls />
            </>
          )}

          {/* Growth rate view */}
          {view === 'growthRate' && (
            <>
              <YAxis
                yAxisId="left"
                tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
                axisLine={false} tickLine={false}
                tickFormatter={(v: number) => toPct(v, 0)}
                width={45}
              />
              <Line yAxisId="left" type="monotone" dataKey="salesGrowth" stroke={ct.colors.primary} strokeWidth={2.5} dot={false} connectNulls />
              <Line yAxisId="left" type="monotone" dataKey="customerGrowth" stroke={ct.colors.info} strokeWidth={2} dot={false} connectNulls />
              <Line yAxisId="left" type="monotone" dataKey="txValueGrowth" stroke={ct.colors.purple} strokeWidth={2} strokeDasharray="6 3" dot={false} connectNulls />
            </>
          )}

          <Tooltip
            contentStyle={tooltipStyle(ct)}
            formatter={(value, name) => {
              if (value == null) return ['-', allLabels[name as string] ?? String(name)]
              const n = name as string
              if (n.includes('Growth')) return [toPct(value as number), allLabels[n] ?? n]
              if (n.includes('customer') || n.includes('Customer')) {
                const v = value as number
                return [`${v >= 0 ? '+' : ''}${toComma(v)}人`, allLabels[n] ?? n]
              }
              const v = value as number
              return [`${v >= 0 ? '+' : ''}${toComma(v)}`, allLabels[n] ?? n]
            }}
            labelFormatter={(label) => `${label}日`}
          />
          <Legend
            wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
            formatter={(value) => allLabels[value] ?? value}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <DayRangeSlider min={1} max={daysInMonth} start={rangeStart} end={rangeEnd} onChange={setRange} />
    </Wrapper>
  )
}
