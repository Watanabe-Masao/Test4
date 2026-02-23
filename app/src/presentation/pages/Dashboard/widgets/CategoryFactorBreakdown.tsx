/**
 * カテゴリ別要因分解チャート
 *
 * 部門→ライン→クラスの各階層で要因分解を横棒グラフ+テーブルで表示。
 * クリックで下位階層にドリルダウン可能。
 * 2要素(客数・客単価) / 3要素(客数・点数・単価) / 5要素(+価格・構成比変化) を切替可能。
 */
import { useState, useMemo, useCallback, Fragment } from 'react'
import styled from 'styled-components'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import { useChartTheme, useCurrencyFormatter } from '@/presentation/components/charts'
import { formatCurrency } from '@/domain/calculations/utils'
import {
  decompose2,
  decompose3,
  decompose5 as decompose5Domain,
  decomposePriceMix as decomposePriceMixDomain,
} from '@/domain/calculations/factorDecomposition'
import type { CategoryQtyAmt } from '@/domain/calculations/factorDecomposition'
import type { CategoryTimeSalesRecord } from '@/domain/models'

/* ── Styled ─────────────────────────────────────────── */

const Breadcrumb = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  margin-bottom: 8px;
  flex-wrap: wrap;
`

const BreadcrumbItem = styled.button<{ $active?: boolean }>`
  background: none;
  border: none;
  padding: 2px 6px;
  font-size: 0.7rem;
  cursor: pointer;
  color: ${({ $active, theme }) => $active ? theme.colors.text : theme.colors.palette.primary};
  font-weight: ${({ $active }) => $active ? 600 : 400};
  text-decoration: ${({ $active }) => $active ? 'none' : 'underline'};
  &:hover { opacity: 0.7; }
`

const BreadcrumbSep = styled.span`
  font-size: 0.65rem;
  color: ${({ theme }) => theme.colors.text3};
`

const LegendRow = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 6px;
  justify-content: center;
`

const LegendItem = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.65rem;
  color: ${({ theme }) => theme.colors.text2};
`

const LegendDot = styled.span<{ $color: string }>`
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 2px;
  background: ${({ $color }) => $color};
`

const DecompRow = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: 6px;
`

const DecompBtn = styled.button<{ $active: boolean }>`
  padding: 2px 8px;
  border-radius: 10px;
  border: 1px solid ${({ $active, theme }) => $active ? theme.colors.palette.primary : theme.colors.border};
  background: ${({ $active, theme }) => $active ? theme.colors.palette.primary + '18' : 'transparent'};
  color: ${({ $active, theme }) => $active ? theme.colors.palette.primary : theme.colors.text2};
  font-size: 0.6rem;
  cursor: pointer;
  font-weight: ${({ $active }) => $active ? 600 : 400};
  &:hover { opacity: 0.8; }
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.65rem;
  margin-top: 8px;

  th, td {
    padding: 4px 6px;
    text-align: right;
    white-space: nowrap;
  }

  th {
    color: ${({ theme }) => theme.colors.text3};
    font-weight: 500;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }

  td:first-child, th:first-child {
    text-align: left;
  }

  tbody tr {
    border-bottom: 1px solid ${({ theme }) => theme.colors.bg4};
  }

  tbody tr:hover {
    background: ${({ theme }) => theme.colors.bg2};
  }
`

const DrillIcon = styled.span`
  color: ${({ theme }) => theme.colors.text3};
  font-size: 0.6rem;
  margin-left: 2px;
`

const NameCell = styled.td<{ $clickable: boolean }>`
  cursor: ${({ $clickable }) => $clickable ? 'pointer' : 'default'};
  color: ${({ $clickable, theme }) => $clickable ? theme.colors.palette.primary : theme.colors.text};
  font-weight: 500;
  &:hover {
    ${({ $clickable }) => $clickable && 'text-decoration: underline;'}
  }
`

const ValCell = styled.td<{ $color?: string }>`
  color: ${({ $color, theme }) => $color ?? theme.colors.text};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

/* ── Tooltip ────────────────────────────────────────── */

const TipBox = styled.div`
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 0.7rem;
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.5;
`

const TipTitle = styled.div`
  font-weight: 600;
  margin-bottom: 4px;
`

const TipRow = styled.div<{ $color?: string }>`
  color: ${({ $color }) => $color ?? 'inherit'};
`

const TipHint = styled.div`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text3};
  margin-top: 4px;
