import { useMemo, useState, useCallback, Fragment } from 'react'
import styled from 'styled-components'
import type { CategoryTimeSalesData } from '@/domain/models'
import { toComma } from './chartTheme'
import {
  useCategoryHierarchy,
  filterByHierarchy,
  type HierarchyFilter,
} from './CategoryHierarchyContext'
import { usePeriodFilter, PeriodFilterBar } from './PeriodFilter'

/* ── Types ─────────────────────────────────── */

type SortKey = 'amount' | 'quantity' | 'pct' | 'peakHour' | 'name'
type SortDir = 'asc' | 'desc'

interface HierarchyItem {
  code: string
  name: string
  amount: number
  quantity: number
  pct: number
  peakHour: number
  hourlyPattern: number[]
  childCount: number
}

const COLORS = [
  '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899',
  '#8b5cf6', '#84cc16', '#f97316', '#14b8a6', '#e879f9', '#a3e635',
  '#fb923c', '#38bdf8', '#c084fc',
]

/* ── Styled ────────────────────────────────── */

const Wrapper = styled.div`
  width: 100%;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[5]};
  overflow: hidden;
`
const BreadcrumbBar = styled.div`
  display: flex; align-items: center; gap: 4px;
  margin-bottom: ${({ theme }) => theme.spacing[4]}; flex-wrap: wrap;
`
const BreadcrumbItem = styled.button<{ $active: boolean }>`
  all: unset; cursor: pointer; font-size: 0.72rem;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  color: ${({ $active, theme }) => $active ? theme.colors.text : theme.colors.palette.primary};
  padding: 2px 6px; border-radius: ${({ theme }) => theme.radii.sm};
  &:hover { background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}; }
`
const BreadcrumbSep = styled.span`
  font-size: 0.6rem; color: ${({ theme }) => theme.colors.text4}; user-select: none;
`
const ResetBtn = styled.button`
  all: unset; cursor: pointer; font-size: 0.6rem; margin-left: auto;
  padding: 2px 8px; border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.colors.text3};
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  &:hover { opacity: 0.7; }
`
const SummaryBar = styled.div`
  display: flex; gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[4]}; flex-wrap: wrap;
`
const SummaryItem = styled.div`display: flex; align-items: baseline; gap: 6px;`
const SummaryLabel = styled.span`font-size: 0.6rem; color: ${({ theme }) => theme.colors.text4};`
const SummaryValue = styled.span`
  font-size: 0.8rem; font-weight: 600; color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`
const TreemapWrap = styled.div`
  display: flex; gap: 2px; height: 64px;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  border-radius: ${({ theme }) => theme.radii.md}; overflow: hidden;
`
const TreemapBlock = styled.div<{ $flex: number; $color: string; $canDrill: boolean }>`
  flex: ${({ $flex }) => Math.max($flex, 0.01)}; min-width: 0;
  background: ${({ $color }) => $color}; opacity: 0.8;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 2px 4px; cursor: ${({ $canDrill }) => ($canDrill ? 'pointer' : 'default')};
  transition: opacity 0.15s; overflow: hidden;
  &:hover { opacity: 1; }
`
const TreemapLabel = styled.div`
  font-size: 0.55rem; color: #fff; font-weight: 600;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
`
const TreemapPct = styled.div`font-size: 0.5rem; color: rgba(255,255,255,0.85); font-family: monospace;`

const TableWrap = styled.div`overflow-x: auto;`
const Table = styled.table`width: 100%; border-collapse: collapse; font-size: 0.65rem;`
const Th = styled.th<{ $sortable?: boolean }>`
  text-align: left; padding: 6px 8px; font-size: 0.6rem; font-weight: 600;
  color: ${({ theme }) => theme.colors.text3};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap; cursor: ${({ $sortable }) => ($sortable ? 'pointer' : 'default')};
  user-select: none;
  &:hover { color: ${({ $sortable, theme }) => ($sortable ? theme.colors.text : undefined)}; }
`
const Tr = styled.tr<{ $clickable: boolean }>`
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  transition: background 0.1s;
  &:hover { background: ${({ $clickable, theme }) =>
    $clickable ? (theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)') : 'none'}; }
`
const Td = styled.td<{ $mono?: boolean }>`
  padding: 5px 8px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text2};
  font-family: ${({ $mono, theme }) => $mono ? theme.typography.fontFamily.mono : theme.typography.fontFamily.primary};
  white-space: nowrap;
`
const TdName = styled(Td)`max-width: 160px;`
const NameMain = styled.div`
  font-weight: 500; color: ${({ theme }) => theme.colors.text};
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
`
const NameCode = styled.div`
  font-size: 0.52rem; color: ${({ theme }) => theme.colors.text4};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`
