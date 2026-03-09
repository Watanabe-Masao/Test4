/**
 * useDualPeriodRange — DualPeriodSlider と periodSelectionStore を連動するフック
 *
 * period1, period2 の「日」部分を DualPeriodSlider に渡し、
 * ユーザー操作時に store を更新する。
 *
 * ## 連動ルール
 *
 * - period1 変更: setPeriod1 → プリセット連動で period2 も自動更新される場合あり
 * - period2 変更: setPeriod2 → activePreset が 'custom' に切り替わる
 * - 月跨ぎ: from が対象月より前なら day=1、to が後なら day=月末
 * - 対象月と異なる年月の period の場合もスライダーは日(day)部分のみ制御
 */
import { useState, useCallback } from 'react'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { usePeriodSelectionStore } from '@/application/stores/periodSelectionStore'
import type { DateRange } from '@/domain/models/CalendarDate'

/**
 * DateRange と対象月を突き合わせて、月内の有効日範囲を返す。
 *
 * 月跨ぎ時: from が前月なら 1 日開始、to が翌月なら月末まで。
 */
function periodToDayRange(
  period: DateRange,
  targetYear: number,
  targetMonth: number,
  daysInMonth: number,
): [number, number] {
  const fromYM = period.from.year * 12 + period.from.month
  const targetYM = targetYear * 12 + targetMonth
  const toYM = period.to.year * 12 + period.to.month

  const start = fromYM < targetYM ? 1 : fromYM === targetYM ? period.from.day : 1
  const rawEnd = toYM > targetYM ? daysInMonth : toYM === targetYM ? period.to.day : daysInMonth
  const end = Math.min(rawEnd, daysInMonth)

  return [start, end]
}

/**
 * 日範囲の変更を DateRange に変換する。
 *
 * 元の DateRange の year/month を維持しつつ day だけ更新する。
 */
function dayRangeToDateRange(period: DateRange, newStart: number, newEnd: number): DateRange {
  return {
    from: { ...period.from, day: newStart },
    to: { ...period.to, day: newEnd },
  }
}

export interface DualPeriodRangeResult {
  /** 期間1 開始日 (1-based) */
  p1Start: number
  /** 期間1 終了日 */
  p1End: number
  /** 期間1 変更ハンドラ */
  onP1Change: (start: number, end: number) => void
  /** 期間2 開始日 */
  p2Start: number
  /** 期間2 終了日 */
  p2End: number
  /** 期間2 変更ハンドラ */
  onP2Change: (start: number, end: number) => void
  /** 期間2 有効フラグ */
  p2Enabled: boolean
}

export function useDualPeriodRange(daysInMonth: number): DualPeriodRangeResult {
  const targetYear = useSettingsStore((s) => s.settings.targetYear)
  const targetMonth = useSettingsStore((s) => s.settings.targetMonth)
  const selection = usePeriodSelectionStore((s) => s.selection)
  const setPeriod1 = usePeriodSelectionStore((s) => s.setPeriod1)
  const setPeriod2 = usePeriodSelectionStore((s) => s.setPeriod2)

  const { period1, period2, comparisonEnabled } = selection

  // ── period1 → day range ──

  const [p1DayStart, p1DayEnd] = periodToDayRange(period1, targetYear, targetMonth, daysInMonth)

  const [p1Range, setP1Range] = useState<[number, number]>([p1DayStart, p1DayEnd])
  const [prevPeriod1, setPrevPeriod1] = useState(period1)

  if (period1 !== prevPeriod1) {
    setPrevPeriod1(period1)
    const [newStart, newEnd] = periodToDayRange(period1, targetYear, targetMonth, daysInMonth)
    setP1Range([newStart, newEnd])
  }

  const effectiveP1End = Math.min(p1Range[1], daysInMonth)
  const effectiveP1Start = Math.min(p1Range[0], effectiveP1End)

  // ── period2 → day range ──

  const [p2DayStart, p2DayEnd] = periodToDayRange(
    period2,
    period2.from.year,
    period2.from.month,
    daysInMonth,
  )

  const [p2Range, setP2Range] = useState<[number, number]>([p2DayStart, p2DayEnd])
  const [prevPeriod2, setPrevPeriod2] = useState(period2)

  if (period2 !== prevPeriod2) {
    setPrevPeriod2(period2)
    const [newStart, newEnd] = periodToDayRange(
      period2,
      period2.from.year,
      period2.from.month,
      daysInMonth,
    )
    setP2Range([newStart, newEnd])
  }

  const effectiveP2End = Math.min(p2Range[1], daysInMonth)
  const effectiveP2Start = Math.min(p2Range[0], effectiveP2End)

  // ── ハンドラ ──

  const handleP1Change = useCallback(
    (s: number, e: number) => {
      setP1Range([s, e])
      setPeriod1(dayRangeToDateRange(period1, s, e))
    },
    [period1, setPeriod1],
  )

  const handleP2Change = useCallback(
    (s: number, e: number) => {
      setP2Range([s, e])
      setPeriod2(dayRangeToDateRange(period2, s, e))
    },
    [period2, setPeriod2],
  )

  return {
    p1Start: effectiveP1Start,
    p1End: effectiveP1End,
    onP1Change: handleP1Change,
    p2Start: effectiveP2Start,
    p2End: effectiveP2End,
    onP2Change: handleP2Change,
    p2Enabled: comparisonEnabled,
  }
}