`

/* ── Types ──────────────────────────────────────────── */

type DecompLevel = 2 | 3 | 5

interface FactorItem {
  name: string
  code: string
  _level: DecompLevel
  // Level 2
  custEffect: number
  ticketEffect: number
  // Level 3
  qtyEffect: number
  priceEffect: number
  // Level 5
  pricePureEffect: number
  mixEffect: number
  // Common
  totalChange: number
  prevAmount: number
  curAmount: number
  hasChildren: boolean
}

/** Waterfall range [start, end] per effect for horizontal sub-waterfall */
interface WaterfallFactorItem extends FactorItem {
  custRange: [number, number]
  ticketRange: [number, number]
  qtyRange: [number, number]
  priceRange: [number, number]
  pricePureRange: [number, number]
  mixRange: [number, number]
}

type DrillLevel = 'dept' | 'line' | 'class'

interface PathEntry {
  level: DrillLevel
  code: string
  name: string
}

/* ── Price/Mix decomposition helper ─────────────────── */

export function recordsToCategoryQtyAmt(
  records: readonly CategoryTimeSalesRecord[],
): CategoryQtyAmt[] {
  return records.map(r => ({
    key: `${r.department.code}|${r.line.code}|${r.klass.code}`,
    qty: r.totalQuantity,
    amt: r.totalAmount,
  }))
}

/**
 * CategoryTimeSalesRecord[] を受け取り、ドメイン層の decomposePriceMix に委譲する。
 */
export function decomposePriceMix(
  curRecords: readonly CategoryTimeSalesRecord[],
  prevRecords: readonly CategoryTimeSalesRecord[],
): { priceEffect: number; mixEffect: number } | null {
  return decomposePriceMixDomain(
    recordsToCategoryQtyAmt(curRecords),
    recordsToCategoryQtyAmt(prevRecords),
  )
}

const COLORS = {
  cust: '#8b5cf6',
  ticket: '#6366f1',
  qty: '#3b82f6',
  price: '#f59e0b',
  mix: '#14b8a6',
} as const

const valColor = (v: number) => v >= 0 ? '#22c55e' : '#ef4444'

/* eslint-disable @typescript-eslint/no-explicit-any */
function FactorTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const item = payload[0]?.payload as FactorItem | undefined
  if (!item) return null
  const lvl = item._level
  return (
    <TipBox>
      <TipTitle>{item.name}</TipTitle>
      <TipRow>前年: {formatCurrency(item.prevAmount)}</TipRow>
      <TipRow>当年: {formatCurrency(item.curAmount)}</TipRow>
      <TipRow $color={valColor(item.totalChange)}>
        増減: {item.totalChange >= 0 ? '+' : ''}{formatCurrency(item.totalChange)}
      </TipRow>
      {item.custEffect !== 0 && (
        <TipRow $color={COLORS.cust}>
          客数効果: {item.custEffect >= 0 ? '+' : ''}{formatCurrency(Math.round(item.custEffect))}
        </TipRow>
      )}
      {lvl === 2 && (
        <TipRow $color={COLORS.ticket}>
          客単価効果: {item.ticketEffect >= 0 ? '+' : ''}{formatCurrency(Math.round(item.ticketEffect))}
        </TipRow>
      )}
      {lvl === 3 && (
        <>
          <TipRow $color={COLORS.qty}>
            点数効果: {item.qtyEffect >= 0 ? '+' : ''}{formatCurrency(Math.round(item.qtyEffect))}
          </TipRow>
          <TipRow $color={COLORS.price}>
            単価効果: {item.priceEffect >= 0 ? '+' : ''}{formatCurrency(Math.round(item.priceEffect))}
          </TipRow>
        </>
      )}
      {lvl === 5 && (
        <>
          <TipRow $color={COLORS.qty}>
            点数効果: {item.qtyEffect >= 0 ? '+' : ''}{formatCurrency(Math.round(item.qtyEffect))}
          </TipRow>
          <TipRow $color={COLORS.price}>
            価格効果: {item.pricePureEffect >= 0 ? '+' : ''}{formatCurrency(Math.round(item.pricePureEffect))}
          </TipRow>
          <TipRow $color={COLORS.mix}>
            構成比変化効果: {item.mixEffect >= 0 ? '+' : ''}{formatCurrency(Math.round(item.mixEffect))}
          </TipRow>
        </>
      )}
      {item.hasChildren && <TipHint>クリックでドリルダウン</TipHint>}
    </TipBox>
  )
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/* ── Component ──────────────────────────────────────── */

export function CategoryFactorBreakdown({
  curRecords,
  prevRecords,
  curCustomers = 0,
  prevCustomers = 0,
  compact = false,
}: {
  curRecords: readonly CategoryTimeSalesRecord[]
  prevRecords: readonly CategoryTimeSalesRecord[]
  curCustomers?: number
  prevCustomers?: number
  compact?: boolean
}) {
  const hasCust = curCustomers > 0 && prevCustomers > 0
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()
  const [drillPath, setDrillPath] = useState<PathEntry[]>([])
  const [decompLevel, setDecompLevel] = useState<DecompLevel | null>(null)

  const currentLevel: DrillLevel =
    drillPath.length === 0 ? 'dept' : drillPath.length === 1 ? 'line' : 'class'

  // Filter records by drill path
  const filtered = useMemo(() => {
    let fc = curRecords
    let fp = prevRecords
    for (const entry of drillPath) {
      if (entry.level === 'dept') {
        fc = fc.filter(r => r.department.code === entry.code)
        fp = fp.filter(r => r.department.code === entry.code)
      } else if (entry.level === 'line') {
        fc = fc.filter(r => r.line.code === entry.code)
        fp = fp.filter(r => r.line.code === entry.code)
      }
    }
    return { cur: fc, prev: fp }
  }, [curRecords, prevRecords, drillPath])

  // Check if level 5 is available (need sub-categories)
  const hasSubCategories = useMemo(() => {
    if (currentLevel === 'class') return false
    const childKeys = new Set<string>()
    for (const r of filtered.cur) {
      if (currentLevel === 'dept') {
        childKeys.add(`${r.department.code}|${r.line.code}`)
      } else {
        childKeys.add(`${r.line.code}|${r.klass.code}`)
      }
      if (childKeys.size > 1) return true
    }
    return false
  }, [filtered.cur, currentLevel])

  const maxLevel: DecompLevel = hasSubCategories ? 5 : 3
  const activeLevel = decompLevel !== null && decompLevel <= maxLevel ? decompLevel : maxLevel

  // Compute factor items
  const items = useMemo((): FactorItem[] => {
    const keyOf = (r: CategoryTimeSalesRecord) => {
      if (currentLevel === 'dept') return { code: r.department.code, name: r.department.name || r.department.code }
      if (currentLevel === 'line') return { code: r.line.code, name: r.line.name || r.line.code }
      return { code: r.klass.code, name: r.klass.name || r.klass.code }
    }

    const curG = new Map<string, { name: string; qty: number; amt: number }>()
    for (const r of filtered.cur) {
      const k = keyOf(r)
      const ex = curG.get(k.code) ?? { name: k.name, qty: 0, amt: 0 }
      ex.qty += r.totalQuantity; ex.amt += r.totalAmount
      curG.set(k.code, ex)
    }

    const prevG = new Map<string, { name: string; qty: number; amt: number }>()
    for (const r of filtered.prev) {
      const k = keyOf(r)
      const ex = prevG.get(k.code) ?? { name: k.name, qty: 0, amt: 0 }
      ex.qty += r.totalQuantity; ex.amt += r.totalAmount
      prevG.set(k.code, ex)
    }

    const childCheck = (code: string): boolean => {
      if (currentLevel === 'class') return false
      if (currentLevel === 'dept') {
        const lines = new Set<string>()
        for (const r of filtered.cur) {
          if (r.department.code === code) lines.add(r.line.code)
          if (lines.size > 1) return true
        }
        return false
      }
      const klasses = new Set<string>()
      for (const r of filtered.cur) {
        if (r.line.code === code) klasses.add(r.klass.code)
        if (klasses.size > 1) return true
      }
      return false
    }

    // Helper: get child-level key for sub-category decomposition
    const childKeyOf = (r: CategoryTimeSalesRecord) => {
      if (currentLevel === 'dept') return `${r.line.code}|${r.klass.code}`
      return r.klass.code
    }

    // Helper: filter records by group code at current level
    const filterByGroup = (recs: readonly CategoryTimeSalesRecord[], code: string) => {
      if (currentLevel === 'dept') return recs.filter(r => r.department.code === code)
      if (currentLevel === 'line') return recs.filter(r => r.line.code === code)
      return recs.filter(r => r.klass.code === code)
    }

    const allCodes = new Set([...curG.keys(), ...prevG.keys()])
    const result: FactorItem[] = []

    for (const code of allCodes) {
      const c = curG.get(code)
      const p = prevG.get(code)
      const cQty = c?.qty ?? 0, cAmt = c?.amt ?? 0
      const pQty = p?.qty ?? 0, pAmt = p?.amt ?? 0
      const name = c?.name ?? p?.name ?? code

      let custEffect = 0
      let ticketEffect = 0
      let qtyEffect = 0
      let priceEffect = 0
      let pricePureEffect = 0
      let mixEffect = 0

      if (activeLevel === 2) {
        // 2-factor Shapley: 客数効果 + 客単価効果
        if (hasCust && pAmt > 0) {
          const d = decompose2(pAmt, cAmt, prevCustomers, curCustomers)
          custEffect = d.custEffect
          ticketEffect = d.ticketEffect
        } else {
          ticketEffect = cAmt - pAmt
        }
      } else if (activeLevel === 3) {
        // 3-factor Shapley: 客数効果 + 点数効果 + 単価効果
        if (hasCust && pQty > 0) {
          const d = decompose3(pAmt, cAmt, prevCustomers, curCustomers, pQty, cQty)
          custEffect = d.custEffect
          qtyEffect = d.qtyEffect
          priceEffect = d.pricePerItemEffect
        } else if (pQty > 0 && cQty > 0) {
          // No customer data: 2-factor Shapley on qty × price
          const d = decompose2(pAmt, cAmt, pQty, cQty)
          qtyEffect = d.custEffect   // qty dimension
          priceEffect = d.ticketEffect // price dimension
        } else {
          priceEffect = cAmt - pAmt
        }
      } else {
        // 5-factor: full 4-variable Shapley (C, Q, p, s)
        const curSub = filterByGroup(filtered.cur, code)
        const prevSub = filterByGroup(filtered.prev, code)
        const curQA = curSub.map(r => ({ key: childKeyOf(r), qty: r.totalQuantity, amt: r.totalAmount }))
        const prevQA = prevSub.map(r => ({ key: childKeyOf(r), qty: r.totalQuantity, amt: r.totalAmount }))

        if (hasCust && pQty > 0) {
          const d = decompose5Domain(pAmt, cAmt, prevCustomers, curCustomers, pQty, cQty, curQA, prevQA)
          if (d) {
            custEffect = d.custEffect
            qtyEffect = d.qtyEffect
            pricePureEffect = d.priceEffect
            mixEffect = d.mixEffect
          } else {
            const d3 = decompose3(pAmt, cAmt, prevCustomers, curCustomers, pQty, cQty)
            custEffect = d3.custEffect
            qtyEffect = d3.qtyEffect
            pricePureEffect = d3.pricePerItemEffect
          }
        } else if (pQty > 0 && cQty > 0) {
          // No customer data: treat Q as first dimension
          const pm = decomposePriceMixDomain(curQA, prevQA)
          const d = decompose2(pAmt, cAmt, pQty, cQty)
          qtyEffect = d.custEffect   // qty dimension
          const unitPriceTotal = d.ticketEffect // price dimension

          if (pm) {
            const pmSum = pm.priceEffect + pm.mixEffect
            const share = Math.abs(pmSum) > 0.01 ? pm.priceEffect / pmSum : 0.5
            pricePureEffect = unitPriceTotal * share
            mixEffect = unitPriceTotal * (1 - share)
          } else {
            pricePureEffect = unitPriceTotal
          }
        } else {
          pricePureEffect = cAmt - pAmt
        }
      }

      result.push({
        name, code, _level: activeLevel,
        custEffect, ticketEffect, qtyEffect, priceEffect, pricePureEffect, mixEffect,
        totalChange: cAmt - pAmt,
        prevAmount: pAmt, curAmount: cAmt,
        hasChildren: childCheck(code),
      })
    }

    result.sort((a, b) => Math.abs(b.totalChange) - Math.abs(a.totalChange))
    return result.slice(0, compact ? 8 : 12)
  }, [filtered, currentLevel, compact, hasCust, curCustomers, prevCustomers, activeLevel])

  // Build waterfall ranges: each effect's [start, end] for sub-waterfall per row
  const waterfallItems = useMemo((): WaterfallFactorItem[] => {
    return items.map(item => {
      type Step = { key: string; value: number }
      const steps: Step[] = []

      if (hasCust) steps.push({ key: 'cust', value: item.custEffect })
      if (activeLevel === 2) steps.push({ key: 'ticket', value: item.ticketEffect })
      if (activeLevel >= 3) steps.push({ key: 'qty', value: item.qtyEffect })
      if (activeLevel === 3) steps.push({ key: 'price', value: item.priceEffect })
      if (activeLevel === 5) {
        steps.push({ key: 'pricePure', value: item.pricePureEffect })
        steps.push({ key: 'mix', value: item.mixEffect })
      }

      let pos = 0
      const ranges = new Map<string, [number, number]>()
      for (const step of steps) {
        const end = pos + step.value
        ranges.set(step.key, [pos, end])
        pos = end
      }

      const nil: [number, number] = [0, 0]
      return {
        ...item,
        custRange: ranges.get('cust') ?? nil,
        ticketRange: ranges.get('ticket') ?? nil,
        qtyRange: ranges.get('qty') ?? nil,
        priceRange: ranges.get('price') ?? nil,
        pricePureRange: ranges.get('pricePure') ?? nil,
        mixRange: ranges.get('mix') ?? nil,
      }
    })
  }, [items, activeLevel, hasCust])

  const handleDrill = useCallback((item: FactorItem) => {
    if (!item.hasChildren) return
    setDrillPath(prev => [...prev, { level: currentLevel, code: item.code, name: item.name }])
  }, [currentLevel])

  const handleBreadcrumb = useCallback((idx: number) => {
    setDrillPath(prev => prev.slice(0, idx))
  }, [])

  if (items.length === 0) return null

  const levelLabel = currentLevel === 'dept' ? '部門' : currentLevel === 'line' ? 'ライン' : 'クラス'
  const chartH = Math.max(compact ? 180 : 240, items.length * (compact ? 28 : 34) + 40)
  const barClick = (data: unknown) => {
    const item = (data as unknown as { payload?: FactorItem }).payload
    if (item) handleDrill(item)
  }

  return (
    <div>
      {/* Breadcrumb */}
      {drillPath.length > 0 && (
        <Breadcrumb>
          <BreadcrumbItem onClick={() => handleBreadcrumb(0)}>全体</BreadcrumbItem>
          {drillPath.map((entry, i) => (
            <Fragment key={i}>
              <BreadcrumbSep>&rsaquo;</BreadcrumbSep>
              <BreadcrumbItem
                onClick={() => handleBreadcrumb(i + 1)}
                $active={i === drillPath.length - 1}
              >
                {entry.name}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </Breadcrumb>
      )}

      {/* Decomposition level toggle */}
      <DecompRow>
        <DecompBtn $active={activeLevel === 2} onClick={() => setDecompLevel(2)}>
          客数・客単価
        </DecompBtn>
        <DecompBtn $active={activeLevel === 3} onClick={() => setDecompLevel(3)}>
          客数・点数・単価
        </DecompBtn>
        {maxLevel === 5 && (
          <DecompBtn $active={activeLevel === 5} onClick={() => setDecompLevel(5)}>
            5要素（価格+構成比）
          </DecompBtn>
        )}
      </DecompRow>

      {/* Legend */}
      <LegendRow>
        {hasCust && <LegendItem><LegendDot $color={COLORS.cust} />客数効果</LegendItem>}
        {activeLevel === 2 && (
          <LegendItem><LegendDot $color={COLORS.ticket} />客単価効果</LegendItem>
        )}
        {activeLevel >= 3 && (
          <LegendItem><LegendDot $color={COLORS.qty} />点数効果</LegendItem>
        )}
        {activeLevel === 3 && (
          <LegendItem><LegendDot $color={COLORS.price} />単価効果</LegendItem>
        )}
        {activeLevel === 5 && (
          <>
            <LegendItem><LegendDot $color={COLORS.price} />価格効果</LegendItem>
            <LegendItem><LegendDot $color={COLORS.mix} />構成比変化効果</LegendItem>
          </>
        )}
      </LegendRow>

      {/* Horizontal waterfall × department hybrid chart */}
      <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height={chartH}>
        <BarChart
          layout="vertical"
          data={waterfallItems}
          margin={{ top: 5, right: 20, left: 4, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={fmt}
            tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted, fontFamily: ct.monoFamily }}
            axisLine={{ stroke: ct.grid }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={compact ? 60 : 80}
            tick={{ fontSize: ct.fontSize.xs, fill: ct.text, fontFamily: ct.fontFamily }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<FactorTooltip />} />
          <ReferenceLine x={0} stroke={ct.grid} strokeWidth={1.5} />
          <Legend content={() => null} />

          {/* Range bars: each effect is [start, end], forming a sub-waterfall per row */}
          {hasCust && (
            <Bar
              dataKey="custRange"
              name="客数効果"
              fill={COLORS.cust}
              barSize={compact ? 16 : 20}
              opacity={0.85}
              onClick={barClick}
              cursor="pointer"
            />
          )}

          {activeLevel === 2 && (
            <Bar
              dataKey="ticketRange"
              name="客単価効果"
              fill={COLORS.ticket}
              barSize={compact ? 16 : 20}
              opacity={0.85}
              onClick={barClick}
              cursor="pointer"
            />
          )}

          {activeLevel >= 3 && (
            <Bar
              dataKey="qtyRange"
              name="点数効果"
              fill={COLORS.qty}
              barSize={compact ? 16 : 20}
              opacity={0.85}
              onClick={barClick}
              cursor="pointer"
            />
          )}

          {activeLevel === 3 && (
            <Bar
              dataKey="priceRange"
              name="単価効果"
              fill={COLORS.price}
              barSize={compact ? 16 : 20}
              opacity={0.85}
              onClick={barClick}
              cursor="pointer"
            />
          )}

          {activeLevel === 5 && (
            <Bar
              dataKey="pricePureRange"
              name="価格効果"
              fill={COLORS.price}
              barSize={compact ? 16 : 20}
              opacity={0.85}
              onClick={barClick}
              cursor="pointer"
            />
          )}

          {activeLevel === 5 && (
            <Bar
              dataKey="mixRange"
              name="構成比変化効果"
              fill={COLORS.mix}
              barSize={compact ? 16 : 20}
              opacity={0.85}
              onClick={barClick}
              cursor="pointer"
            />
          )}
        </BarChart>
      </ResponsiveContainer>

      {/* Summary table */}
      <Table>
        <thead>
          <tr>
            <th>{levelLabel}</th>
            <th>前年</th>
            <th>当年</th>
            <th>増減</th>
            {hasCust && <th>客数効果</th>}
            {activeLevel === 2 && <th>客単価効果</th>}
            {activeLevel >= 3 && <th>点数効果</th>}
            {activeLevel === 3 && <th>単価効果</th>}
            {activeLevel === 5 && <th>価格効果</th>}
            {activeLevel === 5 && <th>構成比変化</th>}
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.code}>
              <NameCell $clickable={item.hasChildren} onClick={() => handleDrill(item)}>
                {item.name}{item.hasChildren && <DrillIcon>&#9656;</DrillIcon>}
              </NameCell>
              <ValCell>{formatCurrency(item.prevAmount)}</ValCell>
              <ValCell>{formatCurrency(item.curAmount)}</ValCell>
              <ValCell $color={valColor(item.totalChange)}>
                {item.totalChange >= 0 ? '+' : ''}{formatCurrency(item.totalChange)}
              </ValCell>
              {hasCust && (
                <ValCell $color={valColor(item.custEffect)}>
                  {item.custEffect >= 0 ? '+' : ''}{formatCurrency(Math.round(item.custEffect))}
                </ValCell>
              )}
              {activeLevel === 2 && (
                <ValCell $color={valColor(item.ticketEffect)}>
                  {item.ticketEffect >= 0 ? '+' : ''}{formatCurrency(Math.round(item.ticketEffect))}
                </ValCell>
              )}
              {activeLevel >= 3 && (
                <ValCell $color={valColor(item.qtyEffect)}>
                  {item.qtyEffect >= 0 ? '+' : ''}{formatCurrency(Math.round(item.qtyEffect))}
                </ValCell>
              )}
              {activeLevel === 3 && (
                <ValCell $color={valColor(item.priceEffect)}>
                  {item.priceEffect >= 0 ? '+' : ''}{formatCurrency(Math.round(item.priceEffect))}
                </ValCell>
              )}
              {activeLevel === 5 && (
                <ValCell $color={valColor(item.pricePureEffect)}>
                  {item.pricePureEffect >= 0 ? '+' : ''}{formatCurrency(Math.round(item.pricePureEffect))}
                </ValCell>
              )}
              {activeLevel === 5 && (
                <ValCell $color={valColor(item.mixEffect)}>
                  {item.mixEffect >= 0 ? '+' : ''}{formatCurrency(Math.round(item.mixEffect))}
                </ValCell>
              )}
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  )
}
