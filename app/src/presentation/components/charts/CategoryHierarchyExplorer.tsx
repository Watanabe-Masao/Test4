import { useMemo, useState, useCallback, Fragment } from 'react'
import type { CategoryTimeSalesRecord, CategoryTimeSalesIndex, DateRange } from '@/domain/models'
import { toComma, toPct } from './chartTheme'
import { sc } from '@/presentation/theme/semanticColors'
import { findCoreTime, findTurnaroundHour } from './timeSlotUtils'
import {
  useCategoryHierarchy,
  filterByHierarchy,
  type HierarchyFilter,
} from './categoryHierarchyHooks'
import { usePeriodFilter, useHierarchyDropdown } from './periodFilterHooks'
import { PeriodFilterBar, HierarchyDropdowns } from './PeriodFilter'
import { computeDivisor, countDistinctDays, filterByStore } from './periodFilterUtils'
import { queryByDateRange } from '@/application/usecases'
import {
  Wrapper,
  BreadcrumbBar,
  BreadcrumbItem,
  BreadcrumbSep,
  ResetBtn,
  SummaryBar,
  SummaryItem,
  SummaryLabel,
  SummaryValue,
  TreemapWrap,
  TreemapBlock,
  TreemapLabel,
  TreemapPct,
  EmptyFilterMsg,
  TableWrap,
  Table,
  Th,
  Tr,
  Td,
  TdName,
  NameMain,
  NameCode,
  TdAmount,
  AmtWrap,
  AmtTrack,
  AmtFill,
  AmtVal,
  PeakBadge,
  TdSpark,
  DrillBtn,
  DrillCount,
  YoYBadge,
  TabGroup,
  Tab,
  HeaderRow,
  YoYBar,
  AnomalyBadge,
  PiValueBadge,
  ThWithTip,
  TipIcon,
  TipBubble,
} from './CategoryHierarchyExplorer.styles'

/* ── Types ─────────────────────────────────── */

type SortKey =
  | 'amount'
  | 'quantity'
  | 'pct'
  | 'peakHour'
  | 'coreTimeStart'
  | 'turnaroundHour'
  | 'name'
  | 'yoyRatio'
  | 'yoyDiff'
  | 'piValue'
type SortDir = 'asc' | 'desc'

interface HierarchyItem {
  code: string
  name: string
  amount: number
  quantity: number
  pct: number
  peakHour: number
  coreTimeStart: number
  coreTimeEnd: number
  turnaroundHour: number
  hourlyPattern: number[]
  childCount: number
  // YoY fields (only populated when prev year data is available)
  prevAmount?: number
  prevQuantity?: number
  yoyRatio?: number // 前年比 (e.g. 1.05 = +5%)
  yoyDiff?: number // 前年差 (amount - prevAmount)
  yoyQuantityRatio?: number
  // 異常検出: ピーク時間帯の前年比シフト
  prevPeakHour?: number
  peakHourShift?: number // 正=後ろにシフト、負=前にシフト
  hasAnomalyShift?: boolean // |shift| >= 2h
  // PI値: 金額PI = 売上 ÷ 客数 × 1000
  piValue?: number
}

const COLORS = [
  '#6366f1',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#06b6d4',
  '#ec4899',
  '#8b5cf6',
  '#84cc16',
  '#f97316',
  '#14b8a6',
  '#e879f9',
  '#a3e635',
  '#fb923c',
  '#38bdf8',
  '#c084fc',
]

/* ── Sparkline SVG ────────────────────────── */

