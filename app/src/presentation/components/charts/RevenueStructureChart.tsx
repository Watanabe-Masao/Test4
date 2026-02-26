import { useState, useMemo } from 'react'
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import styled from 'styled-components'
import { useChartTheme, tooltipStyle, useCurrencyFormatter, toComma, toPct } from './chartTheme'
import { DayRangeSlider, useDayRange } from './DayRangeSlider'
import type { DailyRecord } from '@/domain/models'
import { getDailyTotalCost } from '@/domain/models/DailyRecord'
import { safeDivide } from '@/domain/calculations/utils'

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

type ViewType = 'structure' | 'rates' | 'cumulative'

const VIEW_LABELS: Record<ViewType, string> = {
  structure: '構造',
  rates: '率推移',
  cumulative: '累積構成',
}

const VIEW_TITLES: Record<ViewType, string> = {
  structure: '収益構造分析（日別売上 = 純利益 + 原価 + 売変 + 消耗品）',
  rates: '収益性率推移（粗利率・売変率・原価率）',
  cumulative: '累積収益構造（月初からの累計推移）',
}

interface Props {
  daily: ReadonlyMap<number, DailyRecord>
  daysInMonth: number
}

export function RevenueStructureChart({ daily, daysInMonth }: Props) {
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()
  const [view, setView] = useState<ViewType>('structure')
  const [rangeStart, rangeEnd, setRange] = useDayRange(daysInMonth)

  const chartData = useMemo(() => {
    let cumSales = 0, cumCost = 0, cumDiscount = 0, cumConsumable = 0
    const rows: {
      day: number
      sales: number; cost: number; discount: number; consumable: number; margin: number
      discountRate: number; costRate: number; gpRate: number; consumableRate: number
      cumSales: number; cumCost: number; cumDiscount: number; cumConsumable: number; cumMargin: number
    }[] = []

    for (let d = 1; d <= daysInMonth; d++) {
      const rec = daily.get(d)
      const sales = rec?.sales ?? 0
      const grossSales = rec?.grossSales ?? 0
      const cost = rec ? getDailyTotalCost(rec) : 0
      const discount = rec?.discountAbsolute ?? 0
      const consumable = rec?.consumable.cost ?? 0
      const margin = sales - cost - consumable

      cumSales += sales
      cumCost += cost
      cumDiscount += discount
      cumConsumable += consumable
      const cumMargin = cumSales - cumCost - cumConsumable

      rows.push({
        day: d,
        sales, cost, discount, consumable, margin,
        discountRate: safeDivide(discount, grossSales, 0),
        costRate: safeDivide(cost, sales, 0),
        gpRate: safeDivide(margin, sales, 0),
        consumableRate: safeDivide(consumable, sales, 0),
        cumSales, cumCost, cumDiscount, cumConsumable, cumMargin,
      })
    }
    return rows
  }, [daily, daysInMonth])

  const data = chartData.filter(d => d.day >= rangeStart && d.day <= rangeEnd)

  const allLabels: Record<string, string> = {
    margin: '粗利相当', cost: '原価', discount: '売変', consumable: '消耗品',
    gpRate: '粗利率', discountRate: '売変率', costRate: '原価率', consumableRate: '消耗品率',
    cumMargin: '累計粗利', cumCost: '累計原価', cumDiscount: '累計売変', cumConsumable: '累計消耗品',
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
      <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="80%">
        <ComposedChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revMarginGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ct.colors.success} stopOpacity={0.7} />
              <stop offset="100%" stopColor={ct.colors.success} stopOpacity={0.2} />
            </linearGradient>
            <linearGradient id="revCostGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ct.colors.orange} stopOpacity={0.7} />
              <stop offset="100%" stopColor={ct.colors.orange} stopOpacity={0.2} />
            </linearGradient>
            <linearGradient id="revDiscountGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ct.colors.danger} stopOpacity={0.6} />
              <stop offset="100%" stopColor={ct.colors.danger} stopOpacity={0.15} />
            </linearGradient>
            <linearGradient id="revConsumableGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ct.colors.purple} stopOpacity={0.6} />
              <stop offset="100%" stopColor={ct.colors.purple} stopOpacity={0.15} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="day"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={{ stroke: ct.grid }}
            tickLine={false}
          />

          {/* Structure view: stacked area showing revenue decomposition */}
          {view === 'structure' && (
            <>
              <YAxis
                yAxisId="left"
                tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
                axisLine={false} tickLine={false}
                tickFormatter={fmt}
                width={55}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
                axisLine={false} tickLine={false}
                tickFormatter={(v: number) => toPct(v)}
                width={45}
              />
              <Area yAxisId="left" type="monotone" dataKey="margin" stackId="rev" fill="url(#revMarginGrad)" stroke={ct.colors.success} strokeWidth={0} />
              <Area yAxisId="left" type="monotone" dataKey="cost" stackId="rev" fill="url(#revCostGrad)" stroke={ct.colors.orange} strokeWidth={0} />
              <Area yAxisId="left" type="monotone" dataKey="consumable" stackId="rev" fill="url(#revConsumableGrad)" stroke={ct.colors.purple} strokeWidth={0} />
              <Area yAxisId="left" type="monotone" dataKey="discount" stackId="rev" fill="url(#revDiscountGrad)" stroke={ct.colors.danger} strokeWidth={0} />
              <Line yAxisId="right" type="monotone" dataKey="gpRate" stroke={ct.colors.successDark} strokeWidth={2} dot={false} connectNulls />
            </>
          )}

          {/* Rates view: profitability rate trends */}
          {view === 'rates' && (
            <>
              <YAxis
                yAxisId="left"
                tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
                axisLine={false} tickLine={false}
                tickFormatter={(v: number) => toPct(v)}
                width={50}
              />
              <Line yAxisId="left" type="monotone" dataKey="gpRate" stroke={ct.colors.success} strokeWidth={2.5} dot={false} connectNulls />
              <Line yAxisId="left" type="monotone" dataKey="costRate" stroke={ct.colors.orange} strokeWidth={2} dot={false} connectNulls />
              <Line yAxisId="left" type="monotone" dataKey="discountRate" stroke={ct.colors.danger} strokeWidth={2} dot={false} connectNulls />
              <Line yAxisId="left" type="monotone" dataKey="consumableRate" stroke={ct.colors.purple} strokeWidth={1.5} strokeDasharray="4 2" dot={false} connectNulls />
            </>
          )}

          {/* Cumulative view: stacked area showing monthly progression */}
          {view === 'cumulative' && (
            <>
              <YAxis
                yAxisId="left"
                tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
                axisLine={false} tickLine={false}
                tickFormatter={fmt}
                width={55}
              />
              <Area yAxisId="left" type="monotone" dataKey="cumMargin" stackId="cum" fill="url(#revMarginGrad)" stroke={ct.colors.success} strokeWidth={1} />
              <Area yAxisId="left" type="monotone" dataKey="cumCost" stackId="cum" fill="url(#revCostGrad)" stroke={ct.colors.orange} strokeWidth={1} />
              <Area yAxisId="left" type="monotone" dataKey="cumConsumable" stackId="cum" fill="url(#revConsumableGrad)" stroke={ct.colors.purple} strokeWidth={1} />
              <Area yAxisId="left" type="monotone" dataKey="cumDiscount" stackId="cum" fill="url(#revDiscountGrad)" stroke={ct.colors.danger} strokeWidth={1} />
            </>
          )}

          <Tooltip
            contentStyle={tooltipStyle(ct)}
            formatter={(value, name) => {
              if (value == null) return ['-', allLabels[name as string] ?? String(name)]
              const n = name as string
              if (n.includes('Rate')) return [toPct(value as number), allLabels[n] ?? n]
              return [toComma(value as number), allLabels[n] ?? n]
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
