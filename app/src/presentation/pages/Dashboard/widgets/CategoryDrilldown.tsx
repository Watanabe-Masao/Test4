/**
 * カテゴリ別売上ドリルダウン（CategoryDrilldown）
 *
 * DayDetailModal の「売上分析」タブで表示する
 * 分類別ドリルダウンテーブル・ツリーマップ・積み上げバーチャートを提供する。
 *
 * 前年・前週の比較データは切り替えではなく同時表示する。
 * 累計セクションは前年のみ（前週比は特性が異なるため不要）。
 */
import { useState, useMemo, useCallback, Fragment } from 'react'
import { createPortal } from 'react-dom'
import type { CategoryTimeSalesRecord } from '@/domain/models'
import type { HierarchyFilter } from '@/presentation/components/charts/CategoryHierarchyContext'
import { filterByHierarchy, getHierarchyLevel } from '@/presentation/components/charts/CategoryHierarchyContext'
import { toComma } from '@/presentation/components/charts/chartTheme'
import { formatPercent } from '@/domain/calculations/utils'
import { DetailSectionTitle } from '../DashboardPage.styles'
import {
  aggregateForDrill, buildDrillItems, fmtSen, COLORS,
  type DrillItem, type MetricKey, type CompareMode, type SortKey, type SortDir,
} from './drilldownUtils'
import {
  DrillSection, DrillBreadcrumb, BcItem, BcSep, BcReset,
  DrillTreemap, TreeBlock, TreeLabel, TreePct,
  DrillTable, DTh, DTr, DTd, DTdName, DTdAmt,
  AmtWrap, AmtTrack, AmtFill, AmtVal, DrillArrow, YoYVal,
  SummaryRow, SumItem, SumLabel, SumValue,
  ToggleBar, ToggleGroup, ToggleBtn, ToggleLabel,
  StackedBarSection, StackBarTitle, StackRow, StackLabel, StackTrack,
  StackSegment, SegLabel, StackTotal, ActiveBadge,
  LegendRow, LegendItem, LegendDot, SegmentTooltip,
} from './DayDetailModal.styles'

