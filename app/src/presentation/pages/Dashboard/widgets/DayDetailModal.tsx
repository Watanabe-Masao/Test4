import { useState, useMemo, useCallback, Fragment } from 'react'
import styled from 'styled-components'
import { sc } from '@/presentation/theme/semanticColors'
import { formatCurrency, formatPercent } from '@/domain/calculations/utils'
import { getDailyTotalCost } from '@/domain/models/DailyRecord'
import type { DailyRecord, CategoryTimeSalesRecord } from '@/domain/models'
import type { PrevYearData } from '@/application/hooks'
import type { HierarchyFilter } from '@/presentation/components/charts/CategoryHierarchyContext'
import { filterByHierarchy, getHierarchyLevel } from '@/presentation/components/charts/CategoryHierarchyContext'
import { toComma } from '@/presentation/components/charts/chartTheme'
import {
  PinModalOverlay,
  DetailModalContent, DetailHeader, DetailTitle, DetailCloseBtn,
  DetailKpiGrid, DetailKpiCard, DetailKpiLabel, DetailKpiValue,
  DetailSection, DetailSectionTitle, DetailRow, DetailLabel, DetailValue,
  DetailBarWrapper, DetailBarRow, DetailBarLabel, DetailBarTrack, DetailBarFill, DetailBarAmount,
  DetailColumns,
} from '../DashboardPage.styles'

/** 千円表記 (コンパクト) */
function fmtSen(n: number): string {
  const sen = Math.round(n / 1_000)
  return `${sen.toLocaleString()}千`
}

/* ── Drilldown Styled Components ─────────── */

const DrillSection = styled.div`
  margin-top: ${({ theme }) => theme.spacing[6]};
`

const DrillBreadcrumb = styled.div`
  display: flex; align-items: center; gap: 4px;
  margin-bottom: ${({ theme }) => theme.spacing[3]}; flex-wrap: wrap;
`
const BcItem = styled.button<{ $active: boolean }>`
  all: unset; cursor: pointer; font-size: 0.72rem;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  color: ${({ $active, theme }) => $active ? theme.colors.text : theme.colors.palette.primary};
  padding: 2px 6px; border-radius: ${({ theme }) => theme.radii.sm};
  &:hover { background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}; }
`
const BcSep = styled.span`font-size: 0.6rem; color: ${({ theme }) => theme.colors.text4}; user-select: none;`
const BcReset = styled.button`
  all: unset; cursor: pointer; font-size: 0.6rem; margin-left: auto;
  padding: 2px 8px; border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.colors.text3};
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  &:hover { opacity: 0.7; }
`

const DrillTreemap = styled.div`
  display: flex; gap: 2px; height: 52px;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radii.md}; overflow: hidden;
`
const TreeBlock = styled.div<{ $flex: number; $color: string; $canDrill: boolean }>`
  flex: ${({ $flex }) => Math.max($flex, 0.01)}; min-width: 0;
  background: ${({ $color }) => $color}; opacity: 0.8;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 2px 4px; cursor: ${({ $canDrill }) => ($canDrill ? 'pointer' : 'default')};
  transition: opacity 0.15s; overflow: hidden;
  &:hover { opacity: 1; }
`
const TreeLabel = styled.div`
  font-size: 0.55rem; color: #fff; font-weight: 600;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
`
const TreePct = styled.div`font-size: 0.5rem; color: rgba(255,255,255,0.85); font-family: monospace;`

const DrillTable = styled.table`width: 100%; border-collapse: collapse; font-size: 0.65rem;`
const DTh = styled.th<{ $sortable?: boolean }>`
  text-align: left; padding: 5px 6px; font-size: 0.6rem; font-weight: 600;
  color: ${({ theme }) => theme.colors.text3};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap; cursor: ${({ $sortable }) => ($sortable ? 'pointer' : 'default')};
  user-select: none;
  &:hover { color: ${({ $sortable, theme }) => ($sortable ? theme.colors.text : undefined)}; }
`
const DTr = styled.tr<{ $clickable: boolean }>`
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  transition: background 0.1s;
  &:hover { background: ${({ $clickable, theme }) =>
    $clickable ? (theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)') : 'none'}; }
`
const DTd = styled.td<{ $mono?: boolean }>`
  padding: 4px 6px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text2};
  font-family: ${({ $mono, theme }) => $mono ? theme.typography.fontFamily.mono : theme.typography.fontFamily.primary};
  white-space: nowrap;
`
const DTdName = styled(DTd)`
  max-width: 140px; overflow: hidden; text-overflow: ellipsis;
  font-weight: 500; color: ${({ theme }) => theme.colors.text};
`
const DTdAmt = styled(DTd)`min-width: 120px;`
const AmtWrap = styled.div`display: flex; align-items: center; gap: 4px;`
const AmtTrack = styled.div`
  flex: 1; height: 5px; border-radius: 3px; overflow: hidden;
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
`
const AmtFill = styled.div<{ $pct: number; $color: string }>`
  width: ${({ $pct }) => Math.min($pct, 100)}%; height: 100%;
  background: ${({ $color }) => $color}; border-radius: 3px; opacity: 0.75;
`
const AmtVal = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 0.62rem; color: ${({ theme }) => theme.colors.text2};
  min-width: 60px; text-align: right;
`
const DrillArrow = styled.span`
  color: ${({ theme }) => theme.colors.palette.primary}; font-size: 0.7rem; font-weight: 600;
