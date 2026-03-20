/**
 * カテゴリ階層エクスプローラー
 *
 * 部門→ライン→クラス の階層ドリルダウンを提供する。
 * データは queryLevelAggregation と queryCategoryHourly で取得。
 * テーブル描画は CategoryExplorerTable に委譲。
 */
import { Fragment, memo, useMemo, useState, useCallback } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange, PrevYearScope } from '@/domain/models'
import { toPct } from './chartTheme'
import { CategoryExplorerTable } from './CategoryExplorerTable'
import { findCoreTime, findTurnaroundHour } from './timeSlotUtils'
import { useDuckDBLevelAggregation, useDuckDBCategoryHourly } from '@/application/hooks/duckdb'
import { ChartSkeleton } from '@/presentation/components/common'
import { ChartHelpButton } from './ChartHeader'
import { CHART_GUIDES } from './chartGuides'
import type { HierarchyItem, SortKey, SortDir } from './categoryExplorerTypes'
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
  EmptyFilterMsg,
  YoYBadge,
  TabGroup,
  Tab,
  HeaderRow,
} from './CategoryHierarchyExplorer.styles'

interface Props {
  duckConn: AsyncDuckDBConnection | null
  duckDataVersion: number
  currentDateRange: DateRange
  prevYearScope?: PrevYearScope
  selectedStoreIds: ReadonlySet<string>
  totalCustomers?: number
}

interface HierarchyFilter {
  departmentCode?: string
  departmentName?: string
  lineCode?: string
  lineName?: string
}

