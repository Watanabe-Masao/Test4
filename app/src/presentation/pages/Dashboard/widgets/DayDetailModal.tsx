import { useState, useMemo, useCallback, Fragment } from 'react'
import styled from 'styled-components'
import { sc } from '@/presentation/theme/semanticColors'
import { formatCurrency, formatPercent, calculateTransactionValue } from '@/domain/calculations/utils'
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
type CompareMode = 'daily' | 'cumulative'
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

function buildDrillItems(
  filtered: readonly CategoryTimeSalesRecord[],
  filteredPrev: readonly CategoryTimeSalesRecord[],
  level: 'department' | 'line' | 'klass',
  metric: MetricKey,
  colorMap: Map<string, string>,
  hasPrev: boolean,
): DrillItem[] {
  const map = aggregateForDrill(filtered, level)
  const prevMap = hasPrev ? aggregateForDrill(filteredPrev, level) : null
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
      const color = colorMap.get(it.code) ?? COLORS[i % COLORS.length]
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
const StackBarTitle = styled.div`
  font-size: 0.65rem; font-weight: 600;
  color: ${({ theme }) => theme.colors.text3};
  margin-bottom: 4px;
`
const StackRow = styled.div`
  display: flex; align-items: center; gap: 8px; margin-bottom: 6px;
`
const StackLabel = styled.span`
  font-size: 0.62rem; color: ${({ theme }) => theme.colors.text3};
  min-width: 32px; text-align: right; white-space: nowrap;
`
const StackTrack = styled.div`
  flex: 1; height: 32px; border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.bg4};
  overflow: hidden; display: flex; position: relative;
`
const StackSegment = styled.div<{ $flex: number; $color: string }>`
  flex: ${({ $flex }) => Math.max($flex, 0)}; min-width: 0;
  background: ${({ $color }) => $color}; height: 100%;
  transition: flex 0.3s ease;
  position: relative; overflow: hidden;
  display: flex; align-items: center; justify-content: center;
  &:hover { opacity: 0.85; z-index: 1; }
`
const SegLabel = styled.span`
  font-size: 0.5rem; color: #fff; font-weight: 600; white-space: nowrap;
  text-shadow: 0 1px 2px rgba(0,0,0,0.4); pointer-events: none;
  overflow: hidden; text-overflow: ellipsis; padding: 0 2px;
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

/* ── Tab styled components ──────────────── */

const TabBar = styled.div`
  display: flex; gap: 0; border-bottom: 2px solid ${({ theme }) => theme.colors.border};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`
const Tab = styled.button<{ $active: boolean }>`
  all: unset; cursor: pointer; font-size: 0.75rem; font-weight: 600;
  padding: 8px 16px; white-space: nowrap; position: relative;
  color: ${({ $active, theme }) => $active ? theme.colors.palette.primary : theme.colors.text3};
  transition: color 0.15s;
  &::after {
    content: ''; position: absolute; left: 0; right: 0; bottom: -2px; height: 2px;
    background: ${({ $active, theme }) => $active ? theme.colors.palette.primary : 'transparent'};
    transition: background 0.15s;
  }
  &:hover { color: ${({ theme }) => theme.colors.text}; }
`

/* ── KPI mini card (compact 2nd row) ───── */

const KpiGrid2 = styled.div`
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`
const KpiMini = styled.div<{ $accent?: string }>`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 3px solid ${({ $accent }) => $accent ?? '#6366f1'};
  border-radius: ${({ theme }) => theme.radii.sm};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
`
const KpiMiniLabel = styled.div`
  font-size: 0.6rem; color: ${({ theme }) => theme.colors.text4}; margin-bottom: 2px;
`
const KpiMiniValue = styled.div<{ $color?: string }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 0.85rem; font-weight: 700;
  color: ${({ $color, theme }) => $color ?? theme.colors.text};
`
const KpiMiniSub = styled.span`
  font-size: 0.55rem; color: ${({ theme }) => theme.colors.text4}; margin-left: 4px;
`

/* ── Hourly Chart styled components ────── */

const HourlySection = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`
const HourlyChartWrap = styled.div`
  display: flex; align-items: flex-end; gap: 2px; height: 120px;
  padding: 0 4px; margin-bottom: 4px;
`
const HourlyBar = styled.div<{ $pct: number; $color: string }>`
  flex: 1; min-width: 0; border-radius: 2px 2px 0 0;
  background: ${({ $color }) => $color}; opacity: 0.8;
  height: ${({ $pct }) => Math.max($pct, 1)}%;
  transition: opacity 0.15s, height 0.3s ease;
  position: relative; cursor: pointer;
  &:hover { opacity: 1; }
`
const HourlyAxis = styled.div`
  display: flex; gap: 2px; padding: 0 4px;
`
const HourlyTick = styled.div`
  flex: 1; text-align: center; font-size: 0.5rem;
  color: ${({ theme }) => theme.colors.text4}; font-family: monospace;
`
const HourlyTooltipBox = styled.div`
  position: absolute; bottom: calc(100% + 4px); left: 50%; transform: translateX(-50%);
  z-index: 100; padding: 4px 8px; border-radius: 4px;
  font-size: 0.55rem; white-space: nowrap;
  background: ${({ theme }) => theme.mode === 'dark' ? '#1e1e2e' : '#fff'};
  color: ${({ theme }) => theme.colors.text}; border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: 0 2px 8px rgba(0,0,0,0.2); pointer-events: none;
`
const HourlySummaryRow = styled.div`
  display: flex; gap: ${({ theme }) => theme.spacing[4]}; flex-wrap: wrap;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`
const HourlySumItem = styled.div`
  display: flex; align-items: baseline; gap: 3px; font-size: 0.65rem;
`

/* ── Hourly Detail styled components ────── */

const HourlyDetailPanel = styled.div`
  margin-top: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
`
const HourlyDetailHeader = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`
const HourlyDetailTitle = styled.span`
  font-size: 0.72rem; font-weight: 600; color: ${({ theme }) => theme.colors.text};
`
const HourlyDetailClose = styled.button`
  all: unset; cursor: pointer; font-size: 0.65rem;
  padding: 2px 8px; border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.colors.text3};
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  &:hover { opacity: 0.7; }
`
const HourlyDetailSummary = styled.div`
  display: flex; gap: ${({ theme }) => theme.spacing[4]}; flex-wrap: wrap;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`

interface HourCategoryItem {
  dept: string; line: string; klass: string
  amount: number; quantity: number; pct: number; color: string
}

/* ── Hourly Chart Sub-component ─────────── */

function HourlyChart({ dayRecords }: { dayRecords: readonly CategoryTimeSalesRecord[] }) {
  const [hoveredHour, setHoveredHour] = useState<number | null>(null)
  const [selectedHour, setSelectedHour] = useState<number | null>(null)

  const hourlyData = useMemo(() => {
    const map = new Map<number, { amount: number; quantity: number }>()
    for (const rec of dayRecords) {
      for (const slot of rec.timeSlots) {
        const ex = map.get(slot.hour) ?? { amount: 0, quantity: 0 }
        ex.amount += slot.amount
        ex.quantity += slot.quantity
        map.set(slot.hour, ex)
      }
    }
    // Build array for display hours (typically 6-22)
    const entries = [...map.entries()].sort(([a], [b]) => a - b)
    if (entries.length === 0) return []
    const minH = Math.min(...entries.map(([h]) => h))
    const maxH = Math.max(...entries.map(([h]) => h))
    const result: { hour: number; amount: number; quantity: number }[] = []
    for (let h = minH; h <= maxH; h++) {
      const d = map.get(h)
      result.push({ hour: h, amount: d?.amount ?? 0, quantity: d?.quantity ?? 0 })
    }
    return result
  }, [dayRecords])

  // Category breakdown for the selected hour
  const hourDetail = useMemo((): HourCategoryItem[] => {
    if (selectedHour == null) return []
    const map = new Map<string, { dept: string; line: string; klass: string; amount: number; quantity: number }>()
    for (const rec of dayRecords) {
      const slot = rec.timeSlots.find((s) => s.hour === selectedHour)
      if (!slot || (slot.amount === 0 && slot.quantity === 0)) continue
      const key = `${rec.department.code}|${rec.line.code}|${rec.klass.code}`
      const ex = map.get(key) ?? {
        dept: rec.department.name || rec.department.code,
        line: rec.line.name || rec.line.code,
        klass: rec.klass.name || rec.klass.code,
        amount: 0, quantity: 0,
      }
      ex.amount += slot.amount
      ex.quantity += slot.quantity
      map.set(key, ex)
    }
    const items = [...map.values()].sort((a, b) => b.amount - a.amount)
    const totalAmt = items.reduce((s, it) => s + it.amount, 0)
    return items.map((it, i) => ({
      ...it,
      pct: totalAmt > 0 ? (it.amount / totalAmt) * 100 : 0,
      color: COLORS[i % COLORS.length],
    }))
  }, [dayRecords, selectedHour])

  if (hourlyData.length === 0) return null

  const maxAmt = Math.max(...hourlyData.map((d) => d.amount), 1)
  const totalAmt = hourlyData.reduce((s, d) => s + d.amount, 0)
  const totalQty = hourlyData.reduce((s, d) => s + d.quantity, 0)
  const peakHour = hourlyData.reduce((peak, d) => d.amount > peak.amount ? d : peak, hourlyData[0])
  const selData = selectedHour != null ? hourlyData.find((d) => d.hour === selectedHour) : null

  return (
    <HourlySection>
      <DetailSectionTitle>時間帯別売上</DetailSectionTitle>
      <HourlySummaryRow>
        <HourlySumItem>
          <SumLabel>合計</SumLabel>
          <SumValue>{toComma(totalAmt)}円</SumValue>
        </HourlySumItem>
        <HourlySumItem>
          <SumLabel>合計点数</SumLabel>
          <SumValue>{totalQty.toLocaleString()}点</SumValue>
        </HourlySumItem>
        <HourlySumItem>
          <SumLabel>ピーク</SumLabel>
          <SumValue>{peakHour.hour}時（{toComma(peakHour.amount)}円）</SumValue>
        </HourlySumItem>
      </HourlySummaryRow>
      <HourlyChartWrap>
        {hourlyData.map((d) => {
          const pct = (d.amount / maxAmt) * 100
          const isPeak = d.hour === peakHour.hour
          const isSelected = d.hour === selectedHour
          return (
            <HourlyBar
              key={d.hour}
              $pct={pct}
              $color={isSelected ? '#ec4899' : isPeak ? '#f59e0b' : '#6366f1'}
              onMouseEnter={() => setHoveredHour(d.hour)}
              onMouseLeave={() => setHoveredHour(null)}
              onClick={() => setSelectedHour(d.hour === selectedHour ? null : d.hour)}
              style={{ outline: isSelected ? '2px solid #ec4899' : undefined, outlineOffset: -1 }}
            >
              {hoveredHour === d.hour && !isSelected && (
                <HourlyTooltipBox>
                  {d.hour}時: {toComma(d.amount)}円 / {d.quantity.toLocaleString()}点
                  <br /><span style={{ fontSize: '0.45rem', opacity: 0.7 }}>クリックで詳細表示</span>
                </HourlyTooltipBox>
              )}
            </HourlyBar>
          )
        })}
      </HourlyChartWrap>
      <HourlyAxis>
        {hourlyData.map((d) => (
          <HourlyTick key={d.hour} style={{
            fontWeight: d.hour === selectedHour ? 700 : 400,
            color: d.hour === selectedHour ? '#ec4899' : undefined,
          }}>{d.hour}</HourlyTick>
        ))}
      </HourlyAxis>

      {/* ── Hour detail panel ── */}
      {selectedHour != null && selData && (
        <HourlyDetailPanel>
          <HourlyDetailHeader>
            <HourlyDetailTitle>{selectedHour}時台の分類別内訳</HourlyDetailTitle>
            <HourlyDetailClose onClick={() => setSelectedHour(null)}>閉じる</HourlyDetailClose>
          </HourlyDetailHeader>
          <HourlyDetailSummary>
            <HourlySumItem>
              <SumLabel>時間合計</SumLabel>
              <SumValue>{toComma(selData.amount)}円</SumValue>
            </HourlySumItem>
            <HourlySumItem>
              <SumLabel>点数</SumLabel>
              <SumValue>{selData.quantity.toLocaleString()}点</SumValue>
            </HourlySumItem>
            <HourlySumItem>
              <SumLabel>全体比</SumLabel>
              <SumValue>{totalAmt > 0 ? (selData.amount / totalAmt * 100).toFixed(2) : '0.00'}%</SumValue>
            </HourlySumItem>
            <HourlySumItem>
              <SumLabel>分類数</SumLabel>
              <SumValue>{hourDetail.length}</SumValue>
            </HourlySumItem>
          </HourlyDetailSummary>
          {hourDetail.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <DrillTable>
                <thead><tr>
                  <DTh>#</DTh>
                  <DTh>部門</DTh>
                  <DTh>ライン</DTh>
                  <DTh>クラス</DTh>
                  <DTh>売上金額</DTh>
                  <DTh>点数</DTh>
                  <DTh>構成比</DTh>
                </tr></thead>
                <tbody>
                  {hourDetail.map((it, i) => (
                    <DTr key={`${it.dept}-${it.line}-${it.klass}`} $clickable={false}>
                      <DTd $mono>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <LegendDot $color={it.color} />
                          {i + 1}
                        </span>
                      </DTd>
                      <DTdName>{it.dept}</DTdName>
                      <DTd>{it.line}</DTd>
                      <DTd>{it.klass}</DTd>
                      <DTdAmt>
                        <AmtWrap>
                          <AmtTrack>
                            <AmtFill $pct={it.pct} $color={it.color} />
                          </AmtTrack>
                          <AmtVal>{toComma(it.amount)}円</AmtVal>
                        </AmtWrap>
                      </DTdAmt>
                      <DTd $mono>{it.quantity.toLocaleString()}点</DTd>
                      <DTd $mono>{it.pct.toFixed(2)}%</DTd>
                    </DTr>
                  ))}
                </tbody>
              </DrillTable>
            </div>
          )}
        </HourlyDetailPanel>
      )}
    </HourlySection>
  )
}