`
const YoYVal = styled.span<{ $positive: boolean }>`
  font-size: 0.58rem; font-weight: 600;
  color: ${({ $positive }) => $positive ? '#22c55e' : '#ef4444'};
`
const SummaryRow = styled.div`
  display: flex; gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[3]}; flex-wrap: wrap;
`
const SumItem = styled.div`display: flex; align-items: baseline; gap: 4px;`
const SumLabel = styled.span`font-size: 0.6rem; color: ${({ theme }) => theme.colors.text4};`
const SumValue = styled.span`
  font-size: 0.78rem; font-weight: 600; color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

const COLORS = [
  '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899',
  '#8b5cf6', '#84cc16', '#f97316', '#14b8a6', '#e879f9', '#a3e635',
  '#fb923c', '#38bdf8', '#c084fc',
]

/* ── Drilldown Aggregation ───────────────── */

interface DrillItem {
  code: string; name: string; amount: number; quantity: number; pct: number
  childCount: number; color: string
  prevAmount?: number; prevQuantity?: number
  yoyRatio?: number; yoyDiff?: number
  yoyQtyRatio?: number; yoyQtyDiff?: number
}

type MetricKey = 'amount' | 'quantity'
type CompareMode = 'actual' | 'prevYear'
type SortKey = 'amount' | 'quantity' | 'pct' | 'name' | 'yoyRatio'
type SortDir = 'asc' | 'desc'

function aggregateForDrill(
  records: readonly CategoryTimeSalesRecord[],
  level: 'department' | 'line' | 'klass',
) {
  const map = new Map<string, {
    code: string; name: string; amount: number; quantity: number
    children: Set<string>
  }>()
  for (const rec of records) {
    let key: string, name: string, childKey: string
    if (level === 'department') {
      key = rec.department.code; name = rec.department.name || key; childKey = rec.line.code
    } else if (level === 'line') {
      key = rec.line.code; name = rec.line.name || key; childKey = rec.klass.code
    } else {
      key = rec.klass.code; name = rec.klass.name || key; childKey = ''
    }
    const ex = map.get(key) ?? { code: key, name, amount: 0, quantity: 0, children: new Set() }
    ex.amount += rec.totalAmount; ex.quantity += rec.totalQuantity
    if (childKey) ex.children.add(childKey)
    map.set(key, ex)
  }
  return map
}

/* ── Toggle styled components ──────────── */

const ToggleBar = styled.div`
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`
const ToggleGroup = styled.div`
  display: flex; gap: 2px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  border-radius: ${({ theme }) => theme.radii.md}; padding: 2px;
`
const ToggleBtn = styled.button<{ $active: boolean }>`
  all: unset; cursor: pointer; font-size: 0.6rem;
  padding: 2px 10px; border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ $active }) => $active ? '#fff' : 'inherit'};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.palette.primary : 'transparent'};
  white-space: nowrap; transition: all 0.15s;
  &:hover { opacity: 0.85; }
`
const ToggleLabel = styled.span`
  font-size: 0.55rem; color: ${({ theme }) => theme.colors.text4}; white-space: nowrap;
`

/* ── Stacked Bar styled components ─────── */

const StackedBarSection = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`
const StackRow = styled.div`
  display: flex; align-items: center; gap: 8px; margin-bottom: 6px;
`
const StackLabel = styled.span`
  font-size: 0.62rem; color: ${({ theme }) => theme.colors.text3};
  min-width: 32px; text-align: right; white-space: nowrap;
`
const StackTrack = styled.div`
  flex: 1; height: 24px; border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.bg4};
  overflow: hidden; display: flex; position: relative;
`
const StackSegment = styled.div<{ $flex: number; $color: string }>`
  flex: ${({ $flex }) => Math.max($flex, 0)}; min-width: 0;
  background: ${({ $color }) => $color}; height: 100%;
  transition: flex 0.3s ease;
  position: relative;
  &:hover { opacity: 0.85; z-index: 1; }
`
const StackTotal = styled.span`
  font-size: 0.6rem; margin-left: 6px; white-space: nowrap;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text2};
`
const LegendRow = styled.div`
  display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px;
`
const LegendItem = styled.div<{ $clickable: boolean }>`
  display: flex; align-items: center; gap: 3px; font-size: 0.55rem;
  color: ${({ theme }) => theme.colors.text2}; cursor: ${({ $clickable }) => $clickable ? 'pointer' : 'default'};
  &:hover { opacity: ${({ $clickable }) => $clickable ? 0.7 : 1}; }
`
const LegendDot = styled.div<{ $color: string }>`
  width: 8px; height: 8px; border-radius: 2px; background: ${({ $color }) => $color};
`
const SegmentTooltip = styled.div`
  position: absolute; bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%);
  z-index: 100; padding: 4px 8px; border-radius: 4px;
  font-size: 0.55rem; white-space: nowrap;
  background: ${({ theme }) => theme.mode === 'dark' ? '#1e1e2e' : '#fff'};
  color: ${({ theme }) => theme.colors.text}; border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: 0 2px 8px rgba(0,0,0,0.2); pointer-events: none;