const TdAmount = styled(Td)`min-width: 160px;`
const AmtWrap = styled.div`display: flex; align-items: center; gap: 6px;`
const AmtTrack = styled.div`
  flex: 1; height: 6px; border-radius: 3px; overflow: hidden;
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
`
const AmtFill = styled.div<{ $pct: number; $color: string }>`
  width: ${({ $pct }) => Math.min($pct, 100)}%; height: 100%;
  background: ${({ $color }) => $color}; border-radius: 3px; opacity: 0.75;
`
const AmtVal = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 0.62rem; color: ${({ theme }) => theme.colors.text2};
  min-width: 70px; text-align: right;
`
const PeakBadge = styled.span`
  display: inline-block; padding: 1px 5px; border-radius: 4px;
  font-size: 0.58rem; font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)'};
  color: ${({ theme }) => theme.colors.palette.primary};
`
const TdSpark = styled(Td)`min-width: 130px; padding: 3px 8px;`
const DrillBtn = styled.span`
  display: inline-flex; align-items: center; gap: 2px;
  color: ${({ theme }) => theme.colors.palette.primary}; font-size: 0.7rem; font-weight: 600;
`
const DrillCount = styled.span`
  font-size: 0.5rem; color: ${({ theme }) => theme.colors.text4};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

/* ── Sparkline SVG ────────────────────────── */

