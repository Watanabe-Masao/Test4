/**
 * 実日法による曜日ギャップ分析
 *
 * 同日マッピング (offset=0) と同曜日マッピング (offset=N) を前年日付集合の差分で
 * 突き合わせ、境界シフトを検出する。
 *
 * ## 計算式
 *
 * estimatedImpact = Σ(shiftedIn の prevSales) - Σ(shiftedOut の prevSales)
 * customerImpact = Σ(shiftedIn の prevCustomers) - Σ(shiftedOut の prevCustomers)
 */

import type { ActualDayImpact, ShiftedDay } from '@/domain/models/ComparisonContext'

const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const

/** 実日法マッピング行の最小型 */
interface ActualDayMappingRow {
  readonly currentDay: number
  readonly prevDay: number
  readonly prevMonth: number
  readonly prevYear: number
  readonly prevSales: number
  readonly prevCustomers?: number
}

/**
 * 実日法による曜日ギャップ分析を実行する
 *
 * @param sameDateMapping 同日マッピングの日別データ
 * @param sameDowMapping  同曜日マッピングの日別データ
 * @param _prevYear  前年（API互換用）
 * @param _prevMonth 前年月（API互換用）
 * @param currentYear  当年（shiftedIn の曜日算出用）
 * @param currentMonth 当月（shiftedIn の曜日算出用）
 */
export function analyzeDowGapActualDay(
  sameDateMapping: readonly ActualDayMappingRow[],
  sameDowMapping: readonly ActualDayMappingRow[],
  _prevYear: number,
  _prevMonth: number,
  currentYear: number,
  currentMonth: number,
): ActualDayImpact {
  if (sameDateMapping.length === 0 || sameDowMapping.length === 0) {
    return ZERO_ACTUAL_DAY_IMPACT
  }

  type PrevDateKey = string
  const makePrevKey = (y: number, m: number, d: number): PrevDateKey => `${y}-${m}-${d}`

  const sameDatePrevDates = new Map<
    PrevDateKey,
    {
      prevDay: number
      prevMonth: number
      prevYear: number
      prevSales: number
      prevCustomers: number
    }
  >()
  for (const r of sameDateMapping) {
    sameDatePrevDates.set(makePrevKey(r.prevYear, r.prevMonth, r.prevDay), {
      prevDay: r.prevDay,
      prevMonth: r.prevMonth,
      prevYear: r.prevYear,
      prevSales: r.prevSales,
      prevCustomers: r.prevCustomers ?? 0,
    })
  }

  const sameDowPrevDates = new Map<
    PrevDateKey,
    {
      prevDay: number
      prevMonth: number
      prevYear: number
      prevSales: number
      prevCustomers: number
      currentDay: number
    }
  >()
  for (const r of sameDowMapping) {
    sameDowPrevDates.set(makePrevKey(r.prevYear, r.prevMonth, r.prevDay), {
      prevDay: r.prevDay,
      prevMonth: r.prevMonth,
      prevYear: r.prevYear,
      prevSales: r.prevSales,
      prevCustomers: r.prevCustomers ?? 0,
      currentDay: r.currentDay,
    })
  }

  const shiftedIn: ShiftedDay[] = []
  const shiftedOut: ShiftedDay[] = []

  // B \ A: sameDow にあるが sameDate にない前年日
  for (const [key, entry] of sameDowPrevDates) {
    if (!sameDatePrevDates.has(key)) {
      const inDow = new Date(currentYear, currentMonth - 1, entry.currentDay).getDay()
      shiftedIn.push({
        prevDay: entry.prevDay,
        prevMonth: entry.prevMonth,
        prevYear: entry.prevYear,
        dow: inDow,
        label: DOW_LABELS[inDow],
        prevSales: entry.prevSales,
        prevCustomers: entry.prevCustomers,
      })
    }
  }

  // A \ B: sameDate にあるが sameDow にない前年日
  for (const [key, entry] of sameDatePrevDates) {
    if (!sameDowPrevDates.has(key)) {
      const outDow = new Date(entry.prevYear, entry.prevMonth - 1, entry.prevDay).getDay()
      shiftedOut.push({
        prevDay: entry.prevDay,
        prevMonth: entry.prevMonth,
        prevYear: entry.prevYear,
        dow: outDow,
        label: DOW_LABELS[outDow],
        prevSales: entry.prevSales,
        prevCustomers: entry.prevCustomers,
      })
    }
  }

  shiftedIn.sort((a, b) => a.prevMonth - b.prevMonth || a.prevDay - b.prevDay)
  shiftedOut.sort((a, b) => a.prevMonth - b.prevMonth || a.prevDay - b.prevDay)

  const gainedSales = shiftedIn.reduce((s, d) => s + d.prevSales, 0)
  const lostSales = shiftedOut.reduce((s, d) => s + d.prevSales, 0)
  const gainedCustomers = shiftedIn.reduce((s, d) => s + d.prevCustomers, 0)
  const lostCustomers = shiftedOut.reduce((s, d) => s + d.prevCustomers, 0)

  return {
    estimatedImpact: gainedSales - lostSales,
    customerImpact: gainedCustomers - lostCustomers,
    shiftedIn,
    shiftedOut,
    isValid: shiftedIn.length > 0 || shiftedOut.length > 0,
  }
}

/** ゼロ値の ActualDayImpact */
export const ZERO_ACTUAL_DAY_IMPACT: ActualDayImpact = {
  estimatedImpact: 0,
  customerImpact: 0,
  shiftedIn: [],
  shiftedOut: [],
  isValid: false,
}
