/**
 * カテゴリ別要因分解チャート
 *
 * 部門→ライン→クラスの各階層で点数効果・単価効果を横棒グラフ+テーブルで表示。
 * クリックで下位階層にドリルダウン可能。
 */
import { useState, useMemo, useCallback, Fragment } from 'react'
import styled from 'styled-components'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import { useChartTheme, toManYen } from '@/presentation/components/charts'
import { formatCurrency, safeDivide } from '@/domain/calculations/utils'
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

interface FactorItem {
  name: string
  code: string
  qtyEffect: number
  priceEffect: number
  totalChange: number
  prevAmount: number
  curAmount: number
  hasChildren: boolean
}

type DrillLevel = 'dept' | 'line' | 'class'

interface PathEntry {
  level: DrillLevel
  code: string
  name: string
}

const COLORS = { qty: '#3b82f6', price: '#f59e0b' } as const

const valColor = (v: number) => v >= 0 ? '#22c55e' : '#ef4444'

/* eslint-disable @typescript-eslint/no-explicit-any */
function FactorTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const item = payload[0]?.payload as FactorItem | undefined
  if (!item) return null
  return (
    <TipBox>
      <TipTitle>{item.name}</TipTitle>
      <TipRow>前年: {formatCurrency(item.prevAmount)}</TipRow>
      <TipRow>当年: {formatCurrency(item.curAmount)}</TipRow>
      <TipRow $color={valColor(item.totalChange)}>
        増減: {item.totalChange >= 0 ? '+' : ''}{formatCurrency(item.totalChange)}
      </TipRow>
      <TipRow $color={COLORS.qty}>
        点数効果: {item.qtyEffect >= 0 ? '+' : ''}{formatCurrency(Math.round(item.qtyEffect))}
      </TipRow>
      <TipRow $color={COLORS.price}>
        単価効果: {item.priceEffect >= 0 ? '+' : ''}{formatCurrency(Math.round(item.priceEffect))}
      </TipRow>
      {item.hasChildren && <TipHint>クリックでドリルダウン</TipHint>}
    </TipBox>
  )
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/* ── Component ──────────────────────────────────────── */

export function CategoryFactorBreakdown({
  curRecords,
  prevRecords,
  compact = false,
}: {
  curRecords: readonly CategoryTimeSalesRecord[]
  prevRecords: readonly CategoryTimeSalesRecord[]
  compact?: boolean
}) {
  const ct = useChartTheme()
  const [drillPath, setDrillPath] = useState<PathEntry[]>([])

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

    const allCodes = new Set([...curG.keys(), ...prevG.keys()])
    const result: FactorItem[] = []

    for (const code of allCodes) {
      const c = curG.get(code)
      const p = prevG.get(code)
      const cQty = c?.qty ?? 0, cAmt = c?.amt ?? 0
      const pQty = p?.qty ?? 0, pAmt = p?.amt ?? 0
      const name = c?.name ?? p?.name ?? code

      const prevPPI = safeDivide(pAmt, pQty, 0)
      const curPPI = safeDivide(cAmt, cQty, 0)

      const qtyEffect = (cQty - pQty) * prevPPI
      const priceEffect = cQty * (curPPI - prevPPI)

      result.push({
        name, code, qtyEffect, priceEffect,
        totalChange: cAmt - pAmt,
        prevAmount: pAmt, curAmount: cAmt,
        hasChildren: childCheck(code),
      })
    }

    result.sort((a, b) => Math.abs(b.totalChange) - Math.abs(a.totalChange))
    return result.slice(0, compact ? 8 : 12)
  }, [filtered, currentLevel, compact])

  const handleDrill = useCallback((item: FactorItem) => {
    if (!item.hasChildren) return
    setDrillPath(prev => [...prev, { level: currentLevel, code: item.code, name: item.name }])
  }, [currentLevel])

  const handleBreadcrumb = useCallback((idx: number) => {
    setDrillPath(prev => prev.slice(0, idx))
  }, [])

  if (items.length === 0) return null

  const levelLabel = currentLevel === 'dept' ? '部門' : currentLevel === 'line' ? 'ライン' : 'クラス'
  const chartH = Math.max(compact ? 180 : 240, items.length * (compact ? 32 : 38) + 40)

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

      {/* Legend */}
      <LegendRow>
        <LegendItem><LegendDot $color={COLORS.qty} />点数効果</LegendItem>
        <LegendItem><LegendDot $color={COLORS.price} />単価効果</LegendItem>
      </LegendRow>

      {/* Horizontal bar chart */}
      <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height={chartH}>
        <BarChart
          layout="vertical"
          data={items}
          margin={{ top: 5, right: 20, left: 4, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={toManYen}
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
          <Bar
            dataKey="qtyEffect"
            name="点数効果"
            fill={COLORS.qty}
            barSize={compact ? 10 : 12}
            opacity={0.85}
            onClick={(data) => { const item = (data as unknown as { payload?: FactorItem }).payload; if (item) handleDrill(item) }}
            cursor="pointer"
          />
          <Bar
            dataKey="priceEffect"
            name="単価効果"
            fill={COLORS.price}
            barSize={compact ? 10 : 12}
            opacity={0.85}
            onClick={(data) => { const item = (data as unknown as { payload?: FactorItem }).payload; if (item) handleDrill(item) }}
            cursor="pointer"
          />
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
            <th>点数効果</th>
            <th>単価効果</th>
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
              <ValCell $color={valColor(item.qtyEffect)}>
                {item.qtyEffect >= 0 ? '+' : ''}{formatCurrency(Math.round(item.qtyEffect))}
              </ValCell>
              <ValCell $color={valColor(item.priceEffect)}>
                {item.priceEffect >= 0 ? '+' : ''}{formatCurrency(Math.round(item.priceEffect))}
              </ValCell>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  )
}
