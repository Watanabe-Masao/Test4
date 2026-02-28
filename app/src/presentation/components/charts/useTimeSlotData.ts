/**
 * TimeSlotSalesChart のデータロジックフック
 *
 * 時間帯集約、期間比較、チャートデータ構築、KPI計算、
 * YoYデータ、インサイト生成を一括して管理する。
 */
import { useMemo } from 'react'
import type { CategoryTimeSalesRecord, CategoryTimeSalesIndex, DateRange } from '@/domain/models'
import { useCategoryHierarchy, filterByHierarchy } from './categoryHierarchyHooks'
import { useHierarchyDropdown } from './periodFilterHooks'
import type { usePeriodFilter } from './periodFilterHooks'
import {
  computeDivisor,
  countDistinctDays,
  filterByStore,
  type AggregateMode,
} from './periodFilterUtils'
import { queryByDateRange } from '@/application/usecases'
import { findCoreTime, findTurnaroundHour } from './timeSlotUtils'
import { toPct } from './chartTheme'

// ── Types ──

export type ViewMode = 'chart' | 'kpi' | 'yoy'
export type MetricMode = 'amount' | 'quantity'

interface AggregationResult {
  hourly: Map<number, { amount: number; quantity: number }>
  totalAmount: number
  totalQuantity: number
  recordCount: number
  divisor: number
}

export interface TimeSlotKpi {
  totalAmount: number
  totalQuantity: number
  peakHour: number
  peakHourPct: string
  peakHourQty: number
  peakHourQtyPct: string
  coreTimeAmt: ReturnType<typeof findCoreTime>
  coreTimePct: string
  turnaroundAmt: ReturnType<typeof findTurnaroundHour>
  coreTimeQty: ReturnType<typeof findCoreTime>
  coreTimeQtyPct: string
  turnaroundQty: ReturnType<typeof findTurnaroundHour>
  recordCount: number
  prevTotalAmount: number
  prevTotalQuantity: number
  yoyRatio: number | null
  yoyDiff: number | null
  yoyQuantityRatio: number | null
  yoyQuantityDiff: number | null
  activeHours: number
  avgPerHour: number
  avgQtyPerHour: number
}

export interface YoYRow {
  hour: string
  current: number
  prevYear: number
  diff: number
  ratio: number | null
}

export interface YoYData {
  rows: YoYRow[]
  chartData: YoYRow[]
  summary: {
    curTotal: number
    prevTotal: number
    yoyRatio: number | null
    yoyDiff: number
    maxIncHour: number
    maxIncDiff: number
    maxDecHour: number
    maxDecDiff: number
    curCoreTime: ReturnType<typeof findCoreTime>
    curTurnaround: ReturnType<typeof findTurnaroundHour>
    prevCoreTime: ReturnType<typeof findCoreTime>
    prevTurnaround: ReturnType<typeof findTurnaroundHour>
  }
}

// ── Aggregation ──

/**
 * 時間帯別の集計結果を計算する共通関数。
 *
 * カレンダーベースの日数ではなく、実際にデータが存在する
 * distinct day 数をカウントして除数とする。
 */
function aggregateHourly(
  records: readonly CategoryTimeSalesRecord[],
  selectedStoreIds: ReadonlySet<string>,
  filter: ReturnType<typeof useCategoryHierarchy>['filter'],
  hf: ReturnType<typeof useHierarchyDropdown>,
  mode: AggregateMode,
): AggregationResult {
  const hourly = new Map<number, { amount: number; quantity: number }>()
  const storeFiltered = filterByStore(
    hf.applyFilter(filterByHierarchy(records, filter)),
    selectedStoreIds,
  )

  let totalAmount = 0
  let totalQuantity = 0
  for (const rec of storeFiltered) {
    totalAmount += rec.totalAmount
    totalQuantity += rec.totalQuantity
    for (const slot of rec.timeSlots) {
      const existing = hourly.get(slot.hour) ?? { amount: 0, quantity: 0 }
      hourly.set(slot.hour, {
        amount: existing.amount + slot.amount,
        quantity: existing.quantity + slot.quantity,
      })
    }
  }

  const div = computeDivisor(countDistinctDays(storeFiltered), mode)
  const result = new Map<number, { amount: number; quantity: number }>()
  for (const [h, v] of hourly) {
    result.set(h, { amount: Math.round(v.amount / div), quantity: Math.round(v.quantity / div) })
  }

  return {
    hourly: result,
    totalAmount,
    totalQuantity,
    recordCount: storeFiltered.length,
    divisor: div,
  }
}