function Sparkline({ data, color = '#6366f1' }: { data: number[]; color?: string }) {
  const start = data.findIndex((v) => v > 0)
  const end = data.length - 1 - [...data].reverse().findIndex((v) => v > 0)
  if (start < 0 || end < start) return null
  const slice = data.slice(start, end + 1)
  const max = Math.max(...slice)
  if (max === 0) return null
  const w = 120, h = 22
  const pts = slice.map((v, i) => {
    const x = slice.length > 1 ? (i / (slice.length - 1)) * w : w / 2
    const y = h - (v / max) * (h - 3) - 1.5
    return `${x},${y}`
  })
  const line = pts.join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polygon points={`0,${h} ${line} ${w},${h}`} fill={color} fillOpacity="0.1" />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ── Main Component ──────────────────────── */

interface Props {
  categoryTimeSales: CategoryTimeSalesData
  selectedStoreIds: ReadonlySet<string>
  daysInMonth: number
  year: number
  month: number
}

/** 部門→ライン→クラス 階層ドリルダウンエクスプローラー */
export function CategoryHierarchyExplorer({ categoryTimeSales, selectedStoreIds, daysInMonth, year, month }: Props) {
  const { filter, setFilter } = useCategoryHierarchy()
  const [sortKey, setSortKey] = useState<SortKey>('amount')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const pf = usePeriodFilter(daysInMonth, year, month)

  const currentLevel = filter.lineCode ? 'klass' : filter.departmentCode ? 'line' : 'department'
  const levelLabels: Record<string, string> = { department: '部門', line: 'ライン', klass: 'クラス' }

  const breadcrumb = useMemo(() => {
    const items: { label: string; filter: HierarchyFilter }[] = [{ label: '全カテゴリ', filter: {} }]
    if (filter.departmentCode) {
      items.push({ label: filter.departmentName || filter.departmentCode,
        filter: { departmentCode: filter.departmentCode, departmentName: filter.departmentName } })
    }
    if (filter.lineCode) {
      items.push({ label: filter.lineName || filter.lineCode, filter: { ...filter } })
    }
    return items
  }, [filter])

  const filteredRecords = useMemo(() => {
    let recs = pf.filterRecords(categoryTimeSales.records)
    if (selectedStoreIds.size > 0) recs = recs.filter((r) => selectedStoreIds.has(r.storeId))
    return filterByHierarchy(recs, filter)
  }, [categoryTimeSales, selectedStoreIds, filter, pf])

  const items = useMemo(() => {
    const map = new Map<string, {
      code: string; name: string; amount: number; quantity: number
      hours: Map<number, number>; children: Set<string>
    }>()
    for (const rec of filteredRecords) {
      let key: string, name: string, childKey: string
      if (currentLevel === 'department') {
        key = rec.department.code; name = rec.department.name || key; childKey = rec.line.code
      } else if (currentLevel === 'line') {
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
    const div = pf.mode !== 'total' ? pf.divisor : 1
    const total = [...map.values()].reduce((s, v) => s + v.amount, 0) / div
    return [...map.values()].map((it): HierarchyItem => {
      const hp = Array.from({ length: 24 }, (_, h) => Math.round((it.hours.get(h) ?? 0) / div))
      const mx = Math.max(...hp)
      const amt = Math.round(it.amount / div)
      const qty = Math.round(it.quantity / div)
      return { code: it.code, name: it.name, amount: amt, quantity: qty,
        pct: total > 0 ? (amt / total) * 100 : 0,
        peakHour: mx > 0 ? hp.indexOf(mx) : -1, hourlyPattern: hp, childCount: it.children.size }
    })
  }, [filteredRecords, currentLevel, pf])

  const sortedItems = useMemo(() => {
    const arr = [...items]
    arr.sort((a, b) => {
      let d = 0
      switch (sortKey) {
        case 'amount': d = a.amount - b.amount; break
        case 'quantity': d = a.quantity - b.quantity; break
        case 'pct': d = a.pct - b.pct; break
        case 'peakHour': d = a.peakHour - b.peakHour; break
        case 'name': d = a.name.localeCompare(b.name, 'ja'); break
      }
      return sortDir === 'desc' ? -d : d
    })
    return arr
  }, [items, sortKey, sortDir])

  const handleDrill = useCallback((it: HierarchyItem) => {
    if (currentLevel === 'department') setFilter({ departmentCode: it.code, departmentName: it.name })
    else if (currentLevel === 'line') setFilter({ ...filter, lineCode: it.code, lineName: it.name })
  }, [currentLevel, filter, setFilter])

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) setSortDir((d) => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
  }, [sortKey])

  const totalAmt = items.reduce((s, i) => s + i.amount, 0)
  const totalQty = items.reduce((s, i) => s + i.quantity, 0)
  const maxAmt = items.length > 0 ? Math.max(...items.map((i) => i.amount)) : 1
  const canDrill = currentLevel !== 'klass'
  const arrow = (k: SortKey) => sortKey === k ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  if (sortedItems.length === 0) return null

  return (
    <Wrapper>
      <BreadcrumbBar>
        {breadcrumb.map((bc, i) => (
          <Fragment key={i}>
            {i > 0 && <BreadcrumbSep>▸</BreadcrumbSep>}
            <BreadcrumbItem $active={i === breadcrumb.length - 1}
              onClick={() => setFilter(bc.filter)}>{bc.label}</BreadcrumbItem>
          </Fragment>
        ))}
        {filter.departmentCode && <ResetBtn onClick={() => setFilter({})}>リセット</ResetBtn>}
      </BreadcrumbBar>
      <PeriodFilterBar pf={pf} daysInMonth={daysInMonth} />

      <SummaryBar>
        <SummaryItem><SummaryLabel>{levelLabels[currentLevel]}数</SummaryLabel><SummaryValue>{items.length}</SummaryValue></SummaryItem>
        <SummaryItem><SummaryLabel>合計金額</SummaryLabel><SummaryValue>{Math.round(totalAmt / 10000).toLocaleString()}万円</SummaryValue></SummaryItem>
        <SummaryItem><SummaryLabel>合計数量</SummaryLabel><SummaryValue>{totalQty.toLocaleString()}点</SummaryValue></SummaryItem>
      </SummaryBar>

      <TreemapWrap>
        {items.slice().sort((a, b) => b.amount - a.amount).slice(0, 15).map((it, i) => (
          <TreemapBlock key={it.code} $flex={it.amount} $color={COLORS[i % COLORS.length]}
            $canDrill={canDrill} onClick={() => canDrill && handleDrill(it)}
            title={`${it.name}: ${toComma(it.amount)}円 (${it.pct.toFixed(1)}%)`}>
            <TreemapLabel>{it.name}</TreemapLabel>
            <TreemapPct>{it.pct.toFixed(1)}%</TreemapPct>
          </TreemapBlock>
        ))}
      </TreemapWrap>

      <TableWrap>
        <Table>
          <thead><tr>
            <Th>#</Th>
            <Th $sortable onClick={() => handleSort('name')}>{levelLabels[currentLevel]}名{arrow('name')}</Th>
            <Th $sortable onClick={() => handleSort('amount')}>売上金額{arrow('amount')}</Th>
            <Th $sortable onClick={() => handleSort('pct')}>構成比{arrow('pct')}</Th>
            <Th $sortable onClick={() => handleSort('quantity')}>数量{arrow('quantity')}</Th>
            <Th $sortable onClick={() => handleSort('peakHour')}>ピーク{arrow('peakHour')}</Th>
            <Th>時間帯パターン</Th>
            {canDrill && <Th />}
          </tr></thead>
          <tbody>
            {sortedItems.map((it, i) => (
              <Tr key={it.code} $clickable={canDrill} onClick={() => canDrill && handleDrill(it)}>
                <Td $mono>{i + 1}</Td>
                <TdName><NameMain>{it.name}</NameMain><NameCode>{it.code}</NameCode></TdName>
                <TdAmount>
                  <AmtWrap>
                    <AmtTrack><AmtFill $pct={maxAmt > 0 ? (it.amount / maxAmt) * 100 : 0} $color={COLORS[i % COLORS.length]} /></AmtTrack>
                    <AmtVal>{toComma(it.amount)}円</AmtVal>
                  </AmtWrap>
                </TdAmount>
                <Td $mono>{it.pct.toFixed(1)}%</Td>
                <Td $mono>{it.quantity.toLocaleString()}</Td>
                <Td $mono>{it.peakHour >= 0 ? <PeakBadge>{it.peakHour}時</PeakBadge> : '-'}</Td>
                <TdSpark><Sparkline data={it.hourlyPattern} color={COLORS[i % COLORS.length]} /></TdSpark>
                {canDrill && <Td><DrillBtn>▸{it.childCount > 0 && <DrillCount>{it.childCount}</DrillCount>}</DrillBtn></Td>}
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
    </Wrapper>
  )
}
