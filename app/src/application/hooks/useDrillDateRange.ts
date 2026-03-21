/**
 * useDrillDateRange — 日付範囲選択からドリルダウン用 DateRange を構築するフック
 *
 * presentation 層での DateRange / PrevYearScope 構築を防ぎ、
 * データ調停の責務を application 層に閉じ込める。
 */
import { useMemo } from 'react'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'

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
    const prevYear = prevYearScope.dateRange.from.year
    return {
      ...prevYearScope,
      dateRange: {
        from: { year: prevYear, month, day: selectedRange.start },
        to: { year: prevYear, month, day: selectedRange.end },
      },
    }
  }, [selectedRange, month, prevYearScope])

  return { dateRange, prevYearScope: drillPrevYearScope }
}
