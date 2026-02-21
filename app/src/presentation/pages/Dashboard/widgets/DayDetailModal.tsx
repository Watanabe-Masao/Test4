import { useState, useMemo, useCallback, Fragment } from 'react'
import styled from 'styled-components'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell as ReCell, CartesianGrid,
} from 'recharts'
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
  DetailChartWrapper, DetailColumns,
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
  childCount: number; hourlyPattern: number[]; peakHour: number
  prevAmount?: number; yoyRatio?: number; yoyDiff?: number
}

type SortKey = 'amount' | 'quantity' | 'pct' | 'name' | 'yoyRatio'
type SortDir = 'asc' | 'desc'

function aggregateForDrill(
  records: readonly CategoryTimeSalesRecord[],
  level: 'department' | 'line' | 'klass',
) {
  const map = new Map<string, {
    code: string; name: string; amount: number; quantity: number
    hours: Map<number, number>; children: Set<string>
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
    const ex = map.get(key) ?? { code: key, name, amount: 0, quantity: 0, hours: new Map(), children: new Set() }
    ex.amount += rec.totalAmount; ex.quantity += rec.totalQuantity
    if (childKey) ex.children.add(childKey)
    for (const s of rec.timeSlots) ex.hours.set(s.hour, (ex.hours.get(s.hour) ?? 0) + s.amount)
    map.set(key, ex)
  }
  return map
}

/* ── Category Drilldown Sub-component ──── */

