/**
 * カテゴリ別売上ドリルダウン（CategoryDrilldown）
 *
 * DayDetailModal の「売上分析」タブで表示する
 * 分類別ドリルダウンテーブル・ツリーマップ・積み上げバーチャートを提供する。
 */
import { useState, useMemo, useCallback, Fragment } from 'react'
import { createPortal } from 'react-dom'
import type { CategoryTimeSalesRecord } from '@/domain/models'
import type { HierarchyFilter } from '@/presentation/components/charts/CategoryHierarchyContext'
import { filterByHierarchy, getHierarchyLevel } from '@/presentation/components/charts/CategoryHierarchyContext'
import { toComma } from '@/presentation/components/charts/chartTheme'
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
  const [segTooltip, setSegTooltip] = useState<{ x: number; y: number; content: React.ReactNode } | null>(null)
  const [drillSourceRow, setDrillSourceRow] = useState<'actual' | 'prev'>('actual')

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

  const dayFiltered = useMemo(() => filterByHierarchy(records, filter), [records, filter])
  const dayFilteredPrev = useMemo(() => hasPrevYear ? filterByHierarchy(prevRecords, filter) : [], [prevRecords, filter, hasPrevYear])
  const cumFiltered = useMemo(() => filterByHierarchy(cumRecords, filter), [cumRecords, filter])
  const cumFilteredPrev = useMemo(() => hasPrevYear ? filterByHierarchy(cumPrevRecords, filter) : [], [cumPrevRecords, filter, hasPrevYear])

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

  const dayItems = useMemo(
    () => buildDrillItems(dayFiltered, dayFilteredPrev, currentLevel, metric, levelColorMap, hasPrevYear),
    [dayFiltered, dayFilteredPrev, currentLevel, metric, levelColorMap, hasPrevYear],
  )
  const cumItemsList = useMemo(
    () => buildDrillItems(cumFiltered, cumFilteredPrev, currentLevel, metric, levelColorMap, hasPrevYear),
    [cumFiltered, cumFilteredPrev, currentLevel, metric, levelColorMap, hasPrevYear],
  )

  const items = compare === 'daily' ? dayItems : cumItemsList

  const isPrevSource = drillSourceRow === 'prev'
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

  const handleRowSelect = useCallback((period: CompareMode, row: 'actual' | 'prev') => {
    setCompare(period)
    setDrillSourceRow(row)
  }, [])

  const totalAmt = items.reduce((s, i) => s + i.amount, 0)
  const totalQty = items.reduce((s, i) => s + i.quantity, 0)
  const totalPrevAmt = items.reduce((s, i) => s + (i.prevAmount ?? 0), 0)
  const totalPrevQty = items.reduce((s, i) => s + (i.prevQuantity ?? 0), 0)
  const totalYoY = totalPrevAmt > 0 ? totalAmt / totalPrevAmt : null
  const totalQtyYoY = totalPrevQty > 0 ? totalQty / totalPrevQty : null
  const displayPrimaryAmt = isPrevSource ? totalPrevAmt : totalAmt
  const displayPrimaryQty = isPrevSource ? totalPrevQty : totalQty
  const maxVal = items.length > 0
    ? Math.max(...items.map((i) => metric === 'amount' ? primaryAmt(i) : primaryQty(i)))
    : 1
  const canDrill = currentLevel !== 'klass'
  const arrow = (k: SortKey) => sortKey === k ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  const isAmountMode = metric === 'amount'
  const displayTotal = isAmountMode ? displayPrimaryAmt : displayPrimaryQty
  const displayYoY = isAmountMode ? totalYoY : totalQtyYoY
  const drillSourceLabel = `${compare === 'daily' ? '当日' : '累計'}・${isPrevSource ? '前年' : '実績'}`
  const fmtVal = isAmountMode ? (v: number) => `${toComma(v)}円` : (v: number) => `${v.toLocaleString()}点`

  const renderBarSection = (
    title: string,
    barItems: DrillItem[],
    budgetVal: number,
    actualVal: number,
    _achVal: number,
    pyVal: number,
    prefix: string,
    period: CompareMode,
  ) => {
    const isActualActive = compare === period && drillSourceRow === 'actual'
    const isPrevActive = compare === period && drillSourceRow === 'prev'
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
      const diff = isPrev ? undefined : (curVal - prevVal)
      const yoy = isPrev ? undefined : (prevVal > 0 ? (curVal / prevVal * 100).toFixed(2) : undefined)
      const rowLabel = isPrev ? '前年' : '実績'
      return (
        <>
          <div style={{ fontWeight: 600, marginBottom: 2, borderBottom: '1px solid rgba(128,128,128,0.3)', paddingBottom: 2 }}>
            {rowLabel} - {it.name}
          </div>
          <div>販売構成比: {pct}%</div>
          <div>販売金額: {fmtSen(isAmountMode ? val : (isPrev ? (it.prevAmount ?? 0) : it.amount))}</div>
          {!isAmountMode && <div>数量: {val.toLocaleString()}点</div>}
          {!isPrev && diff != null && (
            <div>前年差: {diff >= 0 ? '+' : ''}{isAmountMode ? fmtSen(diff) : `${diff.toLocaleString()}点`}</div>
          )}
          {!isPrev && yoy && <div>前年比: {yoy}%</div>}
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
            {barItems.map((it) => {
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
                    setSegTooltip({ x: rect.left + rect.width / 2, y: rect.top, content: tooltipFn(it, val, bActualTotal, false) })
                  }}
                  onMouseLeave={() => { setHoveredSeg(null); setSegTooltip(null) }}
                  onDoubleClick={() => canDrill && handleDrill(it)}
                  style={{ cursor: canDrill ? 'pointer' : 'default' }}
                >
                  {pct >= 10 && <SegLabel>{it.name} {pct.toFixed(2)}%</SegLabel>}
                </StackSegment>
              )
            })}
          </StackTrack>
          <StackTotal>
            {isAmountMode ? fmtSen(actualVal) : fmtVal(bActualTotal)}
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
                      setSegTooltip({ x: rect.left + rect.width / 2, y: rect.top, content: tooltipFn(it, val, bPrevTotal, true) })
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
        {hasPrevYear && !isPrevSource && displayYoY != null && (
          <SumItem>
            <SumLabel>前年比</SumLabel>
            <SumValue><YoYVal $positive={displayYoY >= 1}>{(displayYoY * 100).toFixed(2)}%</YoYVal></SumValue>
          </SumItem>
        )}
      </SummaryRow>

      {renderBarSection(`予算 vs 実績（当日）${year}年${month}月${day}日`, dayItems, budget, actual, ach, pySales, 'day-', 'daily')}
      {renderBarSection(`予算 vs 実績（累計）${year}年${month}月1日〜${year}年${month}月${day}日`, cumItemsList, cumBudget, cumSales, cumAch, cumPrevYear, 'cum-', 'cumulative')}
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
                <DTh>{isPrevSource ? '実績' : '前年'}</DTh>
                <DTh $sortable onClick={() => handleSort('yoyRatio')}>前年比{arrow('yoyRatio')}</DTh>
              </>
            )}
            {canDrill && <DTh />}
          </tr></thead>
          <tbody>
            {sorted.map((it, i) => {
              const mainVal = isAmountMode ? primaryAmt(it) : primaryQty(it)
              const subVal = isAmountMode ? primaryQty(it) : primaryAmt(it)
              const counterpartVal = isPrevSource
                ? (isAmountMode ? it.amount : it.quantity)
                : (isAmountMode ? (it.prevAmount ?? 0) : (it.prevQuantity ?? 0))
              const yoy = isAmountMode ? it.yoyRatio : it.yoyQtyRatio
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
                      <DTd $mono>{counterpartVal > 0 ? fmtVal(counterpartVal) : '-'}</DTd>
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
