/**
 * 前年比較ウォーターフォールチャート
 *
 * 前年売上 → 客数効果 → 客単価効果 → 当年売上 の要因分解を表示。
 * 分類別時間帯データがある場合は部門別の増減も表示する。
 */
import { useState, useMemo } from 'react'
import styled from 'styled-components'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  ResponsiveContainer, ReferenceLine, LabelList,
} from 'recharts'
import { useChartTheme, tooltipStyle, toManYen } from '@/presentation/components/charts'
import { formatCurrency, formatPercent, safeDivide } from '@/domain/calculations/utils'
import { CategoryFactorBreakdown, decomposePriceMix } from './CategoryFactorBreakdown'
import type { WidgetContext } from './types'

const Wrapper = styled.div`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]};
`

const Title = styled.h4`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

const Subtitle = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

const TabRow = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

const TabBtn = styled.button<{ $active: boolean }>`
  padding: 4px 12px;
  border-radius: 4px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ $active, theme }) => $active ? theme.colors.palette.primary : theme.colors.bg2};
  color: ${({ $active, theme }) => $active ? '#fff' : theme.colors.text};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  cursor: pointer;
  &:hover { opacity: 0.8; }
`

const SummaryRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

const SummaryItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const SummaryLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text2};
`

const SummaryValue = styled.span<{ $color?: string }>`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ $color, theme }) => $color ?? theme.colors.text};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

interface WaterfallItem {
  name: string
  value: number
  base: number
  bar: number
  isTotal?: boolean
}

type ViewMode = 'factor' | 'category' | 'categoryFactor'
type DecompLevel = 2 | 3 | 5

const DecompRow = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`

const DecompBtn = styled.button<{ $active: boolean }>`
  padding: 3px 10px;
  border-radius: 12px;
  border: 1px solid ${({ $active, theme }) => $active ? theme.colors.palette.primary : theme.colors.border};
  background: ${({ $active, theme }) => $active ? theme.colors.palette.primary + '18' : 'transparent'};
  color: ${({ $active, theme }) => $active ? theme.colors.palette.primary : theme.colors.text2};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  cursor: pointer;
  font-weight: ${({ $active }) => $active ? 600 : 400};
  &:hover { opacity: 0.8; }
`