// ── Hook ──

interface UseTimeSlotDataParams {
  ctsIndex: CategoryTimeSalesIndex
  prevCtsIndex: CategoryTimeSalesIndex
  selectedStoreIds: ReadonlySet<string>
  year: number
  month: number
  pf: ReturnType<typeof usePeriodFilter>
  compMode: 'yoy' | 'wow'
}

export function useTimeSlotData({
  ctsIndex,
  prevCtsIndex,
  selectedStoreIds,
  year,
  month,
  pf,
  compMode,
}: UseTimeSlotDataParams) {
  const { filter } = useCategoryHierarchy()

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

  // WoW: 前週期間 (dayRange を -7 日シフト)
  const wowPrevStart = pf.dayRange[0] - 7
  const wowPrevEnd = pf.dayRange[1] - 7
  const canWoW = wowPrevStart >= 1
  const activeCompMode = compMode === 'wow' && !canWoW ? ('yoy' as const) : compMode

  const prevPeriodRecords = useMemo(() => {
    if (activeCompMode === 'wow') {
      const wowRange: DateRange = {
        from: { year, month, day: wowPrevStart },
        to: { year, month, day: wowPrevEnd },
      }
      return queryByDateRange(ctsIndex, { dateRange: wowRange, storeIds: selectedStoreIds })
    }
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
  }, [
    activeCompMode,
    ctsIndex,
    prevCtsIndex,
    selectedStoreIds,
    year,
    month,
    pf.dayRange,
    wowPrevStart,
    wowPrevEnd,
    dowFilter,
  ])

  const hf = useHierarchyDropdown(periodRecords, selectedStoreIds)

  const hasPrevYear = prevPeriodRecords.length > 0
  const prevLbl = activeCompMode === 'wow' ? '前週' : '前年'
  const curLbl = activeCompMode === 'wow' ? '当週' : '当年'

  const prevDaySet = useMemo(
    () => new Set(prevPeriodRecords.map((r) => r.day)),
    [prevPeriodRecords],
  )
  const comparablePeriodRecords = useMemo(() => {
    if (!hasPrevYear) return periodRecords
    if (activeCompMode === 'wow') return periodRecords
    return periodRecords.filter((r) => prevDaySet.has(r.day))
  }, [periodRecords, prevDaySet, hasPrevYear, activeCompMode])

  const current = useMemo(
    () => aggregateHourly(periodRecords, selectedStoreIds, filter, hf, pf.mode),
    [periodRecords, selectedStoreIds, filter, hf, pf.mode],
  )
  const comparable = useMemo(
    () =>
      hasPrevYear
        ? aggregateHourly(comparablePeriodRecords, selectedStoreIds, filter, hf, pf.mode)
        : null,
    [comparablePeriodRecords, selectedStoreIds, filter, hf, pf.mode, hasPrevYear],
  )
  const prev = useMemo(
    () =>
      hasPrevYear
        ? aggregateHourly(prevPeriodRecords, selectedStoreIds, filter, hf, pf.mode)
        : null,
    [prevPeriodRecords, selectedStoreIds, filter, hf, pf.mode, hasPrevYear],
  )

  const { chartData, kpi } = useMemo(() => {
    const chartData: Record<string, string | number | null>[] = []
    for (let h = 0; h < 24; h++) {
      const cur = current.hourly.get(h)
      const prv = prev?.hourly.get(h)
      if (cur || prv) {
        chartData.push({
          hour: `${h}時`,
          amount: cur?.amount ?? 0,
          quantity: cur?.quantity ?? 0,
          prevAmount: prv?.amount ?? null,
          prevQuantity: prv?.quantity ?? null,
        })
      }
    }

    const curDiv = current.divisor
    let peakHour = 0,
      peakHourAmount = 0
    for (const [h, v] of current.hourly) {
      if (v.amount > peakHourAmount) {
        peakHour = h
        peakHourAmount = v.amount * curDiv
      }
    }
    const totalAmount = current.totalAmount
    const peakHourPct = totalAmount > 0 ? toPct(peakHourAmount / totalAmount) : '0%'

    const comparableTotalAmount = comparable?.totalAmount ?? 0
    const prevTotalAmount = prev?.totalAmount ?? 0
    const yoyRatio = prevTotalAmount > 0 ? comparableTotalAmount / prevTotalAmount : null
    const yoyDiff = prevTotalAmount > 0 ? comparableTotalAmount - prevTotalAmount : null

    const comparableTotalQuantity = comparable?.totalQuantity ?? 0
    const prevTotalQuantity = prev?.totalQuantity ?? 0
    const yoyQuantityRatio =
      prevTotalQuantity > 0 ? comparableTotalQuantity / prevTotalQuantity : null
    const yoyQuantityDiff =
      prevTotalQuantity > 0 ? comparableTotalQuantity - prevTotalQuantity : null

    let peakHourQty = 0,
      peakHourQuantity = 0
    for (const [h, v] of current.hourly) {
      if (v.quantity > peakHourQuantity) {
        peakHourQty = h
        peakHourQuantity = v.quantity * curDiv
      }
    }
    const peakHourQtyPct =
      current.totalQuantity > 0 ? toPct(peakHourQuantity / current.totalQuantity) : '0%'

    const amountMap = new Map<number, number>()
    for (const [h, v] of current.hourly) amountMap.set(h, v.amount * curDiv)
    const coreTimeAmt = findCoreTime(amountMap)
    const turnaroundAmt = findTurnaroundHour(amountMap)
    const coreTimePct =
      totalAmount > 0 && coreTimeAmt ? toPct(coreTimeAmt.total / totalAmount) : '0%'

    const qtyMap = new Map<number, number>()
    for (const [h, v] of current.hourly) qtyMap.set(h, v.quantity * curDiv)
    const coreTimeQty = findCoreTime(qtyMap)
    const turnaroundQty = findTurnaroundHour(qtyMap)
    const coreTimeQtyPct =
      current.totalQuantity > 0 && coreTimeQty
        ? toPct(coreTimeQty.total / current.totalQuantity)
        : '0%'

    return {
      chartData,
      kpi:
        current.recordCount > 0
          ? ({
              totalAmount,
              totalQuantity: current.totalQuantity,
              peakHour,
              peakHourPct,
              peakHourQty,
              peakHourQtyPct,
              coreTimeAmt,
              coreTimePct,
              turnaroundAmt,
              coreTimeQty,
              coreTimeQtyPct,
              turnaroundQty,
              recordCount: current.recordCount,
              prevTotalAmount,
              prevTotalQuantity,
              yoyRatio,
              yoyDiff,
              yoyQuantityRatio,
              yoyQuantityDiff,
              activeHours: current.hourly.size,
              avgPerHour:
                current.hourly.size > 0 ? Math.round(totalAmount / current.hourly.size) : 0,
              avgQtyPerHour:
                current.hourly.size > 0
                  ? Math.round(current.totalQuantity / current.hourly.size)
                  : 0,
            } satisfies TimeSlotKpi)
          : null,
    }
  }, [current, comparable, prev])

  const yoyData = useMemo((): YoYData | null => {
    if (!comparable || !prev) return null

    const allHours = new Set([...comparable.hourly.keys(), ...prev.hourly.keys()])
    const hours = [...allHours].sort((a, b) => a - b)

    const rows: YoYRow[] = hours.map((h) => {
      const cur = comparable.hourly.get(h)?.amount ?? 0
      const prv = prev.hourly.get(h)?.amount ?? 0
      const diff = cur - prv
      const ratio = prv > 0 ? cur / prv : null
      return { hour: `${h}時`, current: cur, prevYear: prv, diff, ratio }
    })

    const curTotal = comparable.totalAmount
    const prevTotal = prev.totalAmount
    const yoyRatio = prevTotal > 0 ? curTotal / prevTotal : null
    const yoyDiff = curTotal - prevTotal

    let maxIncHour = -1,
      maxIncDiff = 0
    let maxDecHour = -1,
      maxDecDiff = 0
    for (const d of rows) {
      if (d.diff > maxIncDiff) {
        maxIncDiff = d.diff
        maxIncHour = parseInt(d.hour)
      }
      if (d.diff < maxDecDiff) {
        maxDecDiff = d.diff
        maxDecHour = parseInt(d.hour)
      }
    }

    const curHourlyRaw = new Map<number, number>()
    const prevHourlyRaw = new Map<number, number>()
    for (const [h, v] of comparable.hourly) curHourlyRaw.set(h, v.amount * comparable.divisor)
    for (const [h, v] of prev.hourly) prevHourlyRaw.set(h, v.amount * prev.divisor)

    return {
      rows,
      chartData: rows,
      summary: {
        curTotal,
        prevTotal,
        yoyRatio,
        yoyDiff,
        maxIncHour,
        maxIncDiff,
        maxDecHour,
        maxDecDiff,
        curCoreTime: findCoreTime(curHourlyRaw),
        curTurnaround: findTurnaroundHour(curHourlyRaw),
        prevCoreTime: findCoreTime(prevHourlyRaw),
        prevTurnaround: findTurnaroundHour(prevHourlyRaw),
      },
    }
  }, [comparable, prev])

  const insights = useMemo(() => {
    if (!kpi) return []
    const lines: string[] = []

    if (prev) {
      let prevPeakHour = 0,
        prevPeakAmt = 0
      for (const [h, v] of prev.hourly) {
        if (v.amount > prevPeakAmt) {
          prevPeakHour = h
          prevPeakAmt = v.amount
        }
      }
      const shift = kpi.peakHour - prevPeakHour
      if (Math.abs(shift) >= 2) {
        lines.push(
          `ピーク時間帯が${prevLbl}${prevPeakHour}時台→${kpi.peakHour}時台に${Math.abs(shift)}時間${shift > 0 ? '後方' : '前方'}シフト`,
        )
      }
    }

    if (yoyData?.summary.curCoreTime && yoyData?.summary.prevCoreTime) {
      const curCt = yoyData.summary.curCoreTime
      const prevCt = yoyData.summary.prevCoreTime
      if (curCt.startHour !== prevCt.startHour || curCt.endHour !== prevCt.endHour) {
        lines.push(
          `コアタイムが${prevCt.startHour}〜${prevCt.endHour}時→${curCt.startHour}〜${curCt.endHour}時に変化`,
        )
      }
    }

    if (kpi.totalAmount > 0 && kpi.coreTimeAmt) {
      const corePct = kpi.coreTimeAmt.total / kpi.totalAmount
      if (corePct > 0.6) {
        lines.push(`コアタイム3時間で全体の${toPct(corePct)}を占める高集中パターン`)
      }
    }

    if (yoyData?.summary.curTurnaround != null && yoyData?.summary.prevTurnaround != null) {
      const tShift = yoyData.summary.curTurnaround - yoyData.summary.prevTurnaround
      if (tShift !== 0) {
        lines.push(
          `売上50%到達が${yoyData.summary.prevTurnaround}時→${yoyData.summary.curTurnaround}時に${tShift > 0 ? '後方' : '前方'}シフト（需要の${tShift > 0 ? '後ろ倒し' : '前倒し'}傾向）`,
        )
      }
    }

    return lines
  }, [kpi, prev, yoyData, prevLbl])

  return {
    chartData,
    kpi,
    yoyData,
    insights,
    hasPrevYear,
    prevLbl,
    curLbl,
    canWoW,
    activeCompMode,
    hf,
    pf,
  }
}
