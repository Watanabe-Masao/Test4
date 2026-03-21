/**
 * useDrillDateRange — 日付範囲選択からドリルダウン用 DateRange を構築するフック
 *
 * presentation 層での DateRange / PrevYearScope 構築を防ぎ、
 * データ調停の責務を application 層に閉じ込める。
 *
 * prevYearSameDow プリセット時は dowOffset を適用して前年日付を算出する。
 * Date 演算で月跨ぎを正しく処理する。
 */
import { useMemo } from 'react'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import { DAYS_PER_YEAR, MILLISECONDS_PER_DAY } from '@/domain/constants'

interface SelectedRange {
  readonly start: number
  readonly end: number
}

interface DrillDateRangeResult {
  /** ドリルダウン先の日付範囲（未選択時は null） */
  readonly dateRange: DateRange | null
  /** ドリルダウン先の前年スコープ（前年データなし or 未選択時は undefined） */
  readonly prevYearScope: PrevYearScope | undefined
}

/**
 * 選択された日付範囲（日番号）から DateRange と PrevYearScope を構築する。
 *
 * @param selectedRange - 選択された日番号範囲（null = 未選択）
 * @param year - 当月の年
 * @param month - 当月の月
 * @param prevYearScope - 月全体の前年スコープ（絞り込み元）
 */
export function useDrillDateRange(
  selectedRange: SelectedRange | null,
  year: number,
  month: number,
  prevYearScope: PrevYearScope | undefined,
): DrillDateRangeResult {
  const dateRange = useMemo<DateRange | null>(() => {
    if (selectedRange == null) return null
    return {
      from: { year, month, day: selectedRange.start },
      to: { year, month, day: selectedRange.end },
    }
  }, [selectedRange, year, month])

  const drillPrevYearScope = useMemo<PrevYearScope | undefined>(() => {
    if (selectedRange == null || !prevYearScope) return undefined
    const offset = prevYearScope.dowOffset
    const offsetMs = offset * MILLISECONDS_PER_DAY
    // 当年日付 → -1年 + dowOffset で前年同曜日の日付を算出（Date演算で月跨ぎ対応）
    const fromDate = new Date(year, month - 1, selectedRange.start)
    const toDate = new Date(year, month - 1, selectedRange.end)
    const prevFrom = new Date(fromDate.getTime() - DAYS_PER_YEAR * MILLISECONDS_PER_DAY + offsetMs)
    const prevTo = new Date(toDate.getTime() - DAYS_PER_YEAR * MILLISECONDS_PER_DAY + offsetMs)
    return {
      ...prevYearScope,
      dateRange: {
        from: {
          year: prevFrom.getFullYear(),
          month: prevFrom.getMonth() + 1,
          day: prevFrom.getDate(),
        },
        to: {
          year: prevTo.getFullYear(),
          month: prevTo.getMonth() + 1,
          day: prevTo.getDate(),
        },
      },
    }
  }, [selectedRange, year, month, prevYearScope])

  return { dateRange, prevYearScope: drillPrevYearScope }
}
