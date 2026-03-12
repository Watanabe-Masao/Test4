/**
 * useDuckDBTimeSlotData の純粋計算ロジック
 *
 * R11準拠: hook から pure function を分離し、テスト可能にする。
 */
import type { DateRange } from '@/domain/models'
import type { HourlyAggregationRow } from '@/application/hooks/useDuckDBQuery'
import { findCoreTime, findTurnaroundHour } from './timeSlotUtils'
import { formatPercent as toPct } from '@/domain/formatting'

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

export function buildWowRange(range: DateRange): DateRange {
  const fromDate = new Date(range.from.year, range.from.month - 1, range.from.day - 7)
  const toDate = new Date(range.to.year, range.to.month - 1, range.to.day - 7)
  return {
    from: { year: fromDate.getFullYear(), month: fromDate.getMonth() + 1, day: fromDate.getDate() },
    to: { year: toDate.getFullYear(), month: toDate.getMonth() + 1, day: toDate.getDate() },
  }
}

export function toAmountMap(rows: readonly HourlyAggregationRow[]): Map<number, number> {
  const map = new Map<number, number>()
  for (const r of rows) map.set(r.hour, (map.get(r.hour) ?? 0) + r.totalAmount)
  return map
}

export function toQuantityMap(rows: readonly HourlyAggregationRow[]): Map<number, number> {
  const map = new Map<number, number>()
  for (const r of rows) map.set(r.hour, (map.get(r.hour) ?? 0) + r.totalQuantity)
  return map
}

// ── Chart Data + KPI Computation ──

interface ChartKpiInput {
  readonly currentHourly: readonly HourlyAggregationRow[] | null | undefined
  readonly compHourly: readonly HourlyAggregationRow[] | null | undefined
  readonly mode: 'total' | 'daily'
  readonly currentDayCount: number | null | undefined
  readonly compDayCount: number | null | undefined
  readonly hasPrev: boolean
}

export function computeChartDataAndKpi(input: ChartKpiInput): {
  chartData: Record<string, string | number | null>[]
  kpi: TimeSlotKpi | null
} {
  const { currentHourly, compHourly, mode, currentDayCount, compDayCount, hasPrev } = input

  if (!currentHourly || currentHourly.length === 0) return { chartData: [], kpi: null }

  const curAmtMap = toAmountMap(currentHourly)
  const curQtyMap = toQuantityMap(currentHourly)
  const compAmtMap = compHourly ? toAmountMap(compHourly) : new Map<number, number>()
  const compQtyMap = compHourly ? toQuantityMap(compHourly) : new Map<number, number>()

  const curDiv = mode === 'daily' ? Math.max(currentDayCount ?? 1, 1) : 1
  const compDiv = mode === 'daily' ? Math.max(compDayCount ?? 1, 1) : 1

  const allHours = new Set([...curAmtMap.keys(), ...compAmtMap.keys()])
  const hours = [...allHours].sort((a, b) => a - b)

  const chartData: Record<string, string | number | null>[] = hours.map((h) => ({
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
  const coreTimePct = totalAmount > 0 && coreTimeAmt ? toPct(coreTimeAmt.total / totalAmount) : '0%'
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
    chartData,
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
    },
  }
}

// ── YoY Computation ──

export function computeYoYData(
  currentHourly: readonly HourlyAggregationRow[] | null | undefined,
  compHourly: readonly HourlyAggregationRow[] | null | undefined,
): YoYData | null {
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
}

// ── Insights Computation ──

export function computeInsights(
  kpi: TimeSlotKpi | null,
  compHourly: readonly HourlyAggregationRow[] | null | undefined,
  yoyData: YoYData | null,
  compLabel: string,
): string[] {
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
}