function Sparkline({ data, color = '#6366f1' }: { data: number[]; color?: string }) {
  const start = data.findIndex((v) => v > 0)
  const end = data.length - 1 - [...data].reverse().findIndex((v) => v > 0)
  if (start < 0 || end < start) return null
  const slice = data.slice(start, end + 1)
  const max = Math.max(...slice)
  if (max === 0) return null
  const w = 120,
    h = 22
  const pts = slice.map((v, i) => {
    const x = slice.length > 1 ? (i / (slice.length - 1)) * w : w / 2
    const y = h - (v / max) * (h - 3) - 1.5
    return `${x},${y}`
  })
  const line = pts.join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polygon points={`0,${h} ${line} ${w},${h}`} fill={color} fillOpacity="0.1" />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* ── Aggregation helper ──────────────────── */

type RawAgg = Map<
  string,
  {
    code: string
    name: string
    amount: number
    quantity: number
    hours: Map<number, number>
    children: Set<string>
  }
>

function aggregateByLevel(
  records: readonly CategoryTimeSalesRecord[],
  level: 'department' | 'line' | 'klass',
): RawAgg {
  const map: RawAgg = new Map()
  for (const rec of records) {
    let key: string, name: string, childKey: string
    if (level === 'department') {
      key = rec.department.code
      name = rec.department.name || key
      childKey = rec.line.code
    } else if (level === 'line') {
      key = rec.line.code
      name = rec.line.name || key
      childKey = rec.klass.code
    } else {
      key = rec.klass.code
      name = rec.klass.name || key
      childKey = ''
    }
    const ex = map.get(key) ?? {
      code: key,
      name,
      amount: 0,
      quantity: 0,
      hours: new Map(),
      children: new Set(),
    }
    ex.amount += rec.totalAmount
    ex.quantity += rec.totalQuantity
    if (childKey) ex.children.add(childKey)
    for (const s of rec.timeSlots) ex.hours.set(s.hour, (ex.hours.get(s.hour) ?? 0) + s.amount)
    map.set(key, ex)
  }
  return map
}

/* ── Main Component ──────────────────────── */

interface Props {
  ctsIndex: CategoryTimeSalesIndex
  prevCtsIndex: CategoryTimeSalesIndex
  selectedStoreIds: ReadonlySet<string>
  daysInMonth: number
  year: number
  month: number
  /** 販売データ存在最大日（スライダーデフォルト値用） */
  dataMaxDay?: number
  /** 来店客数合計（PI値算出用、省略時はPI列非表示） */
  totalCustomers?: number
}

/** 部門→ライン→クラス 階層ドリルダウンエクスプローラー */
export function CategoryHierarchyExplorer({
  ctsIndex,
  prevCtsIndex,
  selectedStoreIds,
  daysInMonth,
  year,
  month,
  dataMaxDay,
  totalCustomers,
}: Props) {
  const { filter, setFilter } = useCategoryHierarchy()
  const [sortKey, setSortKey] = useState<SortKey>('amount')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [showYoY, setShowYoY] = useState(true)
  const pf = usePeriodFilter(daysInMonth, year, month, dataMaxDay)

  const sliderDateRange: DateRange = useMemo(
    () => ({
      from: { year, month, day: pf.dayRange[0] },
      to: { year, month, day: pf.dayRange[1] },
    }),
    [year, month, pf.dayRange],
  )
  const dowFilter = pf.mode === 'dowAvg' && pf.selectedDows.size > 0 ? pf.selectedDows : undefined

  const periodRecords = useMemo(
    () =>
      queryByDateRange(ctsIndex, {
        dateRange: sliderDateRange,
        storeIds: selectedStoreIds,
        dow: dowFilter,
      }),
    [ctsIndex, sliderDateRange, selectedStoreIds, dowFilter],
  )
  const prevPeriodRecords = useMemo(() => {
    if (prevCtsIndex.recordCount === 0) return [] as readonly CategoryTimeSalesRecord[]
    const prevRange: DateRange = {
      from: { year: year - 1, month, day: pf.dayRange[0] },
      to: { year: year - 1, month, day: pf.dayRange[1] },
    }
    let recs = queryByDateRange(prevCtsIndex, { dateRange: prevRange, storeIds: selectedStoreIds })
    if (dowFilter) {
      recs = recs.filter((r) => {
        const dow = new Date(year, month - 1, r.day).getDay()
        return dowFilter.has(dow)
      })
    }
    return recs
  }, [prevCtsIndex, selectedStoreIds, year, month, pf.dayRange, dowFilter])
  const hf = useHierarchyDropdown(periodRecords, selectedStoreIds)

  const hasPrevYear = prevPeriodRecords.length > 0

  const currentLevel = filter.lineCode ? 'klass' : filter.departmentCode ? 'line' : 'department'
  const levelLabels: Record<string, string> = {
    department: '部門',
    line: 'ライン',
    klass: 'クラス',
  }

  const breadcrumb = useMemo(() => {
    const items: { label: string; filter: HierarchyFilter }[] = [
      { label: '全カテゴリ', filter: {} },
    ]
    if (filter.departmentCode) {
      items.push({
        label: filter.departmentName || filter.departmentCode,
        filter: { departmentCode: filter.departmentCode, departmentName: filter.departmentName },
      })
    }
    if (filter.lineCode) {
      items.push({ label: filter.lineName || filter.lineCode, filter: { ...filter } })
    }
    return items
  }, [filter])

  const filteredRecords = useMemo(() => {
    return filterByHierarchy(filterByStore(hf.applyFilter(periodRecords), selectedStoreIds), filter)
  }, [periodRecords, selectedStoreIds, filter, hf])

  const filteredPrevRecords = useMemo(() => {
    if (!hasPrevYear) return []
    return filterByHierarchy(
      filterByStore(hf.applyFilter(prevPeriodRecords), selectedStoreIds),
      filter,
    )
  }, [prevPeriodRecords, selectedStoreIds, filter, hf, hasPrevYear])

  const items = useMemo(() => {
    const map = aggregateByLevel(filteredRecords, currentLevel)

    // Prev year aggregation
    const prevMap = hasPrevYear ? aggregateByLevel(filteredPrevRecords, currentLevel) : null

    // 実データの distinct day から除数を算出（当年・前年で個別にカウント）【TR-DIV-001】【TR-DIV-002】
    const curDiv = computeDivisor(countDistinctDays(filteredRecords), pf.mode)
    const prevDiv = computeDivisor(countDistinctDays(filteredPrevRecords), pf.mode)

    const total = [...map.values()].reduce((s, v) => s + v.amount, 0) / curDiv
    return [...map.values()].map((it): HierarchyItem => {
      const hp = Array.from({ length: 24 }, (_, h) => Math.round((it.hours.get(h) ?? 0) / curDiv))
      const mx = Math.max(...hp)
      const amt = Math.round(it.amount / curDiv)
      const qty = Math.round(it.quantity / curDiv)

      const prev = prevMap?.get(it.code)
      const prevAmt = prev ? Math.round(prev.amount / prevDiv) : undefined
      const prevQty = prev ? Math.round(prev.quantity / prevDiv) : undefined

      // コアタイム & 折り返し時間帯
      const hourMap = new Map<number, number>()
      for (let h = 0; h < 24; h++) {
        if (hp[h] > 0) hourMap.set(h, hp[h])
      }
      const ct = findCoreTime(hourMap)
      const th = findTurnaroundHour(hourMap)

      // 前年のピーク時間帯を計算（異常検出用）
      const curPeakHour = mx > 0 ? hp.indexOf(mx) : -1
      let prevPeakHour: number | undefined
      let peakHourShift: number | undefined
      let hasAnomalyShift = false
      if (prev) {
        const prevHp = Array.from({ length: 24 }, (_, h) =>
          Math.round((prev.hours.get(h) ?? 0) / prevDiv),
        )
        const prevMx = Math.max(...prevHp)
        prevPeakHour = prevMx > 0 ? prevHp.indexOf(prevMx) : undefined
        if (prevPeakHour != null && prevPeakHour >= 0 && curPeakHour >= 0) {
          peakHourShift = curPeakHour - prevPeakHour
          hasAnomalyShift = Math.abs(peakHourShift) >= 2
        }
      }

      // PI値 = カテゴリ売上 ÷ 総客数 × 1000（比率のため除数モードに非依存）
      // 注: カテゴリ売上はCTS由来、客数はclassifiedSales由来（データソースが異なる）
      // curDivで割る前の生集計値(it.amount)を使う。比率計算なので curDiv は分子分母で相殺される。
      const piValue =
        totalCustomers && totalCustomers > 0 ? (it.amount / totalCustomers) * 1000 : undefined

      return {
        code: it.code,
        name: it.name,
        amount: amt,
        quantity: qty,
        pct: total > 0 ? (amt / total) * 100 : 0,
        peakHour: curPeakHour,
        coreTimeStart: ct?.startHour ?? -1,
        coreTimeEnd: ct?.endHour ?? -1,
        turnaroundHour: th ?? -1,
        hourlyPattern: hp,
        childCount: it.children.size,
        prevAmount: prevAmt,
        prevQuantity: prevQty,
        yoyRatio: prevAmt && prevAmt > 0 ? amt / prevAmt : undefined,
        yoyDiff: prevAmt != null ? amt - prevAmt : undefined,
        yoyQuantityRatio: prevQty && prevQty > 0 ? qty / prevQty : undefined,
        prevPeakHour,
        peakHourShift,
        hasAnomalyShift,
        piValue,
      }
    })
  }, [filteredRecords, filteredPrevRecords, currentLevel, pf, hasPrevYear, totalCustomers])

  const sortedItems = useMemo(() => {
    const arr = [...items]
    arr.sort((a, b) => {
      let d = 0
      switch (sortKey) {
        case 'amount':
          d = a.amount - b.amount
          break
        case 'quantity':
          d = a.quantity - b.quantity
          break
        case 'pct':
          d = a.pct - b.pct
          break
        case 'peakHour':
          d = a.peakHour - b.peakHour
          break
        case 'coreTimeStart':
          d = a.coreTimeStart - b.coreTimeStart
          break
        case 'turnaroundHour':
          d = a.turnaroundHour - b.turnaroundHour
          break
        case 'name':
          d = a.name.localeCompare(b.name, 'ja')
          break
        case 'yoyRatio':
          d = (a.yoyRatio ?? 0) - (b.yoyRatio ?? 0)
          break
        case 'yoyDiff':
          d = (a.yoyDiff ?? 0) - (b.yoyDiff ?? 0)
          break
        case 'piValue':
          d = (a.piValue ?? 0) - (b.piValue ?? 0)
          break
      }
      return sortDir === 'desc' ? -d : d
    })
    return arr
  }, [items, sortKey, sortDir])

  const handleDrill = useCallback(
    (it: HierarchyItem) => {
      if (currentLevel === 'department')
        setFilter({ departmentCode: it.code, departmentName: it.name })
      else if (currentLevel === 'line')
        setFilter({ ...filter, lineCode: it.code, lineName: it.name })
    },
    [currentLevel, filter, setFilter],
  )

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
      else {
        setSortKey(key)
        setSortDir('desc')
      }
    },
    [sortKey],
  )

  const totalAmt = items.reduce((s, i) => s + i.amount, 0)
  const totalQty = items.reduce((s, i) => s + i.quantity, 0)
  const totalPrevAmt = items.reduce((s, i) => s + (i.prevAmount ?? 0), 0)
  const totalYoYRatio = totalPrevAmt > 0 ? totalAmt / totalPrevAmt : null
  const maxAmt = items.length > 0 ? Math.max(...items.map((i) => i.amount)) : 1
  const showPi = totalCustomers != null && totalCustomers > 0
  const piItems = items.filter((i) => i.piValue != null)
  const avgPi =
    piItems.length > 0 ? piItems.reduce((s, i) => s + i.piValue!, 0) / piItems.length : 0
  const canDrill = currentLevel !== 'klass'
  const arrow = (k: SortKey) => (sortKey === k ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '')
  const showYoYCols = hasPrevYear && showYoY

  if (sortedItems.length === 0)
    return (
      <Wrapper>
        <EmptyFilterMsg>選択した絞り込み条件に該当するデータがありません</EmptyFilterMsg>
        <PeriodFilterBar pf={pf} daysInMonth={daysInMonth} />
        <HierarchyDropdowns hf={hf} />
      </Wrapper>
    )

  return (
    <Wrapper>
      <HeaderRow>
        <BreadcrumbBar style={{ marginBottom: 0 }}>
          {breadcrumb.map((bc, i) => (
            <Fragment key={i}>
              {i > 0 && <BreadcrumbSep>▸</BreadcrumbSep>}
              <BreadcrumbItem
                $active={i === breadcrumb.length - 1}
                onClick={() => setFilter(bc.filter)}
              >
                {bc.label}
              </BreadcrumbItem>
            </Fragment>
          ))}
          {filter.departmentCode && <ResetBtn onClick={() => setFilter({})}>リセット</ResetBtn>}
        </BreadcrumbBar>
        {hasPrevYear && (
          <TabGroup>
            <Tab $active={showYoY} onClick={() => setShowYoY(!showYoY)}>
              前年比較
            </Tab>
          </TabGroup>
        )}
      </HeaderRow>
      <SummaryBar>
        <SummaryItem>
          <SummaryLabel>{levelLabels[currentLevel]}数</SummaryLabel>
          <SummaryValue>{items.length}</SummaryValue>
        </SummaryItem>
        <SummaryItem>
          <SummaryLabel>合計金額</SummaryLabel>
          <SummaryValue>{Math.round(totalAmt / 10000).toLocaleString()}万円</SummaryValue>
        </SummaryItem>
        <SummaryItem>
          <SummaryLabel>合計数量</SummaryLabel>
          <SummaryValue>{totalQty.toLocaleString()}点</SummaryValue>
        </SummaryItem>
        {showYoYCols && totalYoYRatio != null && (
          <SummaryItem>
            <SummaryLabel>前年比</SummaryLabel>
            <SummaryValue>
              <YoYBadge $positive={totalYoYRatio >= 1}>
                {totalYoYRatio >= 1 ? '+' : ''}
                {toPct(totalYoYRatio - 1)}
              </YoYBadge>
            </SummaryValue>
          </SummaryItem>
        )}
        {showYoYCols && totalPrevAmt > 0 && (
          <SummaryItem>
            <SummaryLabel>前年合計</SummaryLabel>
            <SummaryValue style={{ opacity: 0.7 }}>
              {Math.round(totalPrevAmt / 10000).toLocaleString()}万円
            </SummaryValue>
          </SummaryItem>
        )}
      </SummaryBar>

      <TreemapWrap>
        {items
          .slice()
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 15)
          .map((it, i) => (
            <TreemapBlock
              key={it.code}
              $flex={it.amount}
              $color={COLORS[i % COLORS.length]}
              $canDrill={canDrill}
              onClick={() => canDrill && handleDrill(it)}
              title={`${it.name}: ${toComma(it.amount)}円 (${it.pct.toFixed(1)}%)${it.yoyRatio != null ? ` 前年比${toPct(it.yoyRatio)}` : ''}`}
            >
              <TreemapLabel>{it.name}</TreemapLabel>
              <TreemapPct>
                {it.pct.toFixed(1)}%
                {showYoYCols && it.yoyRatio != null && (
                  <span style={{ marginLeft: 3, color: it.yoyRatio >= 1 ? '#bbf7d0' : '#fecaca' }}>
                    {it.yoyRatio >= 1 ? '↑' : '↓'}
                  </span>
                )}
              </TreemapPct>
            </TreemapBlock>
          ))}
      </TreemapWrap>

      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th>#</Th>
              <Th $sortable onClick={() => handleSort('name')}>
                {levelLabels[currentLevel]}名{arrow('name')}
              </Th>
              <Th $sortable onClick={() => handleSort('amount')}>
                売上金額{arrow('amount')}
              </Th>
              <ThWithTip $sortable onClick={() => handleSort('pct')}>
                構成比{arrow('pct')}
                <TipIcon>?</TipIcon>
                <TipBubble>
                  当該カテゴリの売上 ÷ 全体売上 × 100。全体に占める割合を示します。
                </TipBubble>
              </ThWithTip>
              <Th $sortable onClick={() => handleSort('quantity')}>
                数量{arrow('quantity')}
              </Th>
              {showPi && (
                <ThWithTip $sortable onClick={() => handleSort('piValue')}>
                  PI値{arrow('piValue')}
                  <TipIcon>?</TipIcon>
                  <TipBubble>
                    金額PI = カテゴリ売上 ÷ 総客数 ×
                    1000。来店客1000人あたりのカテゴリ売上金額。客数はclassifiedSales由来の全期間合計。
                  </TipBubble>
                </ThWithTip>
              )}
              {showYoYCols && (
                <ThWithTip $sortable onClick={() => handleSort('yoyRatio')}>
                  前年比{arrow('yoyRatio')}
                  <TipIcon>?</TipIcon>
                  <TipBubble>
                    当年売上 ÷ 前年売上 × 100。100%超で前年を上回っていることを示します。
                  </TipBubble>
                </ThWithTip>
              )}
              {showYoYCols && (
                <ThWithTip $sortable onClick={() => handleSort('yoyDiff')}>
                  前年差{arrow('yoyDiff')}
                  <TipIcon>?</TipIcon>
                  <TipBubble>当年売上 − 前年売上。前年からの売上増減額を示します。</TipBubble>
                </ThWithTip>
              )}
              <ThWithTip $sortable onClick={() => handleSort('peakHour')}>
                ピーク{arrow('peakHour')}
                <TipIcon>?</TipIcon>
                <TipBubble>
                  最も販売実績が多い単一時間帯（1時間単位）。売上のピークタイムを示します。
                </TipBubble>
              </ThWithTip>
              <ThWithTip $sortable onClick={() => handleSort('coreTimeStart')}>
                コア{arrow('coreTimeStart')}
                <TipIcon>?</TipIcon>
                <TipBubble>
                  連続する3時間の売上合計が最大となる時間帯。主要な販売時間帯を示します。
                </TipBubble>
              </ThWithTip>
              <ThWithTip $sortable onClick={() => handleSort('turnaroundHour')}>
                折返{arrow('turnaroundHour')}
                <TipIcon>?</TipIcon>
                <TipBubble>
                  累積売上が1日の50%に到達する時間帯。この時点で売上の半分が達成されています。
                </TipBubble>
              </ThWithTip>
              <Th>時間帯パターン</Th>
              {canDrill && <Th />}
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((it, i) => (
              <Tr key={it.code} $clickable={canDrill} onClick={() => canDrill && handleDrill(it)}>
                <Td $mono>{i + 1}</Td>
                <TdName>
                  <NameMain>{it.name}</NameMain>
                  <NameCode>{it.code}</NameCode>
                </TdName>
                <TdAmount>
                  <AmtWrap>
                    <AmtTrack>
                      <AmtFill
                        $pct={maxAmt > 0 ? (it.amount / maxAmt) * 100 : 0}
                        $color={COLORS[i % COLORS.length]}
                      />
                    </AmtTrack>
                    <AmtVal>{toComma(it.amount)}円</AmtVal>
                  </AmtWrap>
                </TdAmount>
                <Td $mono>{it.pct.toFixed(1)}%</Td>
                <Td $mono>{it.quantity.toLocaleString()}</Td>
                {showPi && (
                  <Td $mono>
                    {it.piValue != null ? (
                      <PiValueBadge $below={it.piValue < avgPi * 0.5}>
                        {it.piValue.toFixed(0)}
                      </PiValueBadge>
                    ) : (
                      '-'
                    )}
                  </Td>
                )}
                {showYoYCols && (
                  <Td $mono>
                    {it.yoyRatio != null ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <YoYBadge $positive={it.yoyRatio >= 1}>{toPct(it.yoyRatio)}</YoYBadge>
                        <YoYBar
                          $pct={Math.abs((it.yoyRatio - 1) * 100) * 2}
                          $positive={it.yoyRatio >= 1}
                        />
                      </div>
                    ) : (
                      '-'
                    )}
                  </Td>
                )}
                {showYoYCols && (
                  <Td $mono>
                    {it.yoyDiff != null ? (
                      <span style={{ color: sc.cond(it.yoyDiff >= 0) }}>
                        {it.yoyDiff >= 0 ? '+' : ''}
                        {toComma(it.yoyDiff)}円
                      </span>
                    ) : (
                      '-'
                    )}
                  </Td>
                )}
                <Td $mono>
                  {it.peakHour >= 0 ? (
                    <>
                      <PeakBadge>{it.peakHour}時</PeakBadge>
                      {it.hasAnomalyShift && (
                        <AnomalyBadge
                          title={`ピーク時間が${it.prevPeakHour}時→${it.peakHour}時にシフト`}
                        >
                          ⚠{it.peakHourShift! > 0 ? '+' : ''}
                          {it.peakHourShift}h
                        </AnomalyBadge>
                      )}
                    </>
                  ) : (
                    '-'
                  )}
                </Td>
                <Td $mono>
                  {it.coreTimeStart >= 0 ? (
                    <PeakBadge>
                      {it.coreTimeStart}〜{it.coreTimeEnd}時
                    </PeakBadge>
                  ) : (
                    '-'
                  )}
                </Td>
                <Td $mono>
                  {it.turnaroundHour >= 0 ? <PeakBadge>{it.turnaroundHour}時</PeakBadge> : '-'}
                </Td>
                <TdSpark>
                  <Sparkline data={it.hourlyPattern} color={COLORS[i % COLORS.length]} />
                </TdSpark>
                {canDrill && (
                  <Td>
                    <DrillBtn>
                      ▸{it.childCount > 0 && <DrillCount>{it.childCount}</DrillCount>}
                    </DrillBtn>
                  </Td>
                )}
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
      <PeriodFilterBar pf={pf} daysInMonth={daysInMonth} />
      <HierarchyDropdowns hf={hf} />
    </Wrapper>
  )
}
