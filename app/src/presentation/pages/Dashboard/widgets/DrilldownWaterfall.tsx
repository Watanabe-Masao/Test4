/**
 * ドリルダウン前年比較ウォーターフォール
 *
 * DayDetailModal 内で日別の前年比較要因分解を表示する。
 * 客数効果 / 客単価効果 / 部門別増減の2ビューを提供。
 */
import { useState, useMemo } from 'react'
import styled from 'styled-components'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  ResponsiveContainer, ReferenceLine, LabelList,
} from 'recharts'
import { useChartTheme, tooltipStyle, toManYen } from '@/presentation/components/charts'
import { formatCurrency, safeDivide } from '@/domain/calculations/utils'
import { CategoryFactorBreakdown, decomposePriceMix } from './CategoryFactorBreakdown'
import type { CategoryTimeSalesRecord } from '@/domain/models'
import { DetailSectionTitle } from '../DashboardPage.styles'

const Section = styled.div`
  margin-top: 8px;
`

const TabRow = styled.div`
  display: flex;
  gap: 4px;
  margin: 8px 0;
`

const TabBtn = styled.button<{ $active: boolean }>`
  padding: 3px 10px;
  border-radius: 4px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ $active, theme }) => $active ? theme.colors.palette.primary : theme.colors.bg2};
  color: ${({ $active, theme }) => $active ? '#fff' : theme.colors.text};
  font-size: 0.65rem;
  cursor: pointer;
  &:hover { opacity: 0.8; }
`

interface WaterfallItem {
  name: string
  value: number
  base: number
  bar: number
  isTotal?: boolean
}

type ViewMode = 'factor' | 'category' | 'categoryFactor'