export const CategoryHierarchyExplorer = memo(function CategoryHierarchyExplorer({
  duckConn,
  duckDataVersion,
  currentDateRange,
  prevYearScope,
  selectedStoreIds,
  totalCustomers,
}: Props) {
  const prevYearDateRange = prevYearScope?.dateRange
  const [filter, setFilter] = useState<HierarchyFilter>({})
  const [sortKey, setSortKey] = useState<SortKey>('amount')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [showYoY, setShowYoY] = useState(true)

  const currentLevel: 'department' | 'line' | 'klass' = filter.lineCode
    ? 'klass'
    : filter.departmentCode
      ? 'line'
      : 'department'

  const levelLabels: Record<string, string> = {
    department: '部門',
    line: 'ライン',
    klass: 'クラス',
  }

  // Hierarchy params for DuckDB
  const hierarchy = useMemo(
    () => ({
      deptCode: filter.departmentCode,
      lineCode: filter.lineCode,
    }),
    [filter.departmentCode, filter.lineCode],
  )

  // DuckDB: 当年レベル別集約
  const curLevelAgg = useDuckDBLevelAggregation(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    currentLevel,
    hierarchy,
  )

  // DuckDB: 当年カテゴリ×時間帯集約
  const curHourly = useDuckDBCategoryHourly(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    currentLevel,
    hierarchy,
  )

  // DuckDB: 前年レベル別集約
  const prevLevelAgg = useDuckDBLevelAggregation(
    duckConn,
    duckDataVersion,
    prevYearDateRange,
    selectedStoreIds,
    currentLevel,
    hierarchy,
    true, // isPrevYear
  )

  // DuckDB: 前年カテゴリ×時間帯集約
  const prevHourly = useDuckDBCategoryHourly(
    duckConn,
    duckDataVersion,
    prevYearDateRange,
    selectedStoreIds,
    currentLevel,
    hierarchy,
    true, // isPrevYear
  )

  const hasPrevYear = (prevLevelAgg.data?.length ?? 0) > 0

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

  // Combine level aggregation with hourly data to build HierarchyItems
  const items = useMemo((): readonly HierarchyItem[] => {
    if (!curLevelAgg.data || curLevelAgg.data.length === 0) return []

    // Build hourly map: code → hour → amount
    const hourlyMap = new Map<string, Map<number, number>>()
    if (curHourly.data) {
      for (const row of curHourly.data) {
        let hours = hourlyMap.get(row.code)
        if (!hours) {
          hours = new Map()
          hourlyMap.set(row.code, hours)
        }
        hours.set(row.hour, (hours.get(row.hour) ?? 0) + row.amount)
      }
    }

    // Build prev year amount map
    const prevMap = new Map<string, { amount: number; quantity: number }>()
    if (prevLevelAgg.data) {
      for (const row of prevLevelAgg.data) {
        prevMap.set(row.code, { amount: row.amount, quantity: row.quantity })
      }
    }

    // Build prev year hourly map
    const prevHourlyMap = new Map<string, Map<number, number>>()
    if (prevHourly.data) {
      for (const row of prevHourly.data) {
        let hours = prevHourlyMap.get(row.code)
        if (!hours) {
          hours = new Map()
          prevHourlyMap.set(row.code, hours)
        }
        hours.set(row.hour, (hours.get(row.hour) ?? 0) + row.amount)
      }
    }

    const total = curLevelAgg.data.reduce((s, v) => s + v.amount, 0)

    return curLevelAgg.data.map((entry): HierarchyItem => {
      const hours = hourlyMap.get(entry.code) ?? new Map<number, number>()
      const hp = Array.from({ length: 24 }, (_, h) => Math.round(hours.get(h) ?? 0))
      const mx = Math.max(...hp)

      const prev = prevMap.get(entry.code)
      const prevAmt = prev ? Math.round(prev.amount) : undefined
      const prevQty = prev ? Math.round(prev.quantity) : undefined

      const ct = findCoreTime(hours)
      const th = findTurnaroundHour(hours)
      const curPeakHour = mx > 0 ? hp.indexOf(mx) : -1

      let prevPeakHour: number | undefined
      let peakHourShift: number | undefined
      let hasAnomalyShift = false
      const prevHours = prevHourlyMap.get(entry.code)
      if (prevHours) {
        const prevHp = Array.from({ length: 24 }, (_, h) => Math.round(prevHours.get(h) ?? 0))
        const prevMx = Math.max(...prevHp)
        prevPeakHour = prevMx > 0 ? prevHp.indexOf(prevMx) : undefined
        if (prevPeakHour != null && prevPeakHour >= 0 && curPeakHour >= 0) {
          peakHourShift = curPeakHour - prevPeakHour
          hasAnomalyShift = Math.abs(peakHourShift) >= 2
        }
      }

      const amt = Math.round(entry.amount)
      const qty = Math.round(entry.quantity)
      const piValue =
        totalCustomers && totalCustomers > 0 ? (entry.amount / totalCustomers) * 1000 : undefined

      return {
        code: entry.code,
        name: entry.name || entry.code,
        amount: amt,
        quantity: qty,
        pct: total > 0 ? (amt / total) * 100 : 0,
        peakHour: curPeakHour,
        coreTimeStart: ct?.startHour ?? -1,
        coreTimeEnd: ct?.endHour ?? -1,
        turnaroundHour: th ?? -1,
        hourlyPattern: hp,
        childCount: entry.childCount,
        prevAmount: prevAmt,
        prevQuantity: prevQty,
        yoyRatio: prevAmt && prevAmt > 0 ? amt / prevAmt : undefined,
        yoyDiff: prevAmt != null ? amt - prevAmt : undefined,
        yoyQuantityRatio: prevQty && prevQty > 0 ? qty / prevQty : undefined,
        prevPeakHour,
        peakHourShift,
        hasAnomalyShift,
        piValue,
        handledDayCount: entry.handledDayCount,
        totalDayCount: entry.totalDayCount,
      }
    })
  }, [curLevelAgg.data, curHourly.data, prevLevelAgg.data, prevHourly.data, totalCustomers])

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
    [currentLevel, filter],
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
  const showYoYCols = hasPrevYear && showYoY

  // Loading
  if (curLevelAgg.isLoading) {
    return (
      <Wrapper>
        <ChartSkeleton height="400px" />
      </Wrapper>
    )
  }

  if (sortedItems.length === 0) {
    return (
      <Wrapper>
        <EmptyFilterMsg>選択した絞り込み条件に該当するデータがありません</EmptyFilterMsg>
      </Wrapper>
    )
  }

  return (
    <Wrapper>
      <HeaderRow>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              fontSize: '0.82rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            カテゴリードリルダウン分析
          </span>
          <ChartHelpButton guide={CHART_GUIDES['category-hierarchy-explorer']} />
        </div>
        {hasPrevYear && (
          <TabGroup role="tablist" aria-label="表示切替">
            <Tab
              $active={showYoY}
              onClick={() => setShowYoY(!showYoY)}
              role="tab"
              aria-selected={showYoY}
            >
              前年比較
            </Tab>
          </TabGroup>
        )}
      </HeaderRow>
      <BreadcrumbBar>
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

      <CategoryExplorerTable
        items={items}
        sortedItems={sortedItems}
        currentLevel={currentLevel}
        levelLabels={levelLabels}
        sortKey={sortKey}
        sortDir={sortDir}
        handleSort={handleSort}
        handleDrill={handleDrill}
        showYoYCols={showYoYCols}
        showPi={showPi}
        avgPi={avgPi}
        maxAmt={maxAmt}
        canDrill={canDrill}
      />
    </Wrapper>
  )
})
