/**
 * DuckDB TimeSlotChart のデータロジックフック
 *
 * レガシー useTimeSlotData.ts の全機能を DuckDB SQL クエリで実現:
 * - 時間帯集約（金額/点数）
 * - 前年/前週比較
 * - KPI算出（コアタイム、折り返し時間帯、ピーク等）
 * - YoY比較テーブル
 * - 自動インサイト生成
 * - 階層フィルタ（部門/ライン/クラス）
 */
import { useState, useMemo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import {
  useDuckDBHourlyAggregation,
  useDuckDBDistinctDayCount,
  useDuckDBLevelAggregation,
  type HourlyAggregationRow,
} from '@/application/hooks/useDuckDBQuery'
import { findCoreTime, findTurnaroundHour } from './timeSlotUtils'
import { toPct } from './chartTheme'

// ── Types ──

export type ViewMode = 'chart' | 'kpi' | 'yoy'
export type MetricMode = 'amount' | 'quantity'

export interface TimeSlotKpi {
  readonly totalAmount: number
  readonly totalQuantity: number
  readonly peakHour: number
  readonly peakHourPct: string
  readonly peakHourQty: number
  readonly peakHourQtyPct: string
  readonly coreTimeAmt: ReturnType<typeof findCoreTime>
  readonly coreTimePct: string
  readonly turnaroundAmt: ReturnType<typeof findTurnaroundHour>
  readonly coreTimeQty: ReturnType<typeof findCoreTime>
  readonly coreTimeQtyPct: string
  readonly turnaroundQty: ReturnType<typeof findTurnaroundHour>
  readonly prevTotalAmount: number
  readonly prevTotalQuantity: number
  readonly yoyRatio: number | null
  readonly yoyDiff: number | null
  readonly yoyQuantityRatio: number | null
  readonly yoyQuantityDiff: number | null
  readonly activeHours: number
  readonly avgPerHour: number
  readonly avgQtyPerHour: number
}

export interface YoYRow {
  readonly hour: string
  readonly current: number
  readonly prevYear: number
  readonly diff: number
  readonly ratio: number | null
}

export interface YoYData {
  readonly rows: readonly YoYRow[]
  readonly chartData: readonly YoYRow[]
  readonly summary: {
    readonly curTotal: number
    readonly prevTotal: number
    readonly yoyRatio: number | null
    readonly yoyDiff: number
    readonly maxIncHour: number
    readonly maxIncDiff: number
    readonly maxDecHour: number
    readonly maxDecDiff: number
    readonly curCoreTime: ReturnType<typeof findCoreTime>
    readonly curTurnaround: ReturnType<typeof findTurnaroundHour>
    readonly prevCoreTime: ReturnType<typeof findCoreTime>
    readonly prevTurnaround: ReturnType<typeof findTurnaroundHour>
  }
}

export interface HierarchyOption {
  readonly code: string
  readonly name: string
  readonly amount: number
}

// ── Helpers ──

function buildPrevYearRange(range: DateRange): DateRange {
  return {
    from: { year: range.from.year - 1, month: range.from.month, day: range.from.day },
    to: { year: range.to.year - 1, month: range.to.month, day: range.to.day },
  }
}

function buildWowRange(range: DateRange): DateRange {
  const fromDate = new Date(range.from.year, range.from.month - 1, range.from.day - 7)
  const toDate = new Date(range.to.year, range.to.month - 1, range.to.day - 7)
  return {
    from: { year: fromDate.getFullYear(), month: fromDate.getMonth() + 1, day: fromDate.getDate() },
    to: { year: toDate.getFullYear(), month: toDate.getMonth() + 1, day: toDate.getDate() },
  }
}

function toAmountMap(rows: readonly HourlyAggregationRow[]): Map<number, number> {
  const map = new Map<number, number>()
  for (const r of rows) map.set(r.hour, (map.get(r.hour) ?? 0) + r.totalAmount)
  return map
}

function toQuantityMap(rows: readonly HourlyAggregationRow[]): Map<number, number> {
  const map = new Map<number, number>()
  for (const r of rows) map.set(r.hour, (map.get(r.hour) ?? 0) + r.totalQuantity)
  return map
}

// ── Hook ──

interface Params {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
}

export function useDuckDBTimeSlotData({
  duckConn,
  duckDataVersion,
  currentDateRange,
  selectedStoreIds,
}: Params) {
  const [viewMode, setViewMode] = useState<ViewMode>('chart')
  const [metricMode, setMetricMode] = useState<MetricMode>('amount')
  const [compMode, setCompMode] = useState<'yoy' | 'wow'>('yoy')
  const [showPrev, setShowPrev] = useState(true)
  const [mode, setMode] = useState<'total' | 'daily'>('total')
  const [deptCode, setDeptCode] = useState('')
  const [lineCode, setLineCode] = useState('')
  const [klassCode, setKlassCode] = useState('')

  const hierarchy = useMemo(
    () => ({
      deptCode: deptCode || undefined,
      lineCode: lineCode || undefined,
      klassCode: klassCode || undefined,
    }),
    [deptCode, lineCode, klassCode],
  )

  const prevYearRange = useMemo(() => buildPrevYearRange(currentDateRange), [currentDateRange])
  const wowRange = useMemo(() => buildWowRange(currentDateRange), [currentDateRange])
  const compRange = compMode === 'wow' ? wowRange : prevYearRange
  const compIsPrevYear = compMode === 'yoy'

  // ── DuckDB queries ──

  const { data: currentHourly, error } = useDuckDBHourlyAggregation(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    hierarchy,
    false,
  )
  const { data: compHourly } = useDuckDBHourlyAggregation(
    duckConn,
    duckDataVersion,
    compRange,
    selectedStoreIds,
    hierarchy,
    compIsPrevYear,
  )
  const { data: currentDayCount } = useDuckDBDistinctDayCount(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    false,
  )
  const { data: compDayCount } = useDuckDBDistinctDayCount(
    duckConn,
    duckDataVersion,
    compRange,
    selectedStoreIds,
    compIsPrevYear,
  )

  // Hierarchy dropdowns
  const { data: departments } = useDuckDBLevelAggregation(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    'department',
    undefined,
    false,
  )
  const { data: lines } = useDuckDBLevelAggregation(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    'line',
    deptCode ? { deptCode } : undefined,
    false,
  )
  const { data: klasses } = useDuckDBLevelAggregation(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    'klass',
    deptCode || lineCode
      ? { deptCode: deptCode || undefined, lineCode: lineCode || undefined }
      : undefined,
    false,
  )

  const hasPrev = (compHourly?.length ?? 0) > 0
  const compLabel = compMode === 'wow' ? '前週' : '前年'
  const curLabel = compMode === 'wow' ? '当週' : '当年'

  // ── Chart data + KPI ──

  const { chartData, kpi } = useMemo(() => {
    if (!currentHourly || currentHourly.length === 0)
      return { chartData: [] as Record<string, string | number | null>[], kpi: null }

    const curAmtMap = toAmountMap(currentHourly)
    const curQtyMap = toQuantityMap(currentHourly)
    const compAmtMap = compHourly ? toAmountMap(compHourly) : new Map<number, number>()
    const compQtyMap = compHourly ? toQuantityMap(compHourly) : new Map<number, number>()

    const curDiv = mode === 'daily' ? Math.max(currentDayCount ?? 1, 1) : 1
    const compDiv = mode === 'daily' ? Math.max(compDayCount ?? 1, 1) : 1

    const allHours = new Set([...curAmtMap.keys(), ...compAmtMap.keys()])
    const hours = [...allHours].sort((a, b) => a - b)

    const data: Record<string, string | number | null>[] = hours.map((h) => ({
      hour: `${h}時`,
      amount: Math.round((curAmtMap.get(h) ?? 0) / curDiv),
      quantity: Math.round((curQtyMap.get(h) ?? 0) / curDiv),
      prevAmount: hasPrev ? Math.round((compAmtMap.get(h) ?? 0) / compDiv) : null,
      prevQuantity: hasPrev ? Math.round((compQtyMap.get(h) ?? 0) / compDiv) : null,
    }))

    // Totals (undivided)
    let totalAmount = 0
    let totalQuantity = 0
    for (const r of currentHourly) {
      totalAmount += r.totalAmount
      totalQuantity += r.totalQuantity
    }
    let prevTotalAmount = 0
    let prevTotalQuantity = 0
    if (compHourly) {
      for (const r of compHourly) {
        prevTotalAmount += r.totalAmount
        prevTotalQuantity += r.totalQuantity
      }
    }

    // Peak hour (amount)
    let peakHour = 0,
      peakHourRaw = 0
    for (const [h, v] of curAmtMap) {
      if (v > peakHourRaw) {
        peakHour = h
        peakHourRaw = v
      }
    }
    const peakHourPct = totalAmount > 0 ? toPct(peakHourRaw / totalAmount) : '0%'

    // Peak hour (quantity)
    let peakHourQty = 0,
      peakHourQtyRaw = 0
    for (const [h, v] of curQtyMap) {
      if (v > peakHourQtyRaw) {
        peakHourQty = h
        peakHourQtyRaw = v
      }
    }
    const peakHourQtyPct = totalQuantity > 0 ? toPct(peakHourQtyRaw / totalQuantity) : '0%'

    // Core time & turnaround
    const coreTimeAmt = findCoreTime(curAmtMap)
    const turnaroundAmt = findTurnaroundHour(curAmtMap)
    const coreTimePct =
      totalAmount > 0 && coreTimeAmt ? toPct(coreTimeAmt.total / totalAmount) : '0%'
    const coreTimeQty = findCoreTime(curQtyMap)
    const turnaroundQty = findTurnaroundHour(curQtyMap)
    const coreTimeQtyPct =
      totalQuantity > 0 && coreTimeQty ? toPct(coreTimeQty.total / totalQuantity) : '0%'

    // YoY
    const yoyRatio = prevTotalAmount > 0 ? totalAmount / prevTotalAmount : null
    const yoyDiff = prevTotalAmount > 0 ? totalAmount - prevTotalAmount : null
    const yoyQuantityRatio = prevTotalQuantity > 0 ? totalQuantity / prevTotalQuantity : null
    const yoyQuantityDiff = prevTotalQuantity > 0 ? totalQuantity - prevTotalQuantity : null

    return {
      chartData: data,
      kpi: {
        totalAmount,
        totalQuantity,
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
        prevTotalAmount,
        prevTotalQuantity,
        yoyRatio,
        yoyDiff,
        yoyQuantityRatio,
        yoyQuantityDiff,
        activeHours: curAmtMap.size,
        avgPerHour: curAmtMap.size > 0 ? Math.round(totalAmount / curAmtMap.size) : 0,
        avgQtyPerHour: curQtyMap.size > 0 ? Math.round(totalQuantity / curQtyMap.size) : 0,
      } satisfies TimeSlotKpi,
    }
  }, [currentHourly, compHourly, mode, currentDayCount, compDayCount, hasPrev])

  // ── YoY data ──

  const yoyData = useMemo((): YoYData | null => {
    if (!currentHourly || !compHourly || compHourly.length === 0) return null
    const curMap = toAmountMap(currentHourly)
    const compMap = toAmountMap(compHourly)
    const allHours = new Set([...curMap.keys(), ...compMap.keys()])
    const hours = [...allHours].sort((a, b) => a - b)

    const rows: YoYRow[] = hours.map((h) => {
      const cur = curMap.get(h) ?? 0
      const prv = compMap.get(h) ?? 0
      return {
        hour: `${h}時`,
        current: cur,
        prevYear: prv,
        diff: cur - prv,
        ratio: prv > 0 ? cur / prv : null,
      }
    })

    const curTotal = rows.reduce((s, r) => s + r.current, 0)
    const prevTotal = rows.reduce((s, r) => s + r.prevYear, 0)

    let maxIncHour = -1,
      maxIncDiff = 0,
      maxDecHour = -1,
      maxDecDiff = 0
    for (const r of rows) {
      if (r.diff > maxIncDiff) {
        maxIncDiff = r.diff
        maxIncHour = parseInt(r.hour)
      }
      if (r.diff < maxDecDiff) {
        maxDecDiff = r.diff
        maxDecHour = parseInt(r.hour)
      }
    }

    return {
      rows,
      chartData: rows,
      summary: {
        curTotal,
        prevTotal,
        yoyRatio: prevTotal > 0 ? curTotal / prevTotal : null,
        yoyDiff: curTotal - prevTotal,
        maxIncHour,
        maxIncDiff,
        maxDecHour,
        maxDecDiff,
        curCoreTime: findCoreTime(curMap),
        curTurnaround: findTurnaroundHour(curMap),
        prevCoreTime: findCoreTime(compMap),
        prevTurnaround: findTurnaroundHour(compMap),
      },
    }
  }, [currentHourly, compHourly])

  // ── Insights ──

  const insights = useMemo(() => {
    if (!kpi) return []
    const lines: string[] = []

    if (compHourly && compHourly.length > 0) {
      const prevMap = toAmountMap(compHourly)
      let prevPeakHour = 0,
        prevPeakAmt = 0
      for (const [h, v] of prevMap) {
        if (v > prevPeakAmt) {
          prevPeakHour = h
          prevPeakAmt = v
        }
      }
      const shift = kpi.peakHour - prevPeakHour
      if (Math.abs(shift) >= 2) {
        lines.push(
          `ピーク時間帯が${compLabel}${prevPeakHour}時台→${kpi.peakHour}時台に${Math.abs(shift)}時間${shift > 0 ? '後方' : '前方'}シフト`,
        )
      }
    }

    if (yoyData?.summary.curCoreTime && yoyData?.summary.prevCoreTime) {
      const cur = yoyData.summary.curCoreTime
      const prev = yoyData.summary.prevCoreTime
      if (cur.startHour !== prev.startHour || cur.endHour !== prev.endHour) {
        lines.push(
          `コアタイムが${prev.startHour}〜${prev.endHour}時→${cur.startHour}〜${cur.endHour}時に変化`,
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
  }, [kpi, compHourly, yoyData, compLabel])

  // ── Hierarchy helpers ──

  const deptOptions: HierarchyOption[] = useMemo(
    () => departments?.map((d) => ({ code: d.code, name: d.name, amount: d.amount })) ?? [],
    [departments],
  )
  const lineOptions: HierarchyOption[] = useMemo(
    () => lines?.map((l) => ({ code: l.code, name: l.name, amount: l.amount })) ?? [],
    [lines],
  )
  const klassOptions: HierarchyOption[] = useMemo(
    () => klasses?.map((k) => ({ code: k.code, name: k.name, amount: k.amount })) ?? [],
    [klasses],
  )

  const wrappedSetDept = (code: string) => {
    setDeptCode(code)
    setLineCode('')
    setKlassCode('')
  }
  const wrappedSetLine = (code: string) => {
    setLineCode(code)
    setKlassCode('')
  }

  return {
    chartData,
    kpi,
    yoyData,
    insights,
    error,
    viewMode,
    setViewMode,
    metricMode,
    setMetricMode,
    compMode,
    setCompMode,
    showPrev,
    setShowPrev,
    mode,
    setMode,
    hasPrev,
    compLabel,
    curLabel,
    deptCode,
    lineCode,
    klassCode,
    setDeptCode: wrappedSetDept,
    setLineCode: wrappedSetLine,
    setKlassCode: setKlassCode,
    deptOptions,
    lineOptions,
    klassOptions,
  }
}