`

/* ── Category Drilldown Sub-component ──── */

function CategoryDrilldown({
  records, prevRecords, budget,
}: {
  records: readonly CategoryTimeSalesRecord[]
  prevRecords: readonly CategoryTimeSalesRecord[]
  budget: number
}) {
  const [filter, setFilter] = useState<HierarchyFilter>({})
  const [sortKey, setSortKey] = useState<SortKey>('amount')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [metric, setMetric] = useState<MetricKey>('amount')
  const [compare, setCompare] = useState<CompareMode>('actual')
  const [hoveredSeg, setHoveredSeg] = useState<string | null>(null)

  const currentLevel = getHierarchyLevel(filter)
  const levelLabels: Record<string, string> = { department: '部門', line: 'ライン', klass: 'クラス' }
  const hasPrevYear = prevRecords.length > 0

  const breadcrumb = useMemo(() => {
    const items: { label: string; f: HierarchyFilter }[] = [{ label: '全カテゴリ', f: {} }]
    if (filter.departmentCode) {
      items.push({ label: filter.departmentName || filter.departmentCode,
        f: { departmentCode: filter.departmentCode, departmentName: filter.departmentName } })
    }
    if (filter.lineCode) {
      items.push({ label: filter.lineName || filter.lineCode, f: { ...filter } })
    }
    return items
  }, [filter])

  const filtered = useMemo(() => filterByHierarchy(records, filter), [records, filter])
  const filteredPrev = useMemo(() => hasPrevYear ? filterByHierarchy(prevRecords, filter) : [], [prevRecords, filter, hasPrevYear])

  // Build stable color mapping for departments at top level
  const deptColorMap = useMemo(() => {
    const map = new Map<string, string>()
    const deptMap = aggregateForDrill(records, 'department')
    const sorted = [...deptMap.values()].sort((a, b) => b.amount - a.amount)
    sorted.forEach((d, i) => map.set(d.code, COLORS[i % COLORS.length]))
    return map
  }, [records])

  const items = useMemo(() => {
    const map = aggregateForDrill(filtered, currentLevel)
    const prevMap = hasPrevYear ? aggregateForDrill(filteredPrev, currentLevel) : null
    const totalAmt = [...map.values()].reduce((s, v) => s + v.amount, 0)
    const totalQty = [...map.values()].reduce((s, v) => s + v.quantity, 0)
    const totalForPct = metric === 'amount' ? totalAmt : totalQty

    return [...map.values()]
      .sort((a, b) => b.amount - a.amount)
      .map((it, i): DrillItem => {
        const prev = prevMap?.get(it.code)
        const prevAmt = prev ? prev.amount : undefined
        const prevQty = prev ? prev.quantity : undefined
        const val = metric === 'amount' ? it.amount : it.quantity
        const color = currentLevel === 'department'
          ? (deptColorMap.get(it.code) ?? COLORS[i % COLORS.length])
          : COLORS[i % COLORS.length]
        return {
          code: it.code, name: it.name, amount: it.amount, quantity: it.quantity,
          pct: totalForPct > 0 ? (val / totalForPct) * 100 : 0,
          childCount: it.children.size, color,
          prevAmount: prevAmt, prevQuantity: prevQty,
          yoyRatio: prevAmt && prevAmt > 0 ? it.amount / prevAmt : undefined,
          yoyDiff: prevAmt != null ? it.amount - prevAmt : undefined,
          yoyQtyRatio: prevQty && prevQty > 0 ? it.quantity / prevQty : undefined,
          yoyQtyDiff: prevQty != null ? it.quantity - prevQty : undefined,
        }
      })
  }, [filtered, filteredPrev, currentLevel, hasPrevYear, metric, deptColorMap])

  const sorted = useMemo(() => {
    const arr = [...items]
    arr.sort((a, b) => {
      let d = 0
      switch (sortKey) {
        case 'amount': d = (metric === 'amount' ? a.amount - b.amount : a.quantity - b.quantity); break
        case 'quantity': d = a.quantity - b.quantity; break
        case 'pct': d = a.pct - b.pct; break
        case 'name': d = a.name.localeCompare(b.name, 'ja'); break
        case 'yoyRatio': d = (a.yoyRatio ?? 0) - (b.yoyRatio ?? 0); break
      }
      return sortDir === 'desc' ? -d : d
    })
    return arr
  }, [items, sortKey, sortDir, metric])

  const handleDrill = useCallback((it: DrillItem) => {
    if (currentLevel === 'department') setFilter({ departmentCode: it.code, departmentName: it.name })
    else if (currentLevel === 'line') setFilter((prev) => ({ ...prev, lineCode: it.code, lineName: it.name }))
  }, [currentLevel])

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) setSortDir((d) => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
  }, [sortKey])

  const totalAmt = items.reduce((s, i) => s + i.amount, 0)
  const totalQty = items.reduce((s, i) => s + i.quantity, 0)
  const totalPrevAmt = items.reduce((s, i) => s + (i.prevAmount ?? 0), 0)
  const totalPrevQty = items.reduce((s, i) => s + (i.prevQuantity ?? 0), 0)
  const totalYoY = totalPrevAmt > 0 ? totalAmt / totalPrevAmt : null
  const totalQtyYoY = totalPrevQty > 0 ? totalQty / totalPrevQty : null
  const maxVal = items.length > 0
    ? Math.max(...items.map((i) => metric === 'amount' ? i.amount : i.quantity))
    : 1
  const canDrill = currentLevel !== 'klass'
  const arrow = (k: SortKey) => sortKey === k ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  const isAmountMode = metric === 'amount'
  const displayTotal = isAmountMode ? totalAmt : totalQty
  const displayYoY = isAmountMode ? totalYoY : totalQtyYoY
  const fmtVal = isAmountMode ? (v: number) => `${toComma(v)}円` : (v: number) => `${v.toLocaleString()}点`

  // ── Stacked bar data ──
  const stackBarData = useMemo(() => {
    // Build department-level breakdown for stacked bars
    const deptItems = currentLevel === 'department'
      ? items
      : (() => {
          const deptMap = aggregateForDrill(filtered, 'department')
          const prevDeptMap = hasPrevYear ? aggregateForDrill(filteredPrev, 'department') : null
          return [...deptMap.values()].sort((a, b) => b.amount - a.amount).map((d): DrillItem => ({
            code: d.code, name: d.name, amount: d.amount, quantity: d.quantity,
            pct: 0, childCount: 0,
            color: deptColorMap.get(d.code) ?? '#6366f1',
            prevAmount: prevDeptMap?.get(d.code)?.amount,
            prevQuantity: prevDeptMap?.get(d.code)?.quantity,
          }))
        })()
    return deptItems
  }, [currentLevel, items, filtered, filteredPrev, hasPrevYear, deptColorMap])

  if (sorted.length === 0) return null

  return (
    <DrillSection>
      <DetailSectionTitle>分類別売上ドリルダウン</DetailSectionTitle>

      {/* Toggle controls */}
      <ToggleBar>
        <ToggleLabel>指標</ToggleLabel>
        <ToggleGroup>
          <ToggleBtn $active={metric === 'amount'} onClick={() => setMetric('amount')}>販売金額</ToggleBtn>
          <ToggleBtn $active={metric === 'quantity'} onClick={() => setMetric('quantity')}>点数</ToggleBtn>
        </ToggleGroup>
        {hasPrevYear && (
          <>
            <ToggleLabel>比較</ToggleLabel>
            <ToggleGroup>
              <ToggleBtn $active={compare === 'actual'} onClick={() => setCompare('actual')}>実績</ToggleBtn>
              <ToggleBtn $active={compare === 'prevYear'} onClick={() => setCompare('prevYear')}>前年</ToggleBtn>
            </ToggleGroup>
          </>
        )}
      </ToggleBar>

      <DrillBreadcrumb>
        {breadcrumb.map((bc, i) => (
          <Fragment key={i}>
            {i > 0 && <BcSep>▸</BcSep>}
            <BcItem $active={i === breadcrumb.length - 1} onClick={() => setFilter(bc.f)}>
              {bc.label}
            </BcItem>
          </Fragment>
        ))}
        {filter.departmentCode && <BcReset onClick={() => setFilter({})}>リセット</BcReset>}
      </DrillBreadcrumb>

      <SummaryRow>
        <SumItem><SumLabel>{levelLabels[currentLevel]}数</SumLabel><SumValue>{items.length}</SumValue></SumItem>
        <SumItem><SumLabel>合計</SumLabel><SumValue>{fmtVal(displayTotal)}</SumValue></SumItem>
        {hasPrevYear && displayYoY != null && (
          <SumItem>
            <SumLabel>前年比</SumLabel>
            <SumValue><YoYVal $positive={displayYoY >= 1}>{(displayYoY * 100).toFixed(1)}%</YoYVal></SumValue>
          </SumItem>
        )}
      </SummaryRow>

      {/* ── Stacked bar chart: 予算 vs 実績 vs 前年 ── */}
      <StackedBarSection>
        {(() => {
          const actualTotal = isAmountMode ? totalAmt : totalQty
          const prevTotal = isAmountMode ? totalPrevAmt : totalPrevQty
          const maxBar = Math.max(budget, actualTotal, prevTotal, 1)
          const barItems = stackBarData

          return (
            <>
              {/* 予算 bar (solid color) */}
              {budget > 0 && isAmountMode && (
                <StackRow>
                  <StackLabel>予算</StackLabel>
                  <StackTrack>
                    <StackSegment
                      $flex={budget / maxBar}
                      $color="#6366f1"
                      style={{ opacity: 0.6 }}
                    />
                  </StackTrack>
                  <StackTotal>{fmtSen(budget)}</StackTotal>
                </StackRow>
              )}

              {/* 実績 bar (department colored segments) */}
              <StackRow>
                <StackLabel>実績</StackLabel>
                <StackTrack>
                  {barItems.map((it) => {
                    const val = isAmountMode ? it.amount : it.quantity
                    if (val <= 0) return null
                    return (
                      <StackSegment
                        key={it.code}
                        $flex={val / maxBar}
                        $color={it.color}
                        onMouseEnter={() => setHoveredSeg(`actual-${it.code}`)}
                        onMouseLeave={() => setHoveredSeg(null)}
                      >
                        {hoveredSeg === `actual-${it.code}` && (
                          <SegmentTooltip>
                            {it.name}: {fmtVal(val)}
                          </SegmentTooltip>
                        )}
                      </StackSegment>
                    )
                  })}
                </StackTrack>
                <StackTotal>{isAmountMode ? fmtSen(actualTotal) : fmtVal(actualTotal)}</StackTotal>
              </StackRow>

              {/* 前年 bar (department colored segments, muted) */}
              {hasPrevYear && prevTotal > 0 && (
                <StackRow>
                  <StackLabel>前年</StackLabel>
                  <StackTrack>
                    {barItems.map((it) => {
                      const val = isAmountMode ? (it.prevAmount ?? 0) : (it.prevQuantity ?? 0)
                      if (val <= 0) return null
                      return (
                        <StackSegment
                          key={it.code}
                          $flex={val / maxBar}
                          $color={it.color}
                          style={{ opacity: 0.5 }}
                          onMouseEnter={() => setHoveredSeg(`prev-${it.code}`)}
                          onMouseLeave={() => setHoveredSeg(null)}
                        >
                          {hoveredSeg === `prev-${it.code}` && (
                            <SegmentTooltip>
                              {it.name}: {fmtVal(val)}
                            </SegmentTooltip>
                          )}
                        </StackSegment>
                      )
                    })}
                  </StackTrack>
                  <StackTotal>{isAmountMode ? fmtSen(prevTotal) : fmtVal(prevTotal)}</StackTotal>
                </StackRow>
              )}

              {/* Legend */}
              <LegendRow>
                {barItems.filter((it) => it.amount > 0 || it.quantity > 0).map((it) => (
                  <LegendItem key={it.code} $clickable={canDrill && currentLevel === 'department'}
                    onClick={() => canDrill && currentLevel === 'department' && handleDrill(it)}>
                    <LegendDot $color={it.color} />
                    <span>{it.name}</span>
                  </LegendItem>
                ))}
              </LegendRow>
            </>
          )
        })()}
      </StackedBarSection>

      {/* Treemap */}
      <DrillTreemap>
        {items.slice(0, 12).map((it) => {
          const val = compare === 'prevYear' && hasPrevYear
            ? (isAmountMode ? it.prevAmount ?? 0 : it.prevQuantity ?? 0)
            : (isAmountMode ? it.amount : it.quantity)
          return (
            <TreeBlock key={it.code} $flex={val} $color={it.color}
              $canDrill={canDrill} onClick={() => canDrill && handleDrill(it)}
              title={`${it.name}: ${fmtVal(val)} (${it.pct.toFixed(1)}%)`}>
              <TreeLabel>{it.name}</TreeLabel>
              <TreePct>{it.pct.toFixed(1)}%</TreePct>
            </TreeBlock>
          )
        })}
      </DrillTreemap>

      {/* Data table */}
      <div style={{ overflowX: 'auto' }}>
        <DrillTable>
          <thead><tr>
            <DTh>#</DTh>
            <DTh $sortable onClick={() => handleSort('name')}>{levelLabels[currentLevel]}名{arrow('name')}</DTh>
            <DTh $sortable onClick={() => handleSort('amount')}>
              {isAmountMode ? '売上金額' : '数量'}{arrow('amount')}
            </DTh>
            <DTh $sortable onClick={() => handleSort('pct')}>構成比{arrow('pct')}</DTh>
            {compare === 'actual' && (
              <DTh $sortable onClick={() => handleSort('quantity')}>
                {isAmountMode ? '数量' : '売上金額'}{arrow('quantity')}
              </DTh>
            )}
            {compare === 'prevYear' && hasPrevYear && (
              <>
                <DTh>前年</DTh>
                <DTh $sortable onClick={() => handleSort('yoyRatio')}>前年比{arrow('yoyRatio')}</DTh>
              </>
            )}
            {compare === 'actual' && hasPrevYear && (
              <DTh $sortable onClick={() => handleSort('yoyRatio')}>前年比{arrow('yoyRatio')}</DTh>
            )}
            {canDrill && <DTh />}
          </tr></thead>
          <tbody>
            {sorted.map((it, i) => {
              const mainVal = isAmountMode ? it.amount : it.quantity
              const subVal = isAmountMode ? it.quantity : it.amount
              const prevMainVal = isAmountMode ? it.prevAmount : it.prevQuantity
              const yoy = isAmountMode ? it.yoyRatio : it.yoyQtyRatio
              return (
                <DTr key={it.code} $clickable={canDrill} onClick={() => canDrill && handleDrill(it)}>
                  <DTd $mono>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <LegendDot $color={it.color} />
                      {i + 1}
                    </span>
                  </DTd>
                  <DTdName>{it.name}</DTdName>
                  <DTdAmt>
                    <AmtWrap>
                      <AmtTrack><AmtFill $pct={maxVal > 0 ? (mainVal / maxVal) * 100 : 0} $color={it.color} /></AmtTrack>
                      <AmtVal>{fmtVal(mainVal)}</AmtVal>
                    </AmtWrap>
                  </DTdAmt>
                  <DTd $mono>{it.pct.toFixed(1)}%</DTd>
                  {compare === 'actual' && (
                    <DTd $mono>{isAmountMode ? `${subVal.toLocaleString()}点` : `${toComma(subVal)}円`}</DTd>
                  )}
                  {compare === 'prevYear' && hasPrevYear && (
                    <>
                      <DTd $mono>{prevMainVal != null ? fmtVal(prevMainVal) : '-'}</DTd>
                      <DTd $mono>
                        {yoy != null ? (
                          <YoYVal $positive={yoy >= 1}>{(yoy * 100).toFixed(1)}%</YoYVal>
                        ) : '-'}
                      </DTd>
                    </>
                  )}
                  {compare === 'actual' && hasPrevYear && (
                    <DTd $mono>
                      {yoy != null ? (
                        <YoYVal $positive={yoy >= 1}>{(yoy * 100).toFixed(1)}%</YoYVal>
                      ) : '-'}
                    </DTd>
                  )}
                  {canDrill && <DTd><DrillArrow>▸</DrillArrow></DTd>}
                </DTr>
              )
            })}
          </tbody>
        </DrillTable>
      </div>
    </DrillSection>
  )
}

/* ── Day Stacked Bar (budget vs actual with dept colors) ── */

function DayStackedBar({
  budget, actual, ach, pySales, pyRatio, hasPrevYear,
  dayRecords, prevDayRecords,
  cumBudget, cumSales, cumAch, cumPrevYear, cumPyRatio,
  allRecords, allPrevRecords, day,
}: {
  budget: number; actual: number; ach: number
  pySales: number; pyRatio: number; hasPrevYear: boolean
  dayRecords: readonly CategoryTimeSalesRecord[]
  prevDayRecords: readonly CategoryTimeSalesRecord[]
  cumBudget: number; cumSales: number; cumAch: number
  cumPrevYear: number; cumPyRatio: number
  allRecords: readonly CategoryTimeSalesRecord[]
  allPrevRecords: readonly CategoryTimeSalesRecord[]
  day: number
}) {
  const [hoverSeg, setHoverSeg] = useState<string | null>(null)

  // Day breakdown
  const deptBreakdown = useMemo(() => {
    const map = aggregateForDrill(dayRecords, 'department')
    return [...map.values()].sort((a, b) => b.amount - a.amount)
  }, [dayRecords])

  const prevDeptBreakdown = useMemo(() => {
    const map = aggregateForDrill(prevDayRecords, 'department')
    return [...map.values()].sort((a, b) => b.amount - a.amount)
  }, [prevDayRecords])

  // Cumulative breakdown (1日〜day日)
  const cumRecords = useMemo(
    () => allRecords.filter((r) => r.day <= day),
    [allRecords, day],
  )
  const cumPrevRecords = useMemo(
    () => allPrevRecords.filter((r) => r.day <= day),
    [allPrevRecords, day],
  )
  const cumDeptBreakdown = useMemo(() => {
    const map = aggregateForDrill(cumRecords, 'department')
    return [...map.values()].sort((a, b) => b.amount - a.amount)
  }, [cumRecords])
  const cumPrevDeptBreakdown = useMemo(() => {
    const map = aggregateForDrill(cumPrevRecords, 'department')
    return [...map.values()].sort((a, b) => b.amount - a.amount)
  }, [cumPrevRecords])

  // Stable color mapping (union of all departments)
  const colorMap = useMemo(() => {
    const m = new Map<string, string>()
    // Use cumulative data for stable ordering (more complete)
    const allDepts = cumDeptBreakdown.length > 0 ? cumDeptBreakdown : deptBreakdown
    allDepts.forEach((d, i) => m.set(d.code, COLORS[i % COLORS.length]))
    // Fill in any missing from day/prev
    const fill = (arr: typeof deptBreakdown) => {
      arr.forEach((d) => { if (!m.has(d.code)) m.set(d.code, COLORS[m.size % COLORS.length]) })
    }
    fill(deptBreakdown)
    fill(prevDeptBreakdown)
    fill(cumPrevDeptBreakdown)
    return m
  }, [deptBreakdown, prevDeptBreakdown, cumDeptBreakdown, cumPrevDeptBreakdown])

  const hasCategoryData = deptBreakdown.length > 0
  const hasCumCategoryData = cumDeptBreakdown.length > 0

  const renderBar = (
    budgetVal: number,
    actualVal: number,
    achVal: number,
    pyVal: number,
    pyRatioVal: number,
    depts: typeof deptBreakdown,
    prevDepts: typeof deptBreakdown,
    hasCategory: boolean,
    prefix: string,
    sectionTitle: string,
  ) => {
    const maxVal = Math.max(budgetVal, actualVal, pyVal, 1)
    return (
      <DetailSection>
        <DetailSectionTitle>{sectionTitle}</DetailSectionTitle>
        <DetailBarWrapper>
          {/* 予算 */}
          <DetailBarRow>
            <DetailBarLabel>予算</DetailBarLabel>
            <DetailBarTrack>
              <DetailBarFill $width={(budgetVal / maxVal) * 100} $color="#6366f1">
                <DetailBarAmount>{fmtSen(budgetVal)}</DetailBarAmount>
              </DetailBarFill>
            </DetailBarTrack>
          </DetailBarRow>

          {/* 実績 */}
          <DetailBarRow>
            <DetailBarLabel>実績</DetailBarLabel>
            <DetailBarTrack>
              {hasCategory ? (
                <>
                  {depts.map((dept) => {
                    const pct = (dept.amount / maxVal) * 100
                    const c = colorMap.get(dept.code) ?? '#6366f1'
                    return (
                      <StackSegment
                        key={dept.code}
                        $flex={pct}
                        $color={c}
                        onMouseEnter={() => setHoverSeg(`${prefix}a-${dept.code}`)}
                        onMouseLeave={() => setHoverSeg(null)}
                      >
                        {hoverSeg === `${prefix}a-${dept.code}` && (
                          <SegmentTooltip>{dept.name}: {fmtSen(dept.amount)}</SegmentTooltip>
                        )}
                      </StackSegment>
                    )
                  })}
                  <div style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
                    pointerEvents: 'none', fontSize: '0.58rem', color: '#fff', fontWeight: 600,
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)', whiteSpace: 'nowrap' }}>
                    {fmtSen(actualVal)}（{formatPercent(achVal)}）
                  </div>
                </>
              ) : (
                <DetailBarFill $width={(actualVal / maxVal) * 100} $color={sc.positive}>
                  <DetailBarAmount>{fmtSen(actualVal)}（{formatPercent(achVal)}）</DetailBarAmount>
                </DetailBarFill>
              )}
            </DetailBarTrack>
          </DetailBarRow>

          {/* 前年 */}
          {hasPrevYear && pyVal > 0 && (
            <DetailBarRow>
              <DetailBarLabel>前年</DetailBarLabel>
              <DetailBarTrack>
                {prevDepts.length > 0 ? (
                  <>
                    {prevDepts.map((dept) => {
                      const pct = (dept.amount / maxVal) * 100
                      const c = colorMap.get(dept.code) ?? '#9ca3af'
                      return (
                        <StackSegment
                          key={dept.code}
                          $flex={pct}
                          $color={c}
                          style={{ opacity: 0.55 }}
                          onMouseEnter={() => setHoverSeg(`${prefix}p-${dept.code}`)}
                          onMouseLeave={() => setHoverSeg(null)}
                        >
                          {hoverSeg === `${prefix}p-${dept.code}` && (
                            <SegmentTooltip>{dept.name}: {fmtSen(dept.amount)}</SegmentTooltip>
                          )}
                        </StackSegment>
                      )
                    })}
                    <div style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
                      pointerEvents: 'none', fontSize: '0.58rem', color: '#fff', fontWeight: 600,
                      textShadow: '0 1px 2px rgba(0,0,0,0.5)', whiteSpace: 'nowrap' }}>
                      {fmtSen(pyVal)}（{formatPercent(pyRatioVal)}）
                    </div>
                  </>
                ) : (
                  <DetailBarFill $width={(pyVal / maxVal) * 100} $color="#9ca3af">
                    <DetailBarAmount>{fmtSen(pyVal)}（{formatPercent(pyRatioVal)}）</DetailBarAmount>
                  </DetailBarFill>
                )}
              </DetailBarTrack>
            </DetailBarRow>
          )}
        </DetailBarWrapper>

        {/* Legend */}
        {hasCategory && (
          <LegendRow style={{ marginTop: 6 }}>
            {depts.map((dept) => (
              <LegendItem key={dept.code} $clickable={false}>
                <LegendDot $color={colorMap.get(dept.code) ?? '#6366f1'} />
                <span style={{ fontSize: '0.55rem' }}>{dept.name}</span>
              </LegendItem>
            ))}
          </LegendRow>
        )}
      </DetailSection>
    )
  }

  return (
    <>
      {renderBar(budget, actual, ach, pySales, pyRatio,
        deptBreakdown, prevDeptBreakdown, hasCategoryData,
        'd-', '予算 vs 実績（当日）')}
      {renderBar(cumBudget, cumSales, cumAch, cumPrevYear, cumPyRatio,
        cumDeptBreakdown, cumPrevDeptBreakdown, hasCumCategoryData,
        'c-', '予算 vs 実績（累計）')}
    </>
  )
}

/* ── Main Modal ──────────────────────────── */

interface DayDetailModalProps {
  day: number
  month: number
  year: number
  record: DailyRecord | undefined
  budget: number
  cumBudget: number
  cumSales: number
  cumPrevYear: number
  prevYear: PrevYearData
  categoryRecords: readonly CategoryTimeSalesRecord[]
  prevYearCategoryRecords: readonly CategoryTimeSalesRecord[]
  onClose: () => void
}

export function DayDetailModal({
  day, month, year, record, budget, cumBudget, cumSales, cumPrevYear, prevYear,
  categoryRecords, prevYearCategoryRecords, onClose,
}: DayDetailModalProps) {
  const DOW_NAMES = ['日', '月', '火', '水', '木', '金', '土']

  const actual = record?.sales ?? 0
  const diff = actual - budget
  const ach = budget > 0 ? actual / budget : 0
  const cumDiff = cumSales - cumBudget
  const cumAch = cumBudget > 0 ? cumSales / cumBudget : 0
  const pySales = prevYear.daily.get(day)?.sales ?? 0
  const pyRatio = pySales > 0 ? actual / pySales : 0
  const cumPyRatio = cumPrevYear > 0 ? cumSales / cumPrevYear : 0
  const dayOfWeek = DOW_NAMES[new Date(year, month - 1, day).getDay()]

  // Filter category records for this specific day
  const dayRecords = useMemo(
    () => categoryRecords.filter((r) => r.day === day),
    [categoryRecords, day],
  )
  const prevDayRecords = useMemo(
    () => prevYearCategoryRecords.filter((r) => r.day === day),
    [prevYearCategoryRecords, day],
  )

  return (
    <PinModalOverlay onClick={onClose}>
      <DetailModalContent onClick={(e) => e.stopPropagation()}>
        <DetailHeader>
          <DetailTitle>{month}月{day}日（{dayOfWeek}）の詳細</DetailTitle>
          <DetailCloseBtn onClick={onClose}>✕</DetailCloseBtn>
        </DetailHeader>

        {/* KPI Cards */}
        <DetailKpiGrid>
          <DetailKpiCard $accent="#6366f1">
            <DetailKpiLabel>予算</DetailKpiLabel>
            <DetailKpiValue>{formatCurrency(budget)}</DetailKpiValue>
          </DetailKpiCard>
          <DetailKpiCard $accent={sc.cond(actual >= budget)}>
            <DetailKpiLabel>実績</DetailKpiLabel>
            <DetailKpiValue>{formatCurrency(actual)}</DetailKpiValue>
          </DetailKpiCard>
          <DetailKpiCard $accent={sc.cond(diff >= 0)}>
            <DetailKpiLabel>予算差異</DetailKpiLabel>
            <DetailKpiValue $color={sc.cond(diff >= 0)}>
              {formatCurrency(diff)}
            </DetailKpiValue>
          </DetailKpiCard>
          <DetailKpiCard $accent={sc.achievement(ach)}>
            <DetailKpiLabel>達成率</DetailKpiLabel>
            <DetailKpiValue $color={sc.achievement(ach)}>
              {formatPercent(ach)}
            </DetailKpiValue>
          </DetailKpiCard>
        </DetailKpiGrid>

        {/* Budget vs Actual Bars (当日 + 累計) - 部門別色分け */}
        <DayStackedBar
          budget={budget}
          actual={actual}
          ach={ach}
          pySales={pySales}
          pyRatio={pyRatio}
          hasPrevYear={prevYear.hasPrevYear}
          dayRecords={dayRecords}
          prevDayRecords={prevDayRecords}
          cumBudget={cumBudget}
          cumSales={cumSales}
          cumAch={cumAch}
          cumPrevYear={cumPrevYear}
          cumPyRatio={cumPyRatio}
          allRecords={categoryRecords}
          allPrevRecords={prevYearCategoryRecords}
          day={day}
        />

        <DetailColumns>
          {/* Left: Cumulative */}
          <DetailSection>
            <DetailSectionTitle>累計情報（1日〜{day}日）</DetailSectionTitle>
            <DetailRow>
              <DetailLabel>予算累計</DetailLabel>
              <DetailValue>{formatCurrency(cumBudget)}</DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailLabel>実績累計</DetailLabel>
              <DetailValue>{formatCurrency(cumSales)}</DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailLabel>累計差異</DetailLabel>
              <DetailValue $color={sc.cond(cumDiff >= 0)}>{formatCurrency(cumDiff)}</DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailLabel>累計達成率</DetailLabel>
              <DetailValue $color={sc.cond(cumAch >= 1)}>{formatPercent(cumAch)}</DetailValue>
            </DetailRow>
            {prevYear.hasPrevYear && pySales > 0 && (
              <>
                <DetailRow>
                  <DetailLabel>前年同曜日</DetailLabel>
                  <DetailValue>{formatCurrency(pySales)}</DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailLabel>前年比</DetailLabel>
                  <DetailValue $color={sc.cond(pyRatio >= 1)}>{formatPercent(pyRatio)}</DetailValue>
                </DetailRow>
              </>
            )}
          </DetailSection>

          {/* Right: Breakdown */}
          <DetailSection>
            <DetailSectionTitle>売上内訳</DetailSectionTitle>
            {record ? (() => {
              const totalCost = getDailyTotalCost(record)
              const items: { label: string; cost: number; price: number }[] = [
                { label: '仕入（在庫）', cost: record.purchase.cost, price: record.purchase.price },
                { label: '花', cost: record.flowers.cost, price: record.flowers.price },
                { label: '産直', cost: record.directProduce.cost, price: record.directProduce.price },
                { label: '店間入', cost: record.interStoreIn.cost, price: record.interStoreIn.price },
                { label: '店間出', cost: record.interStoreOut.cost, price: record.interStoreOut.price },
                { label: '部門間入', cost: record.interDepartmentIn.cost, price: record.interDepartmentIn.price },
                { label: '部門間出', cost: record.interDepartmentOut.cost, price: record.interDepartmentOut.price },
              ].filter(item => item.cost !== 0 || item.price !== 0)
              const totalPrice = items.reduce((sum, item) => sum + Math.abs(item.price), 0)

              return (
                <>
                  {items.map((item) => {
                    const ratio = totalPrice > 0 ? Math.abs(item.price) / totalPrice : 0
                    return (
                      <DetailRow key={item.label}>
                        <DetailLabel>{item.label}</DetailLabel>
                        <DetailValue>
                          {formatCurrency(item.price)} <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>(原 {formatCurrency(item.cost)})</span>
                          <span style={{ color: '#6366f1', fontSize: '0.75rem', marginLeft: '4px' }}>({formatPercent(ratio)})</span>
                        </DetailValue>
                      </DetailRow>
                    )
                  })}
                  <DetailRow>
                    <DetailLabel>総仕入原価</DetailLabel>
                    <DetailValue>{formatCurrency(totalCost)}</DetailValue>
                  </DetailRow>
                  {record.consumable.cost > 0 && (
                    <DetailRow>
                      <DetailLabel>消耗品費</DetailLabel>
                      <DetailValue>{formatCurrency(record.consumable.cost)}</DetailValue>
                    </DetailRow>
                  )}
                  {record.discountAmount !== 0 && (
                    <DetailRow>
                      <DetailLabel>売変額</DetailLabel>
                      <DetailValue $color={sc.negative}>{formatCurrency(record.discountAmount)}</DetailValue>
                    </DetailRow>
                  )}
                </>
              )
            })() : (
              <DetailRow>
                <DetailLabel>データなし</DetailLabel>
                <DetailValue>-</DetailValue>
              </DetailRow>
            )}
          </DetailSection>
        </DetailColumns>

        {/* Category Drilldown */}
        {dayRecords.length > 0 && (
          <CategoryDrilldown records={dayRecords} prevRecords={prevDayRecords} budget={budget} />
        )}
      </DetailModalContent>
    </PinModalOverlay>
  )
}