/* ── Category Drilldown Sub-component ──── */

function CategoryDrilldown({
  records, prevRecords, budget,
  cumRecords, cumPrevRecords, cumBudget,
  actual, ach, pySales, hasPrevYearSales,
  cumSales, cumAch, cumPrevYear,
  year, month, day,
}: {
  records: readonly CategoryTimeSalesRecord[]
  prevRecords: readonly CategoryTimeSalesRecord[]
  budget: number
  cumRecords: readonly CategoryTimeSalesRecord[]
  cumPrevRecords: readonly CategoryTimeSalesRecord[]
  cumBudget: number
  actual: number; ach: number; pySales: number; hasPrevYearSales: boolean
  cumSales: number; cumAch: number; cumPrevYear: number
  year: number; month: number; day: number
}) {
  const [filter, setFilter] = useState<HierarchyFilter>({})
  const [sortKey, setSortKey] = useState<SortKey>('amount')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [metric, setMetric] = useState<MetricKey>('amount')
  const [compare, setCompare] = useState<CompareMode>('daily')
  const [hoveredSeg, setHoveredSeg] = useState<string | null>(null)

  const currentLevel = getHierarchyLevel(filter)
  const levelLabels: Record<string, string> = { department: '部門', line: 'ライン', klass: 'クラス' }
  const hasPrevYear = prevRecords.length > 0 || cumPrevRecords.length > 0 || hasPrevYearSales

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

  // Day data
  const dayFiltered = useMemo(() => filterByHierarchy(records, filter), [records, filter])
  const dayFilteredPrev = useMemo(() => hasPrevYear ? filterByHierarchy(prevRecords, filter) : [], [prevRecords, filter, hasPrevYear])
  // Cumulative data
  const cumFiltered = useMemo(() => filterByHierarchy(cumRecords, filter), [cumRecords, filter])
  const cumFilteredPrev = useMemo(() => hasPrevYear ? filterByHierarchy(cumPrevRecords, filter) : [], [cumPrevRecords, filter, hasPrevYear])

  // Stable color mapping for the current drill level
  const levelColorMap = useMemo(() => {
    const map = new Map<string, string>()
    if (currentLevel === 'department') {
      const base = cumRecords.length > 0 ? cumRecords : records
      const deptMap = aggregateForDrill(base, 'department')
      const sorted = [...deptMap.values()].sort((a, b) => b.amount - a.amount)
      sorted.forEach((d, i) => map.set(d.code, COLORS[i % COLORS.length]))
    } else {
      // Sub-levels: build from cumulative (more complete), fallback to day
      const cumMap = aggregateForDrill(cumFiltered, currentLevel)
      const cumSorted = [...cumMap.values()].sort((a, b) => b.amount - a.amount)
      cumSorted.forEach((it, i) => map.set(it.code, COLORS[i % COLORS.length]))
      const dayMap = aggregateForDrill(dayFiltered, currentLevel)
      for (const it of dayMap.values()) {
        if (!map.has(it.code)) map.set(it.code, COLORS[map.size % COLORS.length])
      }
    }
    return map
  }, [records, cumRecords, cumFiltered, dayFiltered, currentLevel])

  // Build items for day and cumulative (both at the current drill level)
  const dayItems = useMemo(
    () => buildDrillItems(dayFiltered, dayFilteredPrev, currentLevel, metric, levelColorMap, hasPrevYear),
    [dayFiltered, dayFilteredPrev, currentLevel, metric, levelColorMap, hasPrevYear],
  )
  const cumItemsList = useMemo(
    () => buildDrillItems(cumFiltered, cumFilteredPrev, currentLevel, metric, levelColorMap, hasPrevYear),
    [cumFiltered, cumFilteredPrev, currentLevel, metric, levelColorMap, hasPrevYear],
  )

  // Use day or cumulative items for table/treemap/summary based on compare mode
  const items = compare === 'daily' ? dayItems : cumItemsList

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

  // ── Bar section renderer (shared for 当日 and 累計) ──
  const renderBarSection = (
    title: string,
    barItems: DrillItem[],
    budgetVal: number,
    actualVal: number,
    _achVal: number,
    pyVal: number,
    prefix: string,
  ) => {
    const bActualTotal = isAmountMode
      ? barItems.reduce((s, it) => s + it.amount, 0)
      : barItems.reduce((s, it) => s + it.quantity, 0)
    const bPrevTotal = isAmountMode
      ? barItems.reduce((s, it) => s + (it.prevAmount ?? 0), 0)
      : barItems.reduce((s, it) => s + (it.prevQuantity ?? 0), 0)
    const maxBar = isAmountMode
      ? Math.max(budgetVal, bActualTotal, bPrevTotal, 1)
      : Math.max(bActualTotal, bPrevTotal, 1)

    const tooltipFn = (it: DrillItem, val: number, total: number, isPrev: boolean) => {
      const pct = total > 0 ? (val / total * 100).toFixed(2) : '0.00'
      const prevVal = isAmountMode ? (it.prevAmount ?? 0) : (it.prevQuantity ?? 0)
      const curVal = isAmountMode ? it.amount : it.quantity
      const yoy = isPrev ? undefined : (prevVal > 0 ? (curVal / prevVal * 100).toFixed(2) : undefined)
      const valStr = isAmountMode ? fmtSen(val) : `${val.toLocaleString()}点`
      const lines = [`${it.name}`, `${valStr}（構成比 ${pct}%）`]
      if (!isPrev && yoy) lines.push(`前年比 ${yoy}%`)
      if (!isPrev && prevVal > 0) {
        const prevStr = isAmountMode ? fmtSen(prevVal) : `${prevVal.toLocaleString()}点`
        lines.push(`前年 ${prevStr}`)
      }
      return lines.join(' / ')
    }

    return (
      <StackedBarSection>
        <StackBarTitle>{title}</StackBarTitle>
        {/* 予算 bar (金額モードのみ) */}
        {budgetVal > 0 && isAmountMode && (
          <StackRow>
            <StackLabel>予算</StackLabel>
            <StackTrack>
              <StackSegment $flex={budgetVal / maxBar} $color="#94a3b8" style={{ opacity: 0.7 }} />
            </StackTrack>
            <StackTotal>{fmtSen(budgetVal)}</StackTotal>
          </StackRow>
        )}
        {/* 実績 bar */}
        <StackRow>
          <StackLabel>実績</StackLabel>
          <StackTrack>
            {barItems.map((it) => {
              const val = isAmountMode ? it.amount : it.quantity
              if (val <= 0) return null
              const pct = bActualTotal > 0 ? (val / bActualTotal * 100) : 0
              return (
                <StackSegment
                  key={it.code} $flex={val / maxBar} $color={it.color}
                  onMouseEnter={() => setHoveredSeg(`${prefix}a-${it.code}`)}
                  onMouseLeave={() => setHoveredSeg(null)}
                  onDoubleClick={() => canDrill && handleDrill(it)}
                  style={{ cursor: canDrill ? 'pointer' : 'default' }}
                >
                  {pct >= 10 && <SegLabel>{it.name} {pct.toFixed(2)}%</SegLabel>}
                  {hoveredSeg === `${prefix}a-${it.code}` && (
                    <SegmentTooltip>{tooltipFn(it, val, bActualTotal, false)}</SegmentTooltip>
                  )}
                </StackSegment>
              )
            })}
          </StackTrack>
          <StackTotal>
            {isAmountMode ? fmtSen(actualVal) : fmtVal(bActualTotal)}
          </StackTotal>
        </StackRow>
        {/* 前年 bar */}
        {hasPrevYear && pyVal > 0 && (
          <StackRow>
            <StackLabel>前年</StackLabel>
            <StackTrack>
              {barItems.map((it) => {
                const val = isAmountMode ? (it.prevAmount ?? 0) : (it.prevQuantity ?? 0)
                if (val <= 0) return null
                const pct = bPrevTotal > 0 ? (val / bPrevTotal * 100) : 0
                return (
                  <StackSegment
                    key={it.code} $flex={val / maxBar} $color={it.color}
                    style={{ opacity: 0.5, cursor: canDrill ? 'pointer' : 'default' }}
                    onMouseEnter={() => setHoveredSeg(`${prefix}p-${it.code}`)}
                    onMouseLeave={() => setHoveredSeg(null)}
                    onDoubleClick={() => canDrill && handleDrill(it)}
                  >
                    {pct >= 10 && <SegLabel>{it.name} {pct.toFixed(2)}%</SegLabel>}
                    {hoveredSeg === `${prefix}p-${it.code}` && (
                      <SegmentTooltip>{tooltipFn(it, val, bPrevTotal, true)}</SegmentTooltip>
                    )}
                  </StackSegment>
                )
              })}
            </StackTrack>
            <StackTotal>{isAmountMode ? fmtSen(bPrevTotal) : fmtVal(bPrevTotal)}</StackTotal>
          </StackRow>
        )}
        {/* Legend */}
        <LegendRow>
          {barItems.filter((it) => it.amount > 0 || it.quantity > 0).map((it) => (
            <LegendItem key={it.code} $clickable={canDrill}
              onClick={() => canDrill && handleDrill(it)}>
              <LegendDot $color={it.color} />
              <span>{it.name}</span>
            </LegendItem>
          ))}
        </LegendRow>
      </StackedBarSection>
    )
  }

  if (dayItems.length === 0 && cumItemsList.length === 0) return null

  return (
    <DrillSection>
      <DetailSectionTitle>分類別売上ドリルダウン</DetailSectionTitle>

      {/* Toggle controls (指標 & 比較) */}
      <ToggleBar>
        <ToggleLabel>指標</ToggleLabel>
        <ToggleGroup>
          <ToggleBtn $active={metric === 'amount'} onClick={() => setMetric('amount')}>販売金額</ToggleBtn>
          <ToggleBtn $active={metric === 'quantity'} onClick={() => setMetric('quantity')}>点数</ToggleBtn>
        </ToggleGroup>
        <ToggleLabel>比較</ToggleLabel>
        <ToggleGroup>
          <ToggleBtn $active={compare === 'daily'} onClick={() => setCompare('daily')}>単日</ToggleBtn>
          <ToggleBtn $active={compare === 'cumulative'} onClick={() => setCompare('cumulative')}>累計</ToggleBtn>
        </ToggleGroup>
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
        <SumItem><SumLabel>合計（{compare === 'daily' ? '当日' : '累計'}）</SumLabel><SumValue>{fmtVal(displayTotal)}</SumValue></SumItem>
        {hasPrevYear && displayYoY != null && (
          <SumItem>
            <SumLabel>前年比</SumLabel>
            <SumValue><YoYVal $positive={displayYoY >= 1}>{(displayYoY * 100).toFixed(2)}%</YoYVal></SumValue>
          </SumItem>
        )}
      </SummaryRow>

      {/* ── 当日 bar chart ── */}
      {renderBarSection(`予算 vs 実績（当日）${year}年${month}月${day}日`, dayItems, budget, actual, ach, pySales, 'day-')}
      {/* ── 累計 bar chart ── */}
      {renderBarSection(`予算 vs 実績（累計）${year}年${month}月1日〜${year}年${month}月${day}日`, cumItemsList, cumBudget, cumSales, cumAch, cumPrevYear, 'cum-')}

      {/* Treemap */}
      <DrillTreemap>
        {items.slice(0, 12).map((it) => {
          const val = isAmountMode ? it.amount : it.quantity
          return (
            <TreeBlock key={it.code} $flex={val} $color={it.color}
              $canDrill={canDrill}
              onClick={() => canDrill && handleDrill(it)}
              onDoubleClick={() => canDrill && handleDrill(it)}
              title={`${it.name}: ${fmtVal(val)} (${it.pct.toFixed(2)}%)`}>
              <TreeLabel>{it.name}</TreeLabel>
              <TreePct>{it.pct.toFixed(2)}%</TreePct>
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
            <DTh $sortable onClick={() => handleSort('quantity')}>
              {isAmountMode ? '数量' : '売上金額'}{arrow('quantity')}
            </DTh>
            {hasPrevYear && (
              <>
                <DTh>前年</DTh>
                <DTh $sortable onClick={() => handleSort('yoyRatio')}>前年比{arrow('yoyRatio')}</DTh>
              </>
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
                <DTr key={it.code} $clickable={canDrill}
                  onClick={() => canDrill && handleDrill(it)}
                  onDoubleClick={() => canDrill && handleDrill(it)}>
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
                  <DTd $mono>{it.pct.toFixed(2)}%</DTd>
                  <DTd $mono>{isAmountMode ? `${subVal.toLocaleString()}点` : `${toComma(subVal)}円`}</DTd>
                  {hasPrevYear && (
                    <>
                      <DTd $mono>{prevMainVal != null ? fmtVal(prevMainVal) : '-'}</DTd>
                      <DTd $mono>
                        {yoy != null ? (
                          <YoYVal $positive={yoy >= 1}>{(yoy * 100).toFixed(2)}%</YoYVal>
                        ) : '-'}
                      </DTd>
                    </>
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

/* ── Main Modal ──────────────────────────── */

type ModalTab = 'sales' | 'hourly' | 'breakdown'

interface DayDetailModalProps {
  day: number
  month: number
  year: number
  record: DailyRecord | undefined
  budget: number
  cumBudget: number
  cumSales: number
  cumPrevYear: number
  cumCustomers: number
  cumPrevCustomers: number
  prevYear: PrevYearData
  categoryRecords: readonly CategoryTimeSalesRecord[]
  prevYearCategoryRecords: readonly CategoryTimeSalesRecord[]
  onClose: () => void
}

export function DayDetailModal({
  day, month, year, record, budget, cumBudget, cumSales, cumPrevYear,
  cumCustomers, cumPrevCustomers, prevYear,
  categoryRecords, prevYearCategoryRecords, onClose,
}: DayDetailModalProps) {
  const [tab, setTab] = useState<ModalTab>('sales')
  const DOW_NAMES = ['日', '月', '火', '水', '木', '金', '土']

  // ── Core metrics ──
  const actual = record?.sales ?? 0
  const diff = actual - budget
  const ach = budget > 0 ? actual / budget : 0
  const cumDiff = cumSales - cumBudget
  const cumAch = cumBudget > 0 ? cumSales / cumBudget : 0
  const pySales = prevYear.daily.get(day)?.sales ?? 0
  const pyRatio = pySales > 0 ? actual / pySales : 0
  const dayOfWeek = DOW_NAMES[new Date(year, month - 1, day).getDay()]

  // ── Customer metrics ──
  const dayCust = record?.customers ?? 0
  const dayTxVal = calculateTransactionValue(actual, dayCust)
  const pyCust = prevYear.daily.get(day)?.customers ?? 0
  const pyTxVal = calculateTransactionValue(pySales, pyCust)
  const cumTxVal = calculateTransactionValue(cumSales, cumCustomers)
  const cumPrevTxVal = calculateTransactionValue(cumPrevYear, cumPrevCustomers)
  const custRatio = pyCust > 0 ? dayCust / pyCust : 0
  const txValRatio = pyTxVal > 0 ? dayTxVal / pyTxVal : 0

  // ── Category records ──
  const dayRecords = useMemo(
    () => categoryRecords.filter((r) => r.day === day),
    [categoryRecords, day],
  )
  const prevDayRecords = useMemo(
    () => prevYearCategoryRecords.filter((r) => r.day === day),
    [prevYearCategoryRecords, day],
  )
  const cumCategoryRecords = useMemo(
    () => categoryRecords.filter((r) => r.day <= day),
    [categoryRecords, day],
  )
  const cumPrevCategoryRecords = useMemo(
    () => prevYearCategoryRecords.filter((r) => r.day <= day),
    [prevYearCategoryRecords, day],
  )

  return (
    <PinModalOverlay onClick={onClose}>
      <DetailModalContent onClick={(e) => e.stopPropagation()}>
        <DetailHeader>
          <DetailTitle>{month}月{day}日（{dayOfWeek}）の詳細</DetailTitle>
          <DetailCloseBtn onClick={onClose}>✕</DetailCloseBtn>
        </DetailHeader>

        {/* ── KPI Row 1: Sales ── */}
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

        {/* ── KPI Row 2: Customers & Comparison ── */}
        <KpiGrid2>
          <KpiMini $accent="#06b6d4">
            <KpiMiniLabel>客数</KpiMiniLabel>
            <KpiMiniValue>
              {dayCust > 0 ? `${dayCust.toLocaleString()}人` : '-'}
              {prevYear.hasPrevYear && pyCust > 0 && custRatio > 0 && (
                <KpiMiniSub style={{ color: custRatio >= 1 ? '#22c55e' : '#ef4444' }}>
                  (前年比{formatPercent(custRatio)})
                </KpiMiniSub>
              )}
            </KpiMiniValue>
          </KpiMini>
          <KpiMini $accent="#8b5cf6">
            <KpiMiniLabel>客単価</KpiMiniLabel>
            <KpiMiniValue>
              {dayTxVal > 0 ? formatCurrency(dayTxVal) : '-'}
              {prevYear.hasPrevYear && pyTxVal > 0 && txValRatio > 0 && (
                <KpiMiniSub style={{ color: txValRatio >= 1 ? '#22c55e' : '#ef4444' }}>
                  (前年比{formatPercent(txValRatio)})
                </KpiMiniSub>
              )}
            </KpiMiniValue>
          </KpiMini>
          <KpiMini $accent={sc.cond(pyRatio >= 1)}>
            <KpiMiniLabel>前年売上</KpiMiniLabel>
            <KpiMiniValue>
              {prevYear.hasPrevYear && pySales > 0 ? formatCurrency(pySales) : '-'}
            </KpiMiniValue>
          </KpiMini>
          <KpiMini $accent={sc.cond(pyRatio >= 1)}>
            <KpiMiniLabel>前年比</KpiMiniLabel>
            <KpiMiniValue $color={pyRatio > 0 ? sc.cond(pyRatio >= 1) : undefined}>
              {prevYear.hasPrevYear && pyRatio > 0 ? formatPercent(pyRatio) : '-'}
            </KpiMiniValue>
          </KpiMini>
        </KpiGrid2>

        {/* ── Tab Navigation ── */}
        <TabBar>
          <Tab $active={tab === 'sales'} onClick={() => setTab('sales')}>売上分析</Tab>
          <Tab $active={tab === 'hourly'} onClick={() => setTab('hourly')}>時間帯分析</Tab>
          <Tab $active={tab === 'breakdown'} onClick={() => setTab('breakdown')}>仕入内訳</Tab>
        </TabBar>

        {/* ── Tab: 売上分析 ── */}
        {tab === 'sales' && (
          <>
            {dayRecords.length > 0 && (
              <CategoryDrilldown
                records={dayRecords}
                prevRecords={prevDayRecords}
                budget={budget}
                cumRecords={cumCategoryRecords}
                cumPrevRecords={cumPrevCategoryRecords}
                cumBudget={cumBudget}
                actual={actual}
                ach={ach}
                pySales={pySales}
                hasPrevYearSales={prevYear.hasPrevYear}
                cumSales={cumSales}
                cumAch={cumAch}
                cumPrevYear={cumPrevYear}
                year={year}
                month={month}
                day={day}
              />
            )}

            {/* Cumulative summary */}
            <DetailSection>
              <DetailSectionTitle>累計情報（1日〜{day}日）</DetailSectionTitle>
              <DetailColumns>
                <div>
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
                </div>
                <div>
                  <DetailRow>
                    <DetailLabel>累計客数</DetailLabel>
                    <DetailValue>
                      {cumCustomers > 0 ? `${cumCustomers.toLocaleString()}人` : '-'}
                    </DetailValue>
                  </DetailRow>
                  <DetailRow>
                    <DetailLabel>累計客単価</DetailLabel>
                    <DetailValue>{cumTxVal > 0 ? formatCurrency(cumTxVal) : '-'}</DetailValue>
                  </DetailRow>
                  {prevYear.hasPrevYear && cumPrevYear > 0 && (
                    <>
                      <DetailRow>
                        <DetailLabel>前年累計</DetailLabel>
                        <DetailValue>{formatCurrency(cumPrevYear)}</DetailValue>
                      </DetailRow>
                      <DetailRow>
                        <DetailLabel>前年累計客単価</DetailLabel>
                        <DetailValue>{cumPrevTxVal > 0 ? formatCurrency(cumPrevTxVal) : '-'}</DetailValue>
                      </DetailRow>
                    </>
                  )}
                </div>
              </DetailColumns>
            </DetailSection>
          </>
        )}

        {/* ── Tab: 時間帯分析 ── */}
        {tab === 'hourly' && (
          <>
            <HourlyChart dayRecords={dayRecords} />
            {dayRecords.length === 0 && (
              <DetailSection>
                <DetailSectionTitle>時間帯別売上</DetailSectionTitle>
                <DetailRow><DetailLabel>データなし</DetailLabel><DetailValue>-</DetailValue></DetailRow>
              </DetailSection>
            )}
          </>
        )}

        {/* ── Tab: 仕入内訳 ── */}
        {tab === 'breakdown' && (
          <DetailSection>
            <DetailSectionTitle>仕入・コスト内訳</DetailSectionTitle>
            {record ? (() => {
              const totalCost = getDailyTotalCost(record)
              const costItems: { label: string; cost: number; price: number }[] = [
                { label: '仕入（在庫）', cost: record.purchase.cost, price: record.purchase.price },
                { label: '花', cost: record.flowers.cost, price: record.flowers.price },
                { label: '産直', cost: record.directProduce.cost, price: record.directProduce.price },
                { label: '店間入', cost: record.interStoreIn.cost, price: record.interStoreIn.price },
                { label: '店間出', cost: record.interStoreOut.cost, price: record.interStoreOut.price },
                { label: '部門間入', cost: record.interDepartmentIn.cost, price: record.interDepartmentIn.price },
                { label: '部門間出', cost: record.interDepartmentOut.cost, price: record.interDepartmentOut.price },
              ].filter(item => item.cost !== 0 || item.price !== 0)
              const totalPrice = costItems.reduce((sum, item) => sum + Math.abs(item.price), 0)

              return (
                <>
                  {costItems.map((item) => {
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
                  {actual > 0 && totalCost > 0 && (
                    <DetailRow>
                      <DetailLabel>原価率</DetailLabel>
                      <DetailValue>{formatPercent(totalCost / actual)}</DetailValue>
                    </DetailRow>
                  )}
                  {record.consumable.cost > 0 && (
                    <DetailRow>
                      <DetailLabel>消耗品費</DetailLabel>
                      <DetailValue>{formatCurrency(record.consumable.cost)}</DetailValue>
                    </DetailRow>
                  )}
                  {record.discountAmount !== 0 && (
                    <>
                      <DetailRow>
                        <DetailLabel>売変額</DetailLabel>
                        <DetailValue $color={sc.negative}>{formatCurrency(record.discountAmount)}</DetailValue>
                      </DetailRow>
                      {record.grossSales > 0 && (
                        <DetailRow>
                          <DetailLabel>売変率</DetailLabel>
                          <DetailValue $color={sc.negative}>
                            {formatPercent(Math.abs(record.discountAmount) / record.grossSales)}
                          </DetailValue>
                        </DetailRow>
                      )}
                    </>
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
        )}

      </DetailModalContent>
    </PinModalOverlay>
  )
}