export function YoYWaterfallChartWidget({ ctx }: { ctx: WidgetContext }) {
  const r = ctx.result
  const prevYear = ctx.prevYear
  const ct = useChartTheme()
  const [viewMode, setViewMode] = useState<ViewMode>('factor')
  const [decompLevel, setDecompLevel] = useState<DecompLevel | null>(null)

  // Aggregate total quantity from CTS records
  const curTotalQty = useMemo(() => {
    const recs = ctx.categoryTimeSales?.records
    if (!recs?.length) return 0
    return recs.reduce((s, r) => s + r.totalQuantity, 0)
  }, [ctx.categoryTimeSales])

  const prevTotalQty = useMemo(() => {
    const recs = ctx.prevYearCategoryTimeSales?.records
    if (!recs?.length) return 0
    return recs.reduce((s, r) => s + r.totalQuantity, 0)
  }, [ctx.prevYearCategoryTimeSales])

  const hasQuantity = curTotalQty > 0 && prevTotalQty > 0

  // Price/Mix decomposition of unit price change
  const priceMix = useMemo(() => {
    const curRecs = ctx.categoryTimeSales?.records
    const prevRecs = ctx.prevYearCategoryTimeSales?.records
    if (!curRecs?.length || !prevRecs?.length) return null
    return decomposePriceMix(curRecs, prevRecs)
  }, [ctx.categoryTimeSales, ctx.prevYearCategoryTimeSales])

  // Available decomposition levels
  const maxLevel: DecompLevel = priceMix ? 5 : hasQuantity ? 3 : 2
  const activeLevel = decompLevel ?? maxLevel

  // Factor decomposition data
  const factorData = useMemo((): WaterfallItem[] => {
    if (!prevYear.hasPrevYear || prevYear.totalSales <= 0) return []

    const prevSales = prevYear.totalSales
    const curSales = r.totalSales
    const prevCust = prevYear.totalCustomers
    const curCust = r.totalCustomers

    const prevAvgTicket = safeDivide(prevSales, prevCust, 0)

    const items: WaterfallItem[] = []

    // Start: previous year sales
    items.push({
      name: '前年売上',
      value: prevSales,
      base: 0,
      bar: prevSales,
      isTotal: true,
    })

    let running = prevSales

    // Customer effect
    const custEffect = (curCust - prevCust) * prevAvgTicket
    items.push({
      name: '客数効果',
      value: custEffect,
      base: custEffect >= 0 ? running : running + custEffect,
      bar: Math.abs(custEffect),
    })
    running += custEffect

    if (activeLevel === 2) {
      // 2-factor: 客単価効果
      const curAvgTicket = safeDivide(curSales, curCust, 0)
      const ticketEffect = (curAvgTicket - prevAvgTicket) * curCust
      items.push({
        name: '客単価効果',
        value: ticketEffect,
        base: ticketEffect >= 0 ? running : running + ticketEffect,
        bar: Math.abs(ticketEffect),
      })
    } else if (activeLevel === 3 || !priceMix) {
      // 3-factor: 点数効果 + 単価効果
      if (hasQuantity && prevCust > 0 && curCust > 0) {
        const prevQPC = prevTotalQty / prevCust
        const curQPC = curTotalQty / curCust
        const prevPPI = safeDivide(prevSales, prevTotalQty, 0)
        const curPPI = safeDivide(curSales, curTotalQty, 0)

        const qtyEffect = curCust * (curQPC - prevQPC) * prevPPI
        items.push({
          name: '点数効果',
          value: qtyEffect,
          base: qtyEffect >= 0 ? running : running + qtyEffect,
          bar: Math.abs(qtyEffect),
        })
        running += qtyEffect

        const priceEffect = curCust * curQPC * (curPPI - prevPPI)
        items.push({
          name: '単価効果',
          value: priceEffect,
          base: priceEffect >= 0 ? running : running + priceEffect,
          bar: Math.abs(priceEffect),
        })
      } else {
        const curAvgTicket = safeDivide(curSales, curCust, 0)
        const ticketEffect = (curAvgTicket - prevAvgTicket) * curCust
        items.push({
          name: '客単価効果',
          value: ticketEffect,
          base: ticketEffect >= 0 ? running : running + ticketEffect,
          bar: Math.abs(ticketEffect),
        })
      }
    } else {
      // 5-factor: 点数効果 + 価格効果 + ミックス効果
      if (hasQuantity && prevCust > 0 && curCust > 0) {
        const prevQPC = prevTotalQty / prevCust
        const curQPC = curTotalQty / curCust
        const prevPPI = safeDivide(prevSales, prevTotalQty, 0)

        const qtyEffect = curCust * (curQPC - prevQPC) * prevPPI
        items.push({
          name: '点数効果',
          value: qtyEffect,
          base: qtyEffect >= 0 ? running : running + qtyEffect,
          bar: Math.abs(qtyEffect),
        })
        running += qtyEffect

        items.push({
          name: '価格効果',
          value: priceMix.priceEffect,
          base: priceMix.priceEffect >= 0 ? running : running + priceMix.priceEffect,
          bar: Math.abs(priceMix.priceEffect),
        })
        running += priceMix.priceEffect

        items.push({
          name: 'ミックス効果',
          value: priceMix.mixEffect,
          base: priceMix.mixEffect >= 0 ? running : running + priceMix.mixEffect,
          bar: Math.abs(priceMix.mixEffect),
        })
      }
    }

    // End: current year sales
    items.push({
      name: '当年売上',
      value: curSales,
      base: 0,
      bar: curSales,
      isTotal: true,
    })

    return items
  }, [r, prevYear, hasQuantity, curTotalQty, prevTotalQty, priceMix, activeLevel])

  // Category-based decomposition data
  const categoryData = useMemo((): WaterfallItem[] => {
    const cts = ctx.categoryTimeSales
    const prevCTS = ctx.prevYearCategoryTimeSales
    if (!cts?.records?.length || !prevCTS.hasPrevYear || !prevCTS.records.length) return []

    // Aggregate by department
    const curDepts = new Map<string, { name: string; amount: number }>()
    for (const rec of cts.records) {
      const code = rec.department.code
      const ex = curDepts.get(code) ?? { name: rec.department.name || code, amount: 0 }
      ex.amount += rec.totalAmount
      curDepts.set(code, ex)
    }

    const prevDepts = new Map<string, { name: string; amount: number }>()
    for (const rec of prevCTS.records) {
      const code = rec.department.code
      const ex = prevDepts.get(code) ?? { name: rec.department.name || code, amount: 0 }
      ex.amount += rec.totalAmount
      prevDepts.set(code, ex)
    }

    const prevTotal = [...prevDepts.values()].reduce((s, d) => s + d.amount, 0)
    if (prevTotal <= 0) return []

    // Build items sorted by absolute difference (largest impact first)
    const allCodes = new Set([...curDepts.keys(), ...prevDepts.keys()])
    const diffs: { code: string; name: string; diff: number }[] = []
    for (const code of allCodes) {
      const cur = curDepts.get(code)?.amount ?? 0
      const prev = prevDepts.get(code)?.amount ?? 0
      const name = curDepts.get(code)?.name ?? prevDepts.get(code)?.name ?? code
      if (Math.abs(cur - prev) > 0) {
        diffs.push({ code, name, diff: cur - prev })
      }
    }
    diffs.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))

    const items: WaterfallItem[] = []

    // Start: previous year total
    items.push({
      name: '前年合計',
      value: prevTotal,
      base: 0,
      bar: prevTotal,
      isTotal: true,
    })

    // Department differences
    let running = prevTotal
    for (const d of diffs.slice(0, 8)) {
      items.push({
        name: d.name,
        value: d.diff,
        base: d.diff >= 0 ? running : running + d.diff,
        bar: Math.abs(d.diff),
      })
      running += d.diff
    }

    // If there are remaining depts, group as "その他"
    const remainingDiffs = diffs.slice(8)
    if (remainingDiffs.length > 0) {
      const otherDiff = remainingDiffs.reduce((s, d) => s + d.diff, 0)
      if (Math.abs(otherDiff) > 0) {
        items.push({
          name: `その他(${remainingDiffs.length}部門)`,
          value: otherDiff,
          base: otherDiff >= 0 ? running : running + otherDiff,
          bar: Math.abs(otherDiff),
        })
        running += otherDiff
      }
    }

    // End: current year total
    const curTotal = [...curDepts.values()].reduce((s, d) => s + d.amount, 0)
    items.push({
      name: '当年合計',
      value: curTotal,
      base: 0,
      bar: curTotal,
      isTotal: true,
    })

    return items
  }, [ctx.categoryTimeSales, ctx.prevYearCategoryTimeSales])

  if (!prevYear.hasPrevYear || prevYear.totalSales <= 0) return null

  const hasCategoryView = categoryData.length > 0
  const hasCategoryFactorView = hasQuantity && hasCategoryView
  const data = viewMode === 'category' && hasCategoryView ? categoryData : factorData
  if (data.length === 0 && viewMode !== 'categoryFactor') return null

  const yoyRatio = safeDivide(r.totalSales, prevYear.totalSales, 0)
  const yoyDiff = r.totalSales - prevYear.totalSales

  const colors = {
    positive: '#22c55e',
    negative: '#ef4444',
    total: ct.colors.primary,
  }

  return (
    <Wrapper>
      <Title>前年比較ウォーターフォール（要因分解）</Title>
      <Subtitle>
        前年売上から当年売上への変動要因を可視化
      </Subtitle>

      {(hasCategoryView || hasCategoryFactorView) && (
        <TabRow>
          <TabBtn $active={viewMode === 'factor'} onClick={() => setViewMode('factor')}>
            要因分解
          </TabBtn>
          {hasCategoryView && (
            <TabBtn $active={viewMode === 'category'} onClick={() => setViewMode('category')}>
              部門別増減
            </TabBtn>
          )}
          {hasCategoryFactorView && (
            <TabBtn $active={viewMode === 'categoryFactor'} onClick={() => setViewMode('categoryFactor')}>
              部門別要因分解
            </TabBtn>
          )}
        </TabRow>
      )}

      {viewMode === 'factor' && maxLevel >= 3 && (
        <DecompRow>
          <DecompBtn $active={activeLevel === 2} onClick={() => setDecompLevel(2)}>
            客数・客単価
          </DecompBtn>
          <DecompBtn $active={activeLevel === 3} onClick={() => setDecompLevel(3)}>
            客数・点数・単価
          </DecompBtn>
          {maxLevel === 5 && (
            <DecompBtn $active={activeLevel === 5} onClick={() => setDecompLevel(5)}>
              5要素（価格+ミックス）
            </DecompBtn>
          )}
        </DecompRow>
      )}

      <SummaryRow>
        <SummaryItem>
          <SummaryLabel>前年売上</SummaryLabel>
          <SummaryValue>{formatCurrency(prevYear.totalSales)}</SummaryValue>
        </SummaryItem>
        <SummaryItem>
          <SummaryLabel>当年売上</SummaryLabel>
          <SummaryValue>{formatCurrency(r.totalSales)}</SummaryValue>
        </SummaryItem>
        <SummaryItem>
          <SummaryLabel>前年差</SummaryLabel>
          <SummaryValue $color={yoyDiff >= 0 ? '#22c55e' : '#ef4444'}>
            {yoyDiff >= 0 ? '+' : ''}{formatCurrency(yoyDiff)}
          </SummaryValue>
        </SummaryItem>
        <SummaryItem>
          <SummaryLabel>前年比</SummaryLabel>
          <SummaryValue $color={yoyRatio >= 1 ? '#22c55e' : '#ef4444'}>
            {formatPercent(yoyRatio)}
          </SummaryValue>
        </SummaryItem>
      </SummaryRow>

      {viewMode === 'categoryFactor' ? (
        <CategoryFactorBreakdown
          curRecords={ctx.categoryTimeSales?.records ?? []}
          prevRecords={ctx.prevYearCategoryTimeSales?.records ?? []}
          curCustomers={r.totalCustomers}
          prevCustomers={prevYear.totalCustomers}
        />
      ) : (
        <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height={360}>
          <BarChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: ct.fontSize.sm, fill: ct.text, fontFamily: ct.fontFamily }}
              axisLine={{ stroke: ct.grid }}
              tickLine={false}
              interval={0}
              angle={data.length > 6 ? -30 : 0}
              textAnchor={data.length > 6 ? 'end' : 'middle'}
              height={data.length > 6 ? 60 : 30}
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
                style={{ fontSize: ct.fontSize.xs, fill: ct.text, fontFamily: ct.monoFamily }}
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
    </Wrapper>
  )
}