function CategoryDrilldown({
  records, prevRecords,
}: {
  records: readonly CategoryTimeSalesRecord[]
  prevRecords: readonly CategoryTimeSalesRecord[]
}) {
  const [filter, setFilter] = useState<HierarchyFilter>({})
  const [sortKey, setSortKey] = useState<SortKey>('amount')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

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

  const items = useMemo(() => {
    const map = aggregateForDrill(filtered, currentLevel)
    const prevMap = hasPrevYear ? aggregateForDrill(filteredPrev, currentLevel) : null
    const total = [...map.values()].reduce((s, v) => s + v.amount, 0)
    return [...map.values()].map((it): DrillItem => {
      const hp = Array.from({ length: 24 }, (_, h) => Math.round(it.hours.get(h) ?? 0))
      const mx = Math.max(...hp)
      const prev = prevMap?.get(it.code)
      const prevAmt = prev ? prev.amount : undefined
      return {
        code: it.code, name: it.name, amount: it.amount, quantity: it.quantity,
        pct: total > 0 ? (it.amount / total) * 100 : 0,
        childCount: it.children.size, hourlyPattern: hp, peakHour: mx > 0 ? hp.indexOf(mx) : -1,
        prevAmount: prevAmt,
        yoyRatio: prevAmt && prevAmt > 0 ? it.amount / prevAmt : undefined,
        yoyDiff: prevAmt != null ? it.amount - prevAmt : undefined,
      }
    })
  }, [filtered, filteredPrev, currentLevel, hasPrevYear])

  const sorted = useMemo(() => {
    const arr = [...items]
    arr.sort((a, b) => {
      let d = 0
      switch (sortKey) {
        case 'amount': d = a.amount - b.amount; break
        case 'quantity': d = a.quantity - b.quantity; break
        case 'pct': d = a.pct - b.pct; break
        case 'name': d = a.name.localeCompare(b.name, 'ja'); break
        case 'yoyRatio': d = (a.yoyRatio ?? 0) - (b.yoyRatio ?? 0); break
      }
      return sortDir === 'desc' ? -d : d
    })
    return arr
  }, [items, sortKey, sortDir])

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
  const totalYoY = totalPrevAmt > 0 ? totalAmt / totalPrevAmt : null
  const maxAmt = items.length > 0 ? Math.max(...items.map((i) => i.amount)) : 1
  const canDrill = currentLevel !== 'klass'
  const arrow = (k: SortKey) => sortKey === k ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  if (sorted.length === 0) return null

  return (
    <DrillSection>
      <DetailSectionTitle>分類別売上ドリルダウン</DetailSectionTitle>

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
        <SumItem><SumLabel>合計</SumLabel><SumValue>{toComma(totalAmt)}円</SumValue></SumItem>
        <SumItem><SumLabel>数量</SumLabel><SumValue>{totalQty.toLocaleString()}点</SumValue></SumItem>
        {hasPrevYear && totalYoY != null && (
          <SumItem>
            <SumLabel>前年比</SumLabel>
            <SumValue><YoYVal $positive={totalYoY >= 1}>{(totalYoY * 100).toFixed(1)}%</YoYVal></SumValue>
          </SumItem>
        )}
      </SummaryRow>

      <DrillTreemap>
        {items.slice().sort((a, b) => b.amount - a.amount).slice(0, 12).map((it, i) => (
          <TreeBlock key={it.code} $flex={it.amount} $color={COLORS[i % COLORS.length]}
            $canDrill={canDrill} onClick={() => canDrill && handleDrill(it)}
            title={`${it.name}: ${toComma(it.amount)}円 (${it.pct.toFixed(1)}%)`}>
            <TreeLabel>{it.name}</TreeLabel>
            <TreePct>{it.pct.toFixed(1)}%</TreePct>
          </TreeBlock>
        ))}
      </DrillTreemap>

      <div style={{ overflowX: 'auto' }}>
        <DrillTable>
          <thead><tr>
            <DTh>#</DTh>
            <DTh $sortable onClick={() => handleSort('name')}>{levelLabels[currentLevel]}名{arrow('name')}</DTh>
            <DTh $sortable onClick={() => handleSort('amount')}>売上金額{arrow('amount')}</DTh>
            <DTh $sortable onClick={() => handleSort('pct')}>構成比{arrow('pct')}</DTh>
            <DTh $sortable onClick={() => handleSort('quantity')}>数量{arrow('quantity')}</DTh>
            {hasPrevYear && <DTh $sortable onClick={() => handleSort('yoyRatio')}>前年比{arrow('yoyRatio')}</DTh>}
            {canDrill && <DTh />}
          </tr></thead>
          <tbody>
            {sorted.map((it, i) => (
              <DTr key={it.code} $clickable={canDrill} onClick={() => canDrill && handleDrill(it)}>
                <DTd $mono>{i + 1}</DTd>
                <DTdName>{it.name}</DTdName>
                <DTdAmt>
                  <AmtWrap>
                    <AmtTrack><AmtFill $pct={maxAmt > 0 ? (it.amount / maxAmt) * 100 : 0} $color={COLORS[i % COLORS.length]} /></AmtTrack>
                    <AmtVal>{toComma(it.amount)}円</AmtVal>
                  </AmtWrap>
                </DTdAmt>
                <DTd $mono>{it.pct.toFixed(1)}%</DTd>
                <DTd $mono>{it.quantity.toLocaleString()}</DTd>
                {hasPrevYear && (
                  <DTd $mono>
                    {it.yoyRatio != null ? (
                      <YoYVal $positive={it.yoyRatio >= 1}>{(it.yoyRatio * 100).toFixed(1)}%</YoYVal>
                    ) : '-'}
                  </DTd>
                )}
                {canDrill && <DTd><DrillArrow>▸</DrillArrow></DTd>}
              </DTr>
            ))}
          </tbody>
        </DrillTable>
      </div>
    </DrillSection>
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

        {/* Budget vs Actual Bar (当日) */}
        <DetailSection>
          <DetailSectionTitle>予算 vs 実績（当日）</DetailSectionTitle>
          {(() => {
            const maxVal = Math.max(budget, actual, pySales, 1)
            return (
              <DetailBarWrapper>
                <DetailBarRow>
                  <DetailBarLabel>予算</DetailBarLabel>
                  <DetailBarTrack>
                    <DetailBarFill $width={(budget / maxVal) * 100} $color="#6366f1">
                      <DetailBarAmount>{fmtSen(budget)}</DetailBarAmount>
                    </DetailBarFill>
                  </DetailBarTrack>
                </DetailBarRow>
                <DetailBarRow>
                  <DetailBarLabel>実績</DetailBarLabel>
                  <DetailBarTrack>
                    <DetailBarFill $width={(actual / maxVal) * 100} $color={sc.positive}>
                      <DetailBarAmount>{fmtSen(actual)}（{formatPercent(ach)}）</DetailBarAmount>
                    </DetailBarFill>
                  </DetailBarTrack>
                </DetailBarRow>
                {prevYear.hasPrevYear && pySales > 0 && (
                  <DetailBarRow>
                    <DetailBarLabel>前年</DetailBarLabel>
                    <DetailBarTrack>
                      <DetailBarFill $width={(pySales / maxVal) * 100} $color="#9ca3af">
                        <DetailBarAmount>{fmtSen(pySales)}（{formatPercent(pyRatio)}）</DetailBarAmount>
                      </DetailBarFill>
                    </DetailBarTrack>
                  </DetailBarRow>
                )}
              </DetailBarWrapper>
            )
          })()}
        </DetailSection>

        {/* Budget vs Actual Bar (累計) */}
        <DetailSection>
          <DetailSectionTitle>予算 vs 実績（累計）</DetailSectionTitle>
          {(() => {
            const maxVal = Math.max(cumBudget, cumSales, cumPrevYear, 1)
            return (
              <DetailBarWrapper>
                <DetailBarRow>
                  <DetailBarLabel>予算</DetailBarLabel>
                  <DetailBarTrack>
                    <DetailBarFill $width={(cumBudget / maxVal) * 100} $color="#6366f1">
                      <DetailBarAmount>{fmtSen(cumBudget)}</DetailBarAmount>
                    </DetailBarFill>
                  </DetailBarTrack>
                </DetailBarRow>
                <DetailBarRow>
                  <DetailBarLabel>実績</DetailBarLabel>
                  <DetailBarTrack>
                    <DetailBarFill $width={(cumSales / maxVal) * 100} $color={sc.positive}>
                      <DetailBarAmount>{fmtSen(cumSales)}（{formatPercent(cumAch)}）</DetailBarAmount>
                    </DetailBarFill>
                  </DetailBarTrack>
                </DetailBarRow>
                {prevYear.hasPrevYear && cumPrevYear > 0 && (
                  <DetailBarRow>
                    <DetailBarLabel>前年</DetailBarLabel>
                    <DetailBarTrack>
                      <DetailBarFill $width={(cumPrevYear / maxVal) * 100} $color="#9ca3af">
                        <DetailBarAmount>{fmtSen(cumPrevYear)}（{formatPercent(cumPyRatio)}）</DetailBarAmount>
                      </DetailBarFill>
                    </DetailBarTrack>
                  </DetailBarRow>
                )}
              </DetailBarWrapper>
            )
          })()}
        </DetailSection>

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

              const barData = items.map(item => ({
                name: item.label,
                cost: item.cost,
                price: item.price,
              }))

              return (
                <>
                  {barData.length > 0 && (
                    <DetailChartWrapper>
                      <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="100%">
                        <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                          <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${Math.round(v / 10000)}万`} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={60} />
                          <Tooltip formatter={(val, name) => [formatCurrency((val as number) ?? 0), name === 'cost' ? '原価' : '売価']} />
                          <Bar dataKey="cost" fill="#f59e0b" name="cost" barSize={8}>
                            {barData.map((_, i) => <ReCell key={i} fill="#f59e0b" />)}
                          </Bar>
                          <Bar dataKey="price" fill="#6366f1" name="price" barSize={8}>
                            {barData.map((_, i) => <ReCell key={i} fill="#6366f1" />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </DetailChartWrapper>
                  )}
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
          <CategoryDrilldown records={dayRecords} prevRecords={prevDayRecords} />
        )}
      </DetailModalContent>
    </PinModalOverlay>
  )
}
