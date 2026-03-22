/**
 * useDrilldownData - CategoryDrilldown のデータ計算・状態管理フック
 *
 * CategoryDrilldown コンポーネントから全ての useState / useMemo / useCallback と
 * 導出値の計算ロジックを抽出し、UI は描画のみに専念させる。
 */
import { useState, useMemo, useCallback } from 'react'
import type { CategoryTimeSalesRecord } from '@/domain/models/record'
import {
  filterByHierarchy,
  getHierarchyLevel,
  type HierarchyFilter,
} from '@/presentation/components/charts/categoryHierarchyHooks'
import { toComma } from '@/presentation/components/charts/chartTheme'
import { formatPercent } from '@/domain/formatting'
import { calculateAchievementRate, calculateYoYRatio } from '@/domain/calculations/utils'
import {
  aggregateForDrill,
  buildDrillItems,
  fmtSen,
  COLORS,
  type DrillItem,
  type MetricKey,
  type CompareMode,
  type SortKey,
  type SortDir,
} from './drilldownUtils'

export type { DrillItem, CompareMode, SortKey }

/* ── 入力 Props 型 ──────────────────────────── */

export interface CategoryDrilldownProps {
  records: readonly CategoryTimeSalesRecord[]
  prevRecords: readonly CategoryTimeSalesRecord[]
  budget: number
  cumRecords: readonly CategoryTimeSalesRecord[]
  cumPrevRecords: readonly CategoryTimeSalesRecord[]
  cumBudget: number
  actual: number
  ach: number
  pySales: number
  hasPrevYearSales: boolean
  cumSales: number
  cumAch: number
  cumPrevYear: number
  year: number
  month: number
  day: number
  wowRecords?: readonly CategoryTimeSalesRecord[]
  wowPrevSales?: number
  canWoW?: boolean
}

/* ── セグメントツールチップ型 ──────────────── */

export interface SegTooltipState {
  x: number
  y: number
  content: React.ReactNode
}

/* ── BarSection 用データ型 ─────────────────── */

export interface BarSectionData {
  title: string
  barItems: DrillItem[]
  budgetVal: number
  actualVal: number
  pyVal: number
  prefix: string
  period: CompareMode
  wowBarItems?: DrillItem[]
  wowPyVal?: number
}

/* ── レベルラベル定数 ────────────────────────── */

const LEVEL_LABELS: Record<string, string> = {
  department: '部門',
  line: 'ライン',
  klass: 'クラス',
}

/* ── Hook 本体 ───────────────────────────────── */