export function CategoryDrilldown({
  records, prevRecords, budget,
  cumRecords, cumPrevRecords, cumBudget,
  actual, ach, pySales, hasPrevYearSales,
  cumSales, cumAch, cumPrevYear,
  year, month, day,
  wowRecords, wowPrevSales, canWoW,
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
  wowRecords?: readonly CategoryTimeSalesRecord[]
  wowPrevSales?: number
  canWoW?: boolean
}) {
  const [filter, setFilter] = useState<HierarchyFilter>({})
  const [sortKey, setSortKey] = useState<SortKey>('amount')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [metric, setMetric] = useState<MetricKey>('amount')
  const [compare, setCompare] = useState<CompareMode>('daily')
  const [hoveredSeg, setHoveredSeg] = useState<string | null>(null)
  const [segTooltip, setSegTooltip] = useState<{ x: number; y: number; content: React.ReactNode } | null>(null)
  const [drillSourceRow, setDrillSourceRow] = useState<'actual' | 'prev' | 'wow'>('actual')

  const currentLevel = getHierarchyLevel(filter)
  const levelLabels: Record<string, string> = { department: '部門', line: 'ライン', klass: 'クラス' }
  const hasPrevYear = prevRecords.length > 0 || cumPrevRecords.length > 0 || hasPrevYearSales
  const hasWoW = canWoW === true && ((wowRecords ?? []).length > 0 || (wowPrevSales ?? 0) > 0)
  // 累計モードでは WoW データソースを実績にフォールバック
  const effectiveSource = (drillSourceRow === 'wow' && (compare === 'cumulative' || !hasWoW))
    ? 'actual' as const
    : drillSourceRow

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

  const dayFiltered = useMemo(() => filterByHierarchy(records, filter), [records, filter])
  const dayFilteredYoYPrev = useMemo(
    () => hasPrevYear ? filterByHierarchy(prevRecords, filter) : [],
    [hasPrevYear, prevRecords, filter],
  )
  const dayFilteredWoWPrev = useMemo(
    () => hasWoW ? filterByHierarchy(wowRecords ?? [], filter) : [],
    [hasWoW, wowRecords, filter],
  )
  const cumFiltered = useMemo(() => filterByHierarchy(cumRecords, filter), [cumRecords, filter])
  const cumFilteredYoYPrev = useMemo(
    () => hasPrevYear ? filterByHierarchy(cumPrevRecords, filter) : [],
    [hasPrevYear, cumPrevRecords, filter],
  )

  const levelColorMap = useMemo(() => {
    const map = new Map<string, string>()
    if (currentLevel === 'department') {
      const base = cumRecords.length > 0 ? cumRecords : records
      const deptMap = aggregateForDrill(base, 'department')
      const sorted = [...deptMap.values()].sort((a, b) => b.amount - a.amount)
      sorted.forEach((d, i) => map.set(d.code, COLORS[i % COLORS.length]))
    } else {
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

  // YoY items
  const dayItemsYoY = useMemo(
    () => buildDrillItems(dayFiltered, dayFilteredYoYPrev, currentLevel, metric, levelColorMap, hasPrevYear),
    [dayFiltered, dayFilteredYoYPrev, currentLevel, metric, levelColorMap, hasPrevYear],
  )
  const cumItemsYoY = useMemo(
    () => buildDrillItems(cumFiltered, cumFilteredYoYPrev, currentLevel, metric, levelColorMap, hasPrevYear),
    [cumFiltered, cumFilteredYoYPrev, currentLevel, metric, levelColorMap, hasPrevYear],
  )
  // WoW items（当日のみ、累計は対象外）
  const dayItemsWoW = useMemo(
    () => hasWoW ? buildDrillItems(dayFiltered, dayFilteredWoWPrev, currentLevel, metric, levelColorMap, true) : [],
    [dayFiltered, dayFilteredWoWPrev, currentLevel, metric, levelColorMap, hasWoW],
  )
  const wowItemMap = useMemo(() => {
    const map = new Map<string, DrillItem>()
    for (const it of dayItemsWoW) map.set(it.code, it)
    return map
  }, [dayItemsWoW])

  // テーブル・ツリーマップ用のアクティブ items
  const items = (() => {
    if (compare === 'cumulative') return cumItemsYoY
    if (effectiveSource === 'wow') return dayItemsWoW
    return dayItemsYoY
  })()

  const isPrevSource = effectiveSource !== 'actual'
  const primaryAmt = useCallback((it: DrillItem) =>
    isPrevSource ? (it.prevAmount ?? 0) : it.amount, [isPrevSource])
  const primaryQty = useCallback((it: DrillItem) =>
    isPrevSource ? (it.prevQuantity ?? 0) : it.quantity, [isPrevSource])

  const sorted = useMemo(() => {
    const arr = [...items]
    arr.sort((a, b) => {
      let d = 0
      switch (sortKey) {
        case 'amount': d = (metric === 'amount' ? primaryAmt(a) - primaryAmt(b) : primaryQty(a) - primaryQty(b)); break
        case 'quantity': d = primaryQty(a) - primaryQty(b); break
        case 'pct': d = a.pct - b.pct; break
        case 'name': d = a.name.localeCompare(b.name, 'ja'); break
        case 'yoyRatio': d = (a.yoyRatio ?? 0) - (b.yoyRatio ?? 0); break
      }
      return sortDir === 'desc' ? -d : d
    })
    return arr
  }, [items, sortKey, sortDir, metric, primaryAmt, primaryQty])

  const handleDrill = useCallback((it: DrillItem) => {
    if (currentLevel === 'department') setFilter({ departmentCode: it.code, departmentName: it.name })
    else if (currentLevel === 'line') setFilter((prev) => ({ ...prev, lineCode: it.code, lineName: it.name }))
  }, [currentLevel])

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) setSortDir((d) => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
  }, [sortKey])

  const handleRowSelect = useCallback((period: CompareMode, row: 'actual' | 'prev' | 'wow') => {
    setCompare(period)
    setDrillSourceRow(row)
  }, [])

  const totalAmt = items.reduce((s, i) => s + i.amount, 0)
  const totalQty = items.reduce((s, i) => s + i.quantity, 0)
  const totalPrevAmt = items.reduce((s, i) => s + (i.prevAmount ?? 0), 0)
  const totalPrevQty = items.reduce((s, i) => s + (i.prevQuantity ?? 0), 0)
  const displayPrimaryAmt = isPrevSource ? totalPrevAmt : totalAmt
  const displayPrimaryQty = isPrevSource ? totalPrevQty : totalQty
  const maxVal = items.length > 0
    ? Math.max(...items.map((i) => metric === 'amount' ? primaryAmt(i) : primaryQty(i)))
    : 1
  const canDrill = currentLevel !== 'klass'
  const arrow = (k: SortKey) => sortKey === k ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  const isAmountMode = metric === 'amount'
  // 売上金額モードかつ実績/前年データソースの場合、Excel由来の actual/cumSales にアンカーする。
  // CSV(categoryTimeSales) 合計は Excel(sales) と一致する保証がないため、
  // 禁止事項2「引数を無視して別ソースから再計算してはならない」に従う。
  const anchoredActual = compare === 'daily' ? actual : cumSales
  const anchoredPrev = compare === 'daily' ? pySales : cumPrevYear
  const displayTotal = isAmountMode
    ? (effectiveSource === 'actual' ? anchoredActual
      : effectiveSource === 'prev' ? anchoredPrev
      : displayPrimaryAmt)
    : displayPrimaryQty
  const sourceLabel = effectiveSource === 'wow' ? '前週' : effectiveSource === 'prev' ? '前年' : '実績'
  const drillSourceLabel = `${compare === 'daily' ? '当日' : '累計'}・${sourceLabel}`
  const fmtVal = isAmountMode ? (v: number) => `${toComma(v)}円` : (v: number) => `${v.toLocaleString()}点`

  // サマリ用: 比較期間に応じた実績・予算・前年・前週の値
  const summaryActual = compare === 'daily' ? actual : cumSales
  const summaryBudget = compare === 'daily' ? budget : cumBudget
  const summaryPrevYear = compare === 'daily' ? pySales : cumPrevYear
  const summaryWow = compare === 'daily' ? (wowPrevSales ?? 0) : 0
  const budgetDiff = summaryActual - summaryBudget
  const budgetAch = summaryBudget > 0 ? summaryActual / summaryBudget : 0
  const pyDiff = summaryActual - summaryPrevYear
  const pyRatio = summaryPrevYear > 0 ? summaryActual / summaryPrevYear : 0
  const wowDiff = summaryActual - summaryWow
  const wowRatio = summaryWow > 0 ? summaryActual / summaryWow : 0

  const renderBarSection = (
    title: string,
    barItems: DrillItem[],
    budgetVal: number,
    actualVal: number,
    _achVal: number,
    pyVal: number,
    prefix: string,
    period: CompareMode,
    wowBarItems?: DrillItem[],
    wowPyVal?: number,
  ) => {
    const isActualActive = compare === period && effectiveSource === 'actual'
    const isPrevActive = compare === period && effectiveSource === 'prev'
    const isWoWActive = compare === period && effectiveSource === 'wow'
    const bActualTotal = isAmountMode
      ? barItems.reduce((s, it) => s + it.amount, 0)
      : barItems.reduce((s, it) => s + it.quantity, 0)
    const bPrevTotal = isAmountMode
      ? barItems.reduce((s, it) => s + (it.prevAmount ?? 0), 0)
      : barItems.reduce((s, it) => s + (it.prevQuantity ?? 0), 0)
    const bWoWTotal = wowBarItems
      ? (isAmountMode
        ? wowBarItems.reduce((s, it) => s + (it.prevAmount ?? 0), 0)
        : wowBarItems.reduce((s, it) => s + (it.prevQuantity ?? 0), 0))
      : 0
    // 分類別データが無いが実績（DailyRecord）がある場合のフォールバック表示
    const showActualFallback = bActualTotal === 0 && actualVal > 0 && isAmountMode
    const effectiveActual = showActualFallback ? actualVal : bActualTotal
    const maxBar = isAmountMode
      ? Math.max(budgetVal, effectiveActual, bPrevTotal, bWoWTotal, 1)
      : Math.max(bActualTotal, bPrevTotal, bWoWTotal, 1)

    const tooltipFn = (it: DrillItem, val: number, total: number, isPrev: boolean, compLabel: string) => {
      const pct = formatPercent(total > 0 ? val / total : 0, 2)
      const prevVal = isAmountMode ? (it.prevAmount ?? 0) : (it.prevQuantity ?? 0)
      const curVal = isAmountMode ? it.amount : it.quantity
      const diff = isPrev ? undefined : (curVal - prevVal)
      const yoy = isPrev ? undefined : (prevVal > 0 ? formatPercent(curVal / prevVal, 2) : undefined)
      const rowLabel = isPrev ? compLabel : '実績'
      return (
        <>
          <div style={{ fontWeight: 600, marginBottom: 2, borderBottom: '1px solid rgba(128,128,128,0.3)', paddingBottom: 2 }}>
            {rowLabel} - {it.name}
          </div>
          <div>販売構成比: {pct}</div>
          <div>販売金額: {fmtSen(isAmountMode ? val : (isPrev ? (it.prevAmount ?? 0) : it.amount))}</div>
          {!isAmountMode && <div>数量: {val.toLocaleString()}点</div>}
          {!isPrev && diff != null && (
            <div>{compLabel}差: {diff >= 0 ? '+' : ''}{isAmountMode ? fmtSen(diff) : `${diff.toLocaleString()}点`}</div>
          )}
          {!isPrev && yoy && <div>{compLabel}比: {yoy}</div>}
          {isPrev && curVal > 0 && (
            <div>実績: {isAmountMode ? fmtSen(curVal) : `${curVal.toLocaleString()}点`}</div>
          )}
          {canDrill && (
            <div style={{ fontSize: '0.42rem', opacity: 0.6, marginTop: 2 }}>ダブルクリックでドリルダウン</div>
          )}
        </>
      )
    }

    return (
      <StackedBarSection>
        <StackBarTitle>{title}</StackBarTitle>
        {budgetVal > 0 && isAmountMode && (
          <StackRow $active={false} style={{ cursor: 'default' }}>
            <StackLabel>予算</StackLabel>
            <StackTrack>
              <StackSegment $flex={budgetVal / maxBar} $color="#94a3b8" style={{ opacity: 0.7 }} />
            </StackTrack>
            <StackTotal>{fmtSen(budgetVal)}</StackTotal>
          </StackRow>
        )}
        <StackRow $active={isActualActive} onClick={() => handleRowSelect(period, 'actual')}>
          <StackLabel>実績</StackLabel>
          <StackTrack>
            {showActualFallback ? (
              <StackSegment $flex={actualVal / maxBar} $color="#9ca3af" style={{ opacity: 0.6 }}>
                <SegLabel>分類未取込</SegLabel>
              </StackSegment>
            ) : (
              barItems.map((it) => {
                const val = isAmountMode ? it.amount : it.quantity
                if (val <= 0) return null
                const pct = bActualTotal > 0 ? (val / bActualTotal * 100) : 0
                const segKey = `${prefix}a-${it.code}`
                return (
                  <StackSegment
                    key={it.code} $flex={val / maxBar} $color={it.color}
                    onMouseEnter={(e) => {
                      setHoveredSeg(segKey)
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                      setSegTooltip({ x: rect.left + rect.width / 2, y: rect.top, content: tooltipFn(it, val, bActualTotal, false, '前年') })
                    }}
                    onMouseLeave={() => { setHoveredSeg(null); setSegTooltip(null) }}
                    onDoubleClick={() => canDrill && handleDrill(it)}
                    style={{ cursor: canDrill ? 'pointer' : 'default' }}
                  >
                    {pct >= 10 && <SegLabel>{it.name} {pct.toFixed(2)}%</SegLabel>}
                  </StackSegment>
                )
              })
            )}
          </StackTrack>
          <StackTotal>
            {showActualFallback
              ? fmtSen(actualVal)
              : (isAmountMode ? fmtSen(bActualTotal) : fmtVal(bActualTotal))}
          </StackTotal>
          {isActualActive && <ActiveBadge>▼ 詳細</ActiveBadge>}
        </StackRow>
        {hasPrevYear && pyVal > 0 && (
          <StackRow $active={isPrevActive} onClick={() => handleRowSelect(period, 'prev')}>
            <StackLabel>前年</StackLabel>
            <StackTrack>
              {barItems.map((it) => {
                const val = isAmountMode ? (it.prevAmount ?? 0) : (it.prevQuantity ?? 0)
                if (val <= 0) return null
                const pct = bPrevTotal > 0 ? (val / bPrevTotal * 100) : 0
                const segKey = `${prefix}p-${it.code}`
                return (
                  <StackSegment
                    key={it.code} $flex={val / maxBar} $color={it.color}
                    style={{ opacity: 0.5, cursor: canDrill ? 'pointer' : 'default' }}
                    onMouseEnter={(e) => {
                      setHoveredSeg(segKey)
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                      setSegTooltip({ x: rect.left + rect.width / 2, y: rect.top, content: tooltipFn(it, val, bPrevTotal, true, '前年') })
                    }}
                    onMouseLeave={() => { setHoveredSeg(null); setSegTooltip(null) }}
                    onDoubleClick={() => canDrill && handleDrill(it)}
                  >
                    {pct >= 10 && <SegLabel>{it.name} {pct.toFixed(2)}%</SegLabel>}
                  </StackSegment>
                )
              })}
            </StackTrack>
            <StackTotal>{isAmountMode ? fmtSen(bPrevTotal) : fmtVal(bPrevTotal)}</StackTotal>
            {isPrevActive && <ActiveBadge>▼ 詳細</ActiveBadge>}
          </StackRow>
        )}
        {wowBarItems && (wowPyVal ?? 0) > 0 && (
          <StackRow $active={isWoWActive} onClick={() => handleRowSelect(period, 'wow')}>
            <StackLabel>前週</StackLabel>
            <StackTrack>
              {wowBarItems.map((it) => {
                const val = isAmountMode ? (it.prevAmount ?? 0) : (it.prevQuantity ?? 0)
                if (val <= 0) return null
                const pct = bWoWTotal > 0 ? (val / bWoWTotal * 100) : 0
                const segKey = `${prefix}w-${it.code}`
                return (
                  <StackSegment
                    key={it.code} $flex={val / maxBar} $color={it.color}
                    style={{ opacity: 0.5, cursor: canDrill ? 'pointer' : 'default' }}
                    onMouseEnter={(e) => {
                      setHoveredSeg(segKey)
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                      setSegTooltip({ x: rect.left + rect.width / 2, y: rect.top, content: tooltipFn(it, val, bWoWTotal, true, '前週') })
                    }}
                    onMouseLeave={() => { setHoveredSeg(null); setSegTooltip(null) }}
                    onDoubleClick={() => canDrill && handleDrill(it)}
                  >
                    {pct >= 10 && <SegLabel>{it.name} {pct.toFixed(2)}%</SegLabel>}
                  </StackSegment>
                )
              })}
            </StackTrack>
            <StackTotal>{isAmountMode ? fmtSen(bWoWTotal) : fmtVal(bWoWTotal)}</StackTotal>
            {isWoWActive && <ActiveBadge>▼ 詳細</ActiveBadge>}
          </StackRow>
        )}
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

  if (dayItemsYoY.length === 0 && cumItemsYoY.length === 0 && actual <= 0 && cumSales <= 0) return null

  return (
    <DrillSection>
      <DetailSectionTitle>分類別売上ドリルダウン</DetailSectionTitle>

      <ToggleBar>
        <ToggleLabel>指標</ToggleLabel>
        <ToggleGroup>
          <ToggleBtn $active={metric === 'amount'} onClick={() => setMetric('amount')}>販売金額</ToggleBtn>
          <ToggleBtn $active={metric === 'quantity'} onClick={() => setMetric('quantity')}>点数</ToggleBtn>
        </ToggleGroup>
        <ToggleLabel>比較</ToggleLabel>
        <ToggleGroup>
          <ToggleBtn $active={compare === 'daily'} onClick={() => { setCompare('daily'); setDrillSourceRow('actual') }}>単日</ToggleBtn>
          <ToggleBtn $active={compare === 'cumulative'} onClick={() => { setCompare('cumulative'); setDrillSourceRow('actual') }}>累計</ToggleBtn>
        </ToggleGroup>
        <ToggleLabel>データソース</ToggleLabel>
        <ToggleGroup>
          <ToggleBtn $active={drillSourceRow === 'actual'} onClick={() => setDrillSourceRow('actual')}>実績</ToggleBtn>
          <ToggleBtn $active={drillSourceRow === 'prev'} onClick={() => setDrillSourceRow('prev')}>前年</ToggleBtn>
          {hasWoW && compare === 'daily' && (
            <ToggleBtn $active={drillSourceRow === 'wow'} onClick={() => setDrillSourceRow('wow')}>前週</ToggleBtn>
          )}
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
        <SumItem><SumLabel>合計（{drillSourceLabel}）</SumLabel><SumValue>{fmtVal(displayTotal)}</SumValue></SumItem>
        {summaryBudget > 0 && (
          <>
            <SumItem><SumLabel>予算額</SumLabel><SumValue>{fmtSen(summaryBudget)}</SumValue></SumItem>
            <SumItem><SumLabel>予算差異</SumLabel><SumValue><YoYVal $positive={budgetDiff >= 0}>{fmtSen(budgetDiff)}</YoYVal></SumValue></SumItem>
            <SumItem><SumLabel>予算達成率</SumLabel><SumValue><YoYVal $positive={budgetAch >= 1}>{formatPercent(budgetAch, 2)}</YoYVal></SumValue></SumItem>
          </>
        )}
        {hasPrevYear && summaryPrevYear > 0 && (
          <>
            <SumItem><SumLabel>前年金額</SumLabel><SumValue>{fmtSen(summaryPrevYear)}</SumValue></SumItem>
            <SumItem><SumLabel>前年差異</SumLabel><SumValue><YoYVal $positive={pyDiff >= 0}>{fmtSen(pyDiff)}</YoYVal></SumValue></SumItem>
            <SumItem><SumLabel>前年対比</SumLabel><SumValue><YoYVal $positive={pyRatio >= 1}>{formatPercent(pyRatio, 2)}</YoYVal></SumValue></SumItem>
          </>
        )}
        {hasWoW && compare === 'daily' && summaryWow > 0 && (
          <>
            <SumItem><SumLabel>前週金額</SumLabel><SumValue>{fmtSen(summaryWow)}</SumValue></SumItem>
            <SumItem><SumLabel>前週差異</SumLabel><SumValue><YoYVal $positive={wowDiff >= 0}>{fmtSen(wowDiff)}</YoYVal></SumValue></SumItem>
            <SumItem><SumLabel>前週対比</SumLabel><SumValue><YoYVal $positive={wowRatio >= 1}>{formatPercent(wowRatio, 2)}</YoYVal></SumValue></SumItem>
          </>
        )}
      </SummaryRow>

      {renderBarSection(
        `予算 vs 実績（当日）${year}年${month}月${day}日`,
        dayItemsYoY, budget, actual, ach, pySales, 'day-', 'daily',
        hasWoW ? dayItemsWoW : undefined,
        hasWoW ? (wowPrevSales ?? 0) : undefined,
      )}
      {renderBarSection(
        `予算 vs 実績（累計）${year}年${month}月1日〜${year}年${month}月${day}日`,
        cumItemsYoY, cumBudget, cumSales, cumAch, cumPrevYear, 'cum-', 'cumulative',
      )}
      {hoveredSeg && segTooltip && createPortal(
        <SegmentTooltip style={{
          left: segTooltip.x, top: segTooltip.y,
          transform: 'translate(-50%, calc(-100% - 8px))',
        }}>
          {segTooltip.content}
        </SegmentTooltip>,
        document.body,
      )}

      <DrillTreemap>
        {items.slice(0, 12).map((it) => {
          const val = isAmountMode ? primaryAmt(it) : primaryQty(it)
          const totalForPct = isAmountMode ? displayPrimaryAmt : displayPrimaryQty
          const pctVal = totalForPct > 0 ? (val / totalForPct) * 100 : 0
          return (
            <TreeBlock key={it.code} $flex={val} $color={it.color}
              $canDrill={canDrill}
              onClick={() => canDrill && handleDrill(it)}
              onDoubleClick={() => canDrill && handleDrill(it)}
              title={`${it.name}: ${fmtVal(val)} (${pctVal.toFixed(2)}%)`}>
              <TreeLabel>{it.name}</TreeLabel>
              <TreePct>{pctVal.toFixed(2)}%</TreePct>
            </TreeBlock>
          )
        })}
      </DrillTreemap>

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
                <DTh>{isPrevSource && effectiveSource === 'prev' ? '実績' : '前年'}</DTh>
                <DTh $sortable onClick={() => handleSort('yoyRatio')}>前年比{arrow('yoyRatio')}</DTh>
              </>
            )}
            {hasWoW && compare === 'daily' && (
              <>
                <DTh>{isPrevSource && effectiveSource === 'wow' ? '実績' : '前週'}</DTh>
                <DTh>前週比</DTh>
              </>
            )}
            {canDrill && <DTh />}
          </tr></thead>
          <tbody>
            {sorted.map((it, i) => {
              const mainVal = isAmountMode ? primaryAmt(it) : primaryQty(it)
              const subVal = isAmountMode ? primaryQty(it) : primaryAmt(it)
              // YoY comparison
              const yoyItem = effectiveSource === 'wow'
                ? dayItemsYoY.find((y) => y.code === it.code)
                : it
              const yoyCounterpart = isPrevSource && effectiveSource === 'prev'
                ? (isAmountMode ? it.amount : it.quantity)
                : (isAmountMode ? (yoyItem?.prevAmount ?? 0) : (yoyItem?.prevQuantity ?? 0))
              const yoy = isAmountMode ? yoyItem?.yoyRatio : yoyItem?.yoyQtyRatio
              // WoW comparison
              const wowItem = effectiveSource === 'wow'
                ? it
                : wowItemMap.get(it.code)
              const wowCounterpart = isPrevSource && effectiveSource === 'wow'
                ? (isAmountMode ? it.amount : it.quantity)
                : (isAmountMode ? (wowItem?.prevAmount ?? 0) : (wowItem?.prevQuantity ?? 0))
              const wowRatioVal = wowItem
                ? (isAmountMode ? wowItem.yoyRatio : wowItem.yoyQtyRatio)
                : undefined
              const totalForPct = isAmountMode ? displayPrimaryAmt : displayPrimaryQty
              const pctVal = totalForPct > 0 ? (mainVal / totalForPct) * 100 : 0
              return (
                <DTr key={it.code} $clickable={canDrill}
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
                  <DTd $mono>{pctVal.toFixed(2)}%</DTd>
                  <DTd $mono>{isAmountMode ? `${subVal.toLocaleString()}点` : `${toComma(subVal)}円`}</DTd>
                  {hasPrevYear && (
                    <>
                      <DTd $mono>{yoyCounterpart > 0 ? fmtVal(yoyCounterpart) : '-'}</DTd>
                      <DTd $mono>
                        {yoy != null ? (
                          <YoYVal $positive={yoy >= 1}>{formatPercent(yoy, 2)}</YoYVal>
                        ) : '-'}
                      </DTd>
                    </>
                  )}
                  {hasWoW && compare === 'daily' && (
                    <>
                      <DTd $mono>{wowCounterpart > 0 ? fmtVal(wowCounterpart) : '-'}</DTd>
                      <DTd $mono>
                        {wowRatioVal != null ? (
                          <YoYVal $positive={wowRatioVal >= 1}>{formatPercent(wowRatioVal, 2)}</YoYVal>
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