export function DrilldownWaterfall({
  actual, pySales, dayCust, pyCust,
  dayRecords, prevDayRecords,
}: {
  actual: number
  pySales: number
  dayCust: number
  pyCust: number
  dayRecords: readonly CategoryTimeSalesRecord[]
  prevDayRecords: readonly CategoryTimeSalesRecord[]
}) {
  const ct = useChartTheme()
  const [viewMode, setViewMode] = useState<ViewMode>('factor')

  // Aggregate total quantity from day records
  const curTotalQty = useMemo(() =>
    dayRecords.reduce((s, r) => s + r.totalQuantity, 0), [dayRecords])
  const prevTotalQty = useMemo(() =>
    prevDayRecords.reduce((s, r) => s + r.totalQuantity, 0), [prevDayRecords])
  const hasQuantity = curTotalQty > 0 && prevTotalQty > 0

  // Price/Mix decomposition
  const priceMix = useMemo(() => {
    if (dayRecords.length === 0 || prevDayRecords.length === 0) return null
    return decomposePriceMix(dayRecords, prevDayRecords)
  }, [dayRecords, prevDayRecords])

  const factorData = useMemo((): WaterfallItem[] => {
    if (pySales <= 0) return []

    const prevAvgTicket = safeDivide(pySales, pyCust, 0)

    const items: WaterfallItem[] = []

    items.push({ name: '前年', value: pySales, base: 0, bar: pySales, isTotal: true })

    let running = pySales
    if (pyCust > 0 && dayCust > 0) {
      // Customer effect
      const custEffect = (dayCust - pyCust) * prevAvgTicket
      items.push({
        name: '客数効果',
        value: custEffect,
        base: custEffect >= 0 ? running : running + custEffect,
        bar: Math.abs(custEffect),
      })
      running += custEffect

      if (hasQuantity) {
        const prevQPC = prevTotalQty / pyCust
        const curQPC = curTotalQty / dayCust
        const prevPPI = safeDivide(pySales, prevTotalQty, 0)

        const qtyEffect = dayCust * (curQPC - prevQPC) * prevPPI
        items.push({
          name: '点数効果',
          value: qtyEffect,
          base: qtyEffect >= 0 ? running : running + qtyEffect,
          bar: Math.abs(qtyEffect),
        })
        running += qtyEffect

        if (priceMix) {
          // Price effect (値上げ/値下げ)
          items.push({
            name: '価格効果',
            value: priceMix.priceEffect,
            base: priceMix.priceEffect >= 0 ? running : running + priceMix.priceEffect,
            bar: Math.abs(priceMix.priceEffect),
          })
          running += priceMix.priceEffect

          // Mix effect (構成比変化)
          items.push({
            name: 'ミックス',
            value: priceMix.mixEffect,
            base: priceMix.mixEffect >= 0 ? running : running + priceMix.mixEffect,
            bar: Math.abs(priceMix.mixEffect),
          })
          running += priceMix.mixEffect
        } else {
          const curPPI = safeDivide(actual, curTotalQty, 0)
          const priceEffect = dayCust * curQPC * (curPPI - prevPPI)
          items.push({
            name: '単価効果',
            value: priceEffect,
            base: priceEffect >= 0 ? running : running + priceEffect,
            bar: Math.abs(priceEffect),
          })
          running += priceEffect
        }
      } else {
        const curAvgTicket = safeDivide(actual, dayCust, 0)
        const ticketEffect = (curAvgTicket - prevAvgTicket) * dayCust
        items.push({
          name: '客単価効果',
          value: ticketEffect,
          base: ticketEffect >= 0 ? running : running + ticketEffect,
          bar: Math.abs(ticketEffect),
        })
      }
    } else {
      const diff = actual - pySales
      items.push({
        name: '増減',
        value: diff,
        base: diff >= 0 ? running : running + diff,
        bar: Math.abs(diff),
      })
    }

    items.push({ name: '当年', value: actual, base: 0, bar: actual, isTotal: true })

    return items
  }, [actual, pySales, dayCust, pyCust, hasQuantity, curTotalQty, prevTotalQty, priceMix])

  const categoryData = useMemo((): WaterfallItem[] => {
    if (dayRecords.length === 0 || prevDayRecords.length === 0) return []

    const curDepts = new Map<string, { name: string; amount: number }>()
    for (const rec of dayRecords) {
      const code = rec.department.code
      const ex = curDepts.get(code) ?? { name: rec.department.name || code, amount: 0 }
      ex.amount += rec.totalAmount
      curDepts.set(code, ex)
    }

    const prevDepts = new Map<string, { name: string; amount: number }>()
    for (const rec of prevDayRecords) {
      const code = rec.department.code
      const ex = prevDepts.get(code) ?? { name: rec.department.name || code, amount: 0 }
      ex.amount += rec.totalAmount
      prevDepts.set(code, ex)
    }

    const prevTotal = [...prevDepts.values()].reduce((s, d) => s + d.amount, 0)
    if (prevTotal <= 0) return []

    const allCodes = new Set([...curDepts.keys(), ...prevDepts.keys()])
    const diffs: { name: string; diff: number }[] = []
    for (const code of allCodes) {
      const cur = curDepts.get(code)?.amount ?? 0
      const prev = prevDepts.get(code)?.amount ?? 0
      const name = curDepts.get(code)?.name ?? prevDepts.get(code)?.name ?? code
      if (Math.abs(cur - prev) > 0) {
        diffs.push({ name, diff: cur - prev })
      }
    }
    diffs.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))

    const items: WaterfallItem[] = []
    items.push({ name: '前年', value: prevTotal, base: 0, bar: prevTotal, isTotal: true })

    let running = prevTotal
    for (const d of diffs.slice(0, 6)) {
      items.push({
        name: d.name,
        value: d.diff,
        base: d.diff >= 0 ? running : running + d.diff,
        bar: Math.abs(d.diff),
      })
      running += d.diff
    }

    const rest = diffs.slice(6)
    if (rest.length > 0) {
      const otherDiff = rest.reduce((s, d) => s + d.diff, 0)
      if (Math.abs(otherDiff) > 0) {
        items.push({
          name: `他(${rest.length})`,
          value: otherDiff,
          base: otherDiff >= 0 ? running : running + otherDiff,
          bar: Math.abs(otherDiff),
        })
        running += otherDiff
      }
    }

    const curTotal = [...curDepts.values()].reduce((s, d) => s + d.amount, 0)
    items.push({ name: '当年', value: curTotal, base: 0, bar: curTotal, isTotal: true })

    return items
  }, [dayRecords, prevDayRecords])

  if (pySales <= 0 || factorData.length === 0) return null

  const hasCategoryView = categoryData.length > 0
  const hasCategoryFactorView = hasQuantity && dayRecords.length > 0 && prevDayRecords.length > 0
  const data = viewMode === 'category' && hasCategoryView ? categoryData : factorData

  const colors = {
    positive: '#22c55e',
    negative: '#ef4444',
    total: '#6366f1',
  }

  return (
    <Section>
      <DetailSectionTitle>前年比較ウォーターフォール</DetailSectionTitle>

      {(hasCategoryView || hasCategoryFactorView) && (
        <TabRow>
          <TabBtn $active={viewMode === 'factor'} onClick={() => setViewMode('factor')}>
            {priceMix ? '5要素分解' : hasQuantity ? '客数・点数・単価' : '客数・客単価'}
          </TabBtn>
          {hasCategoryView && (
            <TabBtn $active={viewMode === 'category'} onClick={() => setViewMode('category')}>
              部門別増減
            </TabBtn>
          )}
          {hasCategoryFactorView && (
            <TabBtn $active={viewMode === 'categoryFactor'} onClick={() => setViewMode('categoryFactor')}>
              部門別要因
            </TabBtn>
          )}
        </TabRow>
      )}

      {viewMode === 'categoryFactor' ? (
        <CategoryFactorBreakdown
          curRecords={dayRecords}
          prevRecords={prevDayRecords}
          curCustomers={dayCust}
          prevCustomers={pyCust}
          compact
        />
      ) : (
        <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height={240}>
          <BarChart data={data} margin={{ top: 16, right: 12, left: 12, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: ct.fontSize.xs, fill: ct.text, fontFamily: ct.fontFamily }}
              axisLine={{ stroke: ct.grid }}
              tickLine={false}
              interval={0}
              angle={data.length > 5 ? -25 : 0}
              textAnchor={data.length > 5 ? 'end' : 'middle'}
              height={data.length > 5 ? 50 : 25}
            />
            <YAxis
              tick={{ fontSize: ct.fontSize.xs, fill: ct.textSecondary, fontFamily: ct.monoFamily }}
              axisLine={false}
              tickLine={false}
              tickFormatter={toManYen}
            />
            <Tooltip
              contentStyle={tooltipStyle(ct)}
              formatter={(_value: unknown, _name: unknown, props: { payload?: WaterfallItem }) => {
                const item = props.payload
                if (!item) return ['-', '-']
                return [formatCurrency(item.value), item.name]
              }}
            />
            <ReferenceLine y={0} stroke={ct.grid} />
            <Bar dataKey="base" stackId="waterfall" fill="transparent" isAnimationActive={false} />
            <Bar dataKey="bar" stackId="waterfall" radius={[3, 3, 0, 0]}>
              <LabelList
                dataKey="value"
                position="top"
                formatter={(v: unknown) => toManYen(Number(v))}
                style={{ fontSize: 9, fill: ct.text, fontFamily: ct.monoFamily }}
              />
              {data.map((item, idx) => (
                <Cell
                  key={idx}
                  fill={item.isTotal ? colors.total : item.value >= 0 ? colors.positive : colors.negative}
                  opacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Section>
  )
}