export function useDrilldownData(props: CategoryDrilldownProps) {
  const {
    records,
    prevRecords,
    budget,
    cumRecords,
    cumPrevRecords,
    cumBudget,
    actual,
    pySales,
    hasPrevYearSales,
    cumSales,
    cumPrevYear,
    year,
    month,
    day,
    wowRecords,
    wowPrevSales,
    canWoW,
  } = props

  /* ── State ───────────────────────────────── */

  const [filter, setFilter] = useState<HierarchyFilter>({})
  const [sortKey, setSortKey] = useState<SortKey>('amount')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [metric, setMetric] = useState<MetricKey>('amount')
  const [compare, setCompare] = useState<CompareMode>('daily')
  const [hoveredSeg, setHoveredSeg] = useState<string | null>(null)
  const [segTooltip, setSegTooltip] = useState<SegTooltipState | null>(null)
  const [drillSourceRow, setDrillSourceRow] = useState<'actual' | 'prev' | 'wow'>('actual')

  /* ── 導出値 ──────────────────────────────── */

  const currentLevel = getHierarchyLevel(filter)
  const hasPrevYear = prevRecords.length > 0 || cumPrevRecords.length > 0 || hasPrevYearSales
  const hasWoW = canWoW === true && ((wowRecords ?? []).length > 0 || (wowPrevSales ?? 0) > 0)
  // 累計モードでは WoW データソースを実績にフォールバック
  const effectiveSource =
    drillSourceRow === 'wow' && (compare === 'cumulative' || !hasWoW)
      ? ('actual' as const)
      : drillSourceRow

  /* ── パンくず ─────────────────────────────── */

  const breadcrumb = useMemo(() => {
    const items: { label: string; f: HierarchyFilter }[] = [{ label: '全カテゴリ', f: {} }]
    if (filter.departmentCode) {
      items.push({
        label: filter.departmentName || filter.departmentCode,
        f: { departmentCode: filter.departmentCode, departmentName: filter.departmentName },
      })
    }
    if (filter.lineCode) {
      items.push({ label: filter.lineName || filter.lineCode, f: { ...filter } })
    }
    return items
  }, [filter])

  /* ── フィルタ済みレコード ────────────────── */

  const dayFiltered = useMemo(() => filterByHierarchy(records, filter), [records, filter])
  const dayFilteredYoYPrev = useMemo(
    () => (hasPrevYear ? filterByHierarchy(prevRecords, filter) : []),
    [hasPrevYear, prevRecords, filter],
  )
  const dayFilteredWoWPrev = useMemo(
    () => (hasWoW ? filterByHierarchy(wowRecords ?? [], filter) : []),
    [hasWoW, wowRecords, filter],
  )
  const cumFiltered = useMemo(() => filterByHierarchy(cumRecords, filter), [cumRecords, filter])
  const cumFilteredYoYPrev = useMemo(
    () => (hasPrevYear ? filterByHierarchy(cumPrevRecords, filter) : []),
    [hasPrevYear, cumPrevRecords, filter],
  )

  /* ── カラーマップ ────────────────────────── */

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

  /* ── ドリルアイテム ──────────────────────── */

  // YoY items
  const dayItemsYoY = useMemo(
    () =>
      buildDrillItems(
        dayFiltered,
        dayFilteredYoYPrev,
        currentLevel,
        metric,
        levelColorMap,
        hasPrevYear,
      ),
    [dayFiltered, dayFilteredYoYPrev, currentLevel, metric, levelColorMap, hasPrevYear],
  )
  const cumItemsYoY = useMemo(
    () =>
      buildDrillItems(
        cumFiltered,
        cumFilteredYoYPrev,
        currentLevel,
        metric,
        levelColorMap,
        hasPrevYear,
      ),
    [cumFiltered, cumFilteredYoYPrev, currentLevel, metric, levelColorMap, hasPrevYear],
  )
  // WoW items（当日のみ、累計は対象外）
  const dayItemsWoW = useMemo(
    () =>
      hasWoW
        ? buildDrillItems(
            dayFiltered,
            dayFilteredWoWPrev,
            currentLevel,
            metric,
            levelColorMap,
            true,
          )
        : [],
    [dayFiltered, dayFilteredWoWPrev, currentLevel, metric, levelColorMap, hasWoW],
  )
  const wowItemMap = useMemo(() => {
    const map = new Map<string, DrillItem>()
    for (const it of dayItemsWoW) map.set(it.code, it)
    return map
  }, [dayItemsWoW])

  /* ── テーブル・ツリーマップ用アクティブ items ─ */

  const items = (() => {
    if (compare === 'cumulative') return cumItemsYoY
    if (effectiveSource === 'wow') return dayItemsWoW
    return dayItemsYoY
  })()

  const isPrevSource = effectiveSource !== 'actual'
  const primaryAmt = useCallback(
    (it: DrillItem) => (isPrevSource ? (it.prevAmount ?? 0) : it.amount),
    [isPrevSource],
  )
  const primaryQty = useCallback(
    (it: DrillItem) => (isPrevSource ? (it.prevQuantity ?? 0) : it.quantity),
    [isPrevSource],
  )

  /* ── ソート済みリスト ────────────────────── */

  const sorted = useMemo(() => {
    const arr = [...items]
    arr.sort((a, b) => {
      let d = 0
      switch (sortKey) {
        case 'amount':
          d = metric === 'amount' ? primaryAmt(a) - primaryAmt(b) : primaryQty(a) - primaryQty(b)
          break
        case 'quantity':
          d = primaryQty(a) - primaryQty(b)
          break
        case 'pct':
          d = a.pct - b.pct
          break
        case 'name':
          d = a.name.localeCompare(b.name, 'ja')
          break
        case 'yoyRatio':
          d = (a.yoyRatio ?? 0) - (b.yoyRatio ?? 0)
          break
      }
      return sortDir === 'desc' ? -d : d
    })
    return arr
  }, [items, sortKey, sortDir, metric, primaryAmt, primaryQty])

  /* ── コールバック ────────────────────────── */

  const handleDrill = useCallback(
    (it: DrillItem) => {
      if (currentLevel === 'department')
        setFilter({ departmentCode: it.code, departmentName: it.name })
      else if (currentLevel === 'line')
        setFilter((prev) => ({ ...prev, lineCode: it.code, lineName: it.name }))
    },
    [currentLevel],
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

  const handleRowSelect = useCallback((period: CompareMode, row: 'actual' | 'prev' | 'wow') => {
    setCompare(period)
    setDrillSourceRow(row)
  }, [])

  /* ── 集計値 ──────────────────────────────── */

  const totalPrevAmt = items.reduce((s, i) => s + (i.prevAmount ?? 0), 0)
  const totalPrevQty = items.reduce((s, i) => s + (i.prevQuantity ?? 0), 0)
  const totalAmt = items.reduce((s, i) => s + i.amount, 0)
  const totalQty = items.reduce((s, i) => s + i.quantity, 0)
  const displayPrimaryAmt = isPrevSource ? totalPrevAmt : totalAmt
  const displayPrimaryQty = isPrevSource ? totalPrevQty : totalQty
  const maxVal =
    items.length > 0
      ? Math.max(...items.map((i) => (metric === 'amount' ? primaryAmt(i) : primaryQty(i))))
      : 1
  const canDrill = currentLevel !== 'klass'
  const arrow = (k: SortKey) => (sortKey === k ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '')

  const isAmountMode = metric === 'amount'
  // 売上金額モードかつ実績/前年データソースの場合、Excel由来の actual/cumSales にアンカーする。
  // CSV(categoryTimeSales) 合計は Excel(sales) と一致する保証がないため、
  // @guard D2「引数を無視して別ソースから再計算してはならない」に従う。
  const anchoredActual = compare === 'daily' ? actual : cumSales
  const anchoredPrev = compare === 'daily' ? pySales : cumPrevYear
  const displayTotal = isAmountMode
    ? effectiveSource === 'actual'
      ? anchoredActual
      : effectiveSource === 'prev'
        ? anchoredPrev
        : displayPrimaryAmt
    : displayPrimaryQty
  const sourceLabel =
    effectiveSource === 'wow' ? '前週' : effectiveSource === 'prev' ? '前年' : '実績'
  const drillSourceLabel = `${compare === 'daily' ? '当日' : '累計'}・${sourceLabel}`
  const fmtVal = isAmountMode
    ? (v: number) => `${toComma(v)}円`
    : (v: number) => `${v.toLocaleString()}点`
  /** fmtVal の逆メトリクス版（テーブルのサブカラムで使用） */
  const fmtValSub = isAmountMode
    ? (v: number) => `${v.toLocaleString()}点`
    : (v: number) => `${toComma(v)}円`

  /* ── サマリ値 ────────────────────────────── */

  const summaryActual = compare === 'daily' ? actual : cumSales
  const summaryBudget = compare === 'daily' ? budget : cumBudget
  const summaryPrevYear = compare === 'daily' ? pySales : cumPrevYear
  const summaryWow = compare === 'daily' ? (wowPrevSales ?? 0) : 0
  const budgetDiff = summaryActual - summaryBudget
  const budgetAch = calculateAchievementRate(summaryActual, summaryBudget)
  const pyDiff = summaryActual - summaryPrevYear
  const pyRatio = calculateYoYRatio(summaryActual, summaryPrevYear)
  const wowDiff = summaryActual - summaryWow
  const wowRatio = calculateYoYRatio(summaryActual, summaryWow)

  /* ── BarSection 用データ ──────────────────── */

  const dailyBarSection: BarSectionData = {
    title: `予算 vs 実績（当日）${year}年${month}月${day}日`,
    barItems: dayItemsYoY,
    budgetVal: budget,
    actualVal: actual,
    pyVal: pySales,
    prefix: 'day-',
    period: 'daily',
    wowBarItems: hasWoW ? dayItemsWoW : undefined,
    wowPyVal: hasWoW ? (wowPrevSales ?? 0) : undefined,
  }

  const cumulativeBarSection: BarSectionData = {
    title: `予算 vs 実績（累計）${year}年${month}月1日〜${year}年${month}月${day}日`,
    barItems: cumItemsYoY,
    budgetVal: cumBudget,
    actualVal: cumSales,
    pyVal: cumPrevYear,
    prefix: 'cum-',
    period: 'cumulative',
  }

  /* ── 表示判定 ─────────────────────────────── */

  const isEmpty =
    dayItemsYoY.length === 0 && cumItemsYoY.length === 0 && actual <= 0 && cumSales <= 0

  return {
    // state
    filter,
    setFilter,
    metric,
    setMetric,
    compare,
    setCompare,
    drillSourceRow,
    setDrillSourceRow,
    hoveredSeg,
    setHoveredSeg,
    segTooltip,
    setSegTooltip,

    // derived
    currentLevel,
    levelLabels: LEVEL_LABELS,
    hasPrevYear,
    hasWoW,
    effectiveSource,
    isPrevSource,
    isAmountMode,
    canDrill,
    breadcrumb,
    items,
    sorted,
    maxVal,
    displayPrimaryAmt,
    displayPrimaryQty,
    displayTotal,
    sourceLabel,
    drillSourceLabel,
    dayItemsYoY,
    dayItemsWoW,
    wowItemMap,

    // summary
    summaryBudget,
    summaryPrevYear,
    summaryWow,
    budgetDiff,
    budgetAch,
    pyDiff,
    pyRatio,
    wowDiff,
    wowRatio,

    // bar section data
    dailyBarSection,
    cumulativeBarSection,

    // helpers
    primaryAmt,
    primaryQty,
    fmtVal,
    fmtValSub,
    fmtSen,
    formatPercent,
    arrow,

    // callbacks
    handleDrill,
    handleSort,
    handleRowSelect,

    // visibility
    isEmpty,
  }
}

/* ── Hook 戻り値型のエクスポート ────────────── */

export type DrilldownData = ReturnType<typeof useDrilldownData>
