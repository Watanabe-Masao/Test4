/**
 * カテゴリ階層エクスプローラー データフック
 *
 * CategoryHierarchyExplorer のデータ集約・ソート・ドリルダウンロジックを分離。
 * ツリー構造の構築と前年比較データの生成を担う。
 */
import { useMemo, useState, useCallback } from 'react'
import type { CategoryTimeSalesRecord, CategoryTimeSalesIndex, DateRange } from '@/domain/models'
import { findCoreTime, findTurnaroundHour } from './timeSlotUtils'
import {
  useCategoryHierarchy,
  filterByHierarchy,
  type HierarchyFilter,
} from './categoryHierarchyHooks'
import { usePeriodFilter, useHierarchyDropdown } from './periodFilterHooks'
import { computeDivisor, countDistinctDays, filterByStore } from './periodFilterUtils'
import { queryByDateRange } from '@/application/usecases'

/* ── Types ─────────────────────────────────── */

export type SortKey =
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
export type SortDir = 'asc' | 'desc'

export interface HierarchyItem {
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
  prevAmount?: number
  prevQuantity?: number
  yoyRatio?: number
  yoyDiff?: number
  yoyQuantityRatio?: number
  prevPeakHour?: number
  peakHourShift?: number
  hasAnomalyShift?: boolean
  piValue?: number
}

/* ── Aggregation helper ──────────────────────── */

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

/* ── Hook ───────────────────────────────────── */

export interface CategoryExplorerData {
  readonly items: readonly HierarchyItem[]
  readonly sortedItems: readonly HierarchyItem[]
  readonly currentLevel: 'department' | 'line' | 'klass'
  readonly levelLabels: Record<string, string>
  readonly breadcrumb: readonly { label: string; filter: HierarchyFilter }[]
  readonly filter: HierarchyFilter
  readonly setFilter: (f: HierarchyFilter) => void
  readonly sortKey: SortKey
  readonly sortDir: SortDir
  readonly handleSort: (key: SortKey) => void
  readonly handleDrill: (it: HierarchyItem) => void
  readonly hasPrevYear: boolean
  readonly showYoY: boolean
  readonly setShowYoY: (v: boolean) => void
  readonly pf: ReturnType<typeof usePeriodFilter>
  readonly hf: ReturnType<typeof useHierarchyDropdown>
  readonly totalAmt: number
  readonly totalQty: number
  readonly totalPrevAmt: number
  readonly totalYoYRatio: number | null
  readonly maxAmt: number
  readonly showPi: boolean
  readonly avgPi: number
  readonly canDrill: boolean
  readonly showYoYCols: boolean
}

export function useCategoryExplorerData(
  ctsIndex: CategoryTimeSalesIndex,
  prevCtsIndex: CategoryTimeSalesIndex,
  selectedStoreIds: ReadonlySet<string>,
  daysInMonth: number,
  year: number,
  month: number,
  dataMaxDay?: number,
  totalCustomers?: number,
): CategoryExplorerData {
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
    const prevMap = hasPrevYear ? aggregateByLevel(filteredPrevRecords, currentLevel) : null
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

      const hourMap = new Map<number, number>()
      for (let h = 0; h < 24; h++) {
        if (hp[h] > 0) hourMap.set(h, hp[h])
      }
      const ct = findCoreTime(hourMap)
      const th = findTurnaroundHour(hourMap)

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
  const showYoYCols = hasPrevYear && showYoY

  return {
    items,
    sortedItems,
    currentLevel,
    levelLabels,
    breadcrumb,
    filter,
    setFilter,
    sortKey,
    sortDir,
    handleSort,
    handleDrill,
    hasPrevYear,
    showYoY,
    setShowYoY,
    pf,
    hf,
    totalAmt,
    totalQty,
    totalPrevAmt,
    totalYoYRatio,
    maxAmt,
    showPi,
    avgPi,
    canDrill,
    showYoYCols,
  }
}
