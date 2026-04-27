/**
 * useCategoryHierarchyData — カテゴリ階層データの取得・組み立て
 *
 * 2本の pair handler（level/hourly）で当年+前年を並列取得し、
 * HierarchyItem 配列を組み立てる。ソートも担う。
 *
 * UI 操作（filter/sort state）はコンポーネント側に残し、
 * このフックはデータ取得と変換に集中する。
 *
 * @guard G5 hook ≤300行
 * @guard H1 Screen Plan 経由のみ — useCategoryHierarchyPlan
 * @guard H2 比較は pair/bundle 契約 — plan hook 内部で pair handler を使用
 * @responsibility R:unclassified
 */
import { useMemo } from 'react'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import { buildPairedQueryInput } from '@/application/hooks/plans/buildPairedQueryInput'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useCategoryHierarchyPlan } from '@/features/category'
import type { PairedInput } from '@/application/queries/createPairedHandler'
import type { LevelAggregationInput } from '@/application/queries/cts/LevelAggregationHandler'
import type { CategoryHourlyInput } from '@/application/queries/cts/CategoryHourlyHandler'
import { findCoreTime, findTurnaroundHour } from './timeSlotUtils'
import type { HierarchyItem, SortKey, SortDir } from './categoryExplorerTypes'

export type HierarchyLevel = 'department' | 'line' | 'klass'

interface HierarchyFilter {
  departmentCode?: string
  departmentName?: string
  lineCode?: string
  lineName?: string
}

interface UseCategoryHierarchyDataParams {
  queryExecutor: QueryExecutor | null
  currentDateRange: DateRange
  prevYearScope?: PrevYearScope
  selectedStoreIds: ReadonlySet<string>
  totalCustomers?: number
  filter: HierarchyFilter
  currentLevel: HierarchyLevel
  sortKey: SortKey
  sortDir: SortDir
}

export function useCategoryHierarchyData(params: UseCategoryHierarchyDataParams) {
  const {
    queryExecutor,
    currentDateRange,
    prevYearScope,
    selectedStoreIds,
    totalCustomers,
    filter,
    currentLevel,
    sortKey,
    sortDir,
  } = params
  const prevYearDateRange = prevYearScope?.dateRange

  // ── クエリ入力構築（pair handler 用） ──
  const storeIdsList = useMemo(
    () => (selectedStoreIds.size > 0 ? [...selectedStoreIds] : undefined),
    [selectedStoreIds],
  )

  const levelPairInput = useMemo(
    () =>
      buildHierarchyPairInput(
        currentDateRange,
        prevYearDateRange,
        storeIdsList,
        currentLevel,
        filter,
      ),
    [currentDateRange, prevYearDateRange, storeIdsList, currentLevel, filter],
  )

  const hourlyPairInput = useMemo(
    () =>
      buildHierarchyHourlyPairInput(
        currentDateRange,
        prevYearDateRange,
        storeIdsList,
        currentLevel,
        filter,
      ),
    [currentDateRange, prevYearDateRange, storeIdsList, currentLevel, filter],
  )

  // ── クエリ実行（plan hook 経由） ──
  const { levelPair, hourlyPair } = useCategoryHierarchyPlan(
    queryExecutor,
    levelPairInput,
    hourlyPairInput,
  )

  const curLevelData = levelPair.data?.current?.records ?? null
  const curHourlyData = hourlyPair.data?.current?.records ?? null
  const prevLevelData = levelPair.data?.comparison?.records ?? null
  const prevHourlyData = hourlyPair.data?.comparison?.records ?? null

  const hasPrevYear = (prevLevelData?.length ?? 0) > 0

  // ── HierarchyItem 組み立て ──
  const items = useMemo((): readonly HierarchyItem[] => {
    if (!curLevelData || curLevelData.length === 0) return []

    const hourlyMap = new Map<string, Map<number, number>>()
    if (curHourlyData) {
      for (const row of curHourlyData) {
        let hours = hourlyMap.get(row.code)
        if (!hours) {
          hours = new Map()
          hourlyMap.set(row.code, hours)
        }
        hours.set(row.hour, (hours.get(row.hour) ?? 0) + row.amount)
      }
    }

    const prevMap = new Map<string, { amount: number; quantity: number }>()
    if (prevLevelData) {
      for (const row of prevLevelData) {
        prevMap.set(row.code, { amount: row.amount, quantity: row.quantity })
      }
    }

    const prevHourlyMap = new Map<string, Map<number, number>>()
    if (prevHourlyData) {
      for (const row of prevHourlyData) {
        let hours = prevHourlyMap.get(row.code)
        if (!hours) {
          hours = new Map()
          prevHourlyMap.set(row.code, hours)
        }
        hours.set(row.hour, (hours.get(row.hour) ?? 0) + row.amount)
      }
    }

    const total = curLevelData.reduce((s, v) => s + v.amount, 0)

    return curLevelData.map((entry): HierarchyItem => {
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
  }, [curLevelData, curHourlyData, prevLevelData, prevHourlyData, totalCustomers])

  // ── ソート ──
  const sortedItems = useMemo(
    () => sortHierarchyItems(items, sortKey, sortDir),
    [items, sortKey, sortDir],
  )

  return {
    items,
    sortedItems,
    hasPrevYear,
    isLoading: levelPair.isLoading,
  }
}

// ── HierarchyItem sorter（pure） ──

function sortHierarchyItems(
  items: readonly HierarchyItem[],
  sortKey: SortKey,
  sortDir: SortDir,
): readonly HierarchyItem[] {
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
}

// ── Pure input builders（テスト対象） ──
//
// Phase 5 横展開 第 2 バッチ: 2 helper は buildPairedQueryInput pure builder
// に委譲し、level / deptCode / lineCode の拡張フィールドだけを spread で
// 乗せる。直接の dateRangeToKeys 呼び出しは application 層の builder に
// 集約された。

/**
 * storeIds array を Set に変換して buildPairedQueryInput に渡す内部 helper。
 * 既存 API（array）と buildPairedQueryInput の入力（Set）の橋渡し。
 */
function toStoreIdSet(storeIds: readonly string[] | undefined): ReadonlySet<string> {
  return storeIds ? new Set(storeIds) : new Set()
}

/**
 * LevelAggregation pair handler 用の入力を構築する純粋関数。
 */
export function buildHierarchyPairInput(
  currentDateRange: DateRange,
  prevYearDateRange: DateRange | undefined,
  storeIds: readonly string[] | undefined,
  level: HierarchyLevel,
  filter: HierarchyFilter,
): PairedInput<LevelAggregationInput> {
  // currentDateRange は non-null なので builder は必ず非 null を返す
  const base = buildPairedQueryInput(currentDateRange, prevYearDateRange, toStoreIdSet(storeIds))!
  return {
    ...base,
    level,
    deptCode: filter.departmentCode,
    lineCode: filter.lineCode,
  }
}

/**
 * CategoryHourly pair handler 用の入力を構築する純粋関数。
 */
export function buildHierarchyHourlyPairInput(
  currentDateRange: DateRange,
  prevYearDateRange: DateRange | undefined,
  storeIds: readonly string[] | undefined,
  level: HierarchyLevel,
  filter: HierarchyFilter,
): PairedInput<CategoryHourlyInput> {
  const base = buildPairedQueryInput(currentDateRange, prevYearDateRange, toStoreIdSet(storeIds))!
  return {
    ...base,
    level,
    deptCode: filter.departmentCode,
    lineCode: filter.lineCode,
  }
}
