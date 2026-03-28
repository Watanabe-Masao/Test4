/**
 * prevYearAlignment — 前年→当年の日付整列ユーティリティ
 *
 * MA overlay と日別点数の両方で使われる「前年データを当年の日番号に寄せる」
 * ロジックを一本化する。
 *
 * 方式: 前年系列の先頭日からの経過日数を算出し、当年系列の先頭日に加算する。
 * 同曜日寄せ（dowOffset）は前年の dateRange 構築時に反映済みの前提。
 */
import type { CalendarDate } from '@/domain/models/CalendarDate'

/**
 * 前年の dateKey から当年の日番号を算出する。
 *
 * @param prevDateKey  前年の dateKey（YYYY-MM-DD 形式）
 * @param prevFromDate 前年期間の開始日
 * @param curFromDay   当年期間の開始日番号（通常 1）
 * @returns 当年の日番号（1-based）。範囲外になる可能性があるため呼び出し側で clamp すること。
 */
export function alignPrevYearDay(
  prevDateKey: string,
  prevFromDate: CalendarDate,
  curFromDay: number,
): number {
  const [y, m, d] = prevDateKey.split('-').map(Number)
  const prevDate = new Date(y, m - 1, d)
  const prevFrom = new Date(prevFromDate.year, prevFromDate.month - 1, prevFromDate.day)
  const elapsed = Math.round((prevDate.getTime() - prevFrom.getTime()) / (24 * 60 * 60 * 1000))
  return curFromDay + elapsed
}
