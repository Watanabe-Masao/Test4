/**
 * DateRange の月別分割ユーティリティ
 *
 * CalendarDate.ts から分離。月跨ぎの日付範囲を月ごとのチャンクに分割する。
 *
 * @responsibility R:unclassified
 */
import type { CalendarDate } from './CalendarDate'

/** 月別の日リスト（splitDateRangeByMonth の出力単位） */
export interface MonthDayChunk {
  readonly year: number
  readonly month: number
  readonly days: readonly number[]
}

/**
 * DateRange を月別の日リストに分割する。
 *
 * loadEtrnHourlyForStore 等の単月 API に渡すため、
 * 月跨ぎの日付範囲を月ごとのチャンクに分割する。
 *
 * @example
 * // 同月
 * splitDateRangeByMonth({2026,3,1}, {2026,3,15})
 * // → [{year:2026, month:3, days:[1..15]}]
 *
 * // 月跨ぎ
 * splitDateRangeByMonth({2026,1,29}, {2026,2,3})
 * // → [{year:2026, month:1, days:[29,30,31]}, {year:2026, month:2, days:[1,2,3]}]
 */
export function splitDateRangeByMonth(
  from: CalendarDate,
  to: CalendarDate,
): readonly MonthDayChunk[] {
  const chunks: MonthDayChunk[] = []

  let curYear = from.year
  let curMonth = from.month
  let curDay = from.day

  while (
    curYear < to.year ||
    (curYear === to.year && curMonth < to.month) ||
    (curYear === to.year && curMonth === to.month && curDay <= to.day)
  ) {
    const lastDayOfMonth = new Date(curYear, curMonth, 0).getDate()
    const endDay = curYear === to.year && curMonth === to.month ? to.day : lastDayOfMonth

    const days: number[] = []
    for (let d = curDay; d <= endDay; d++) days.push(d)

    if (days.length > 0) {
      chunks.push({ year: curYear, month: curMonth, days })
    }

    // 次の月の1日へ
    curMonth++
    if (curMonth > 12) {
      curMonth = 1
      curYear++
    }
    curDay = 1
  }

  return chunks
}
