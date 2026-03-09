/**
 * useDayRange フック（DayRangeSlider から分離）
 *
 * 日付範囲のstate管理フック（periodSelection に連動）
 *
 * react-refresh/only-export-components 対応のため、
 * コンポーネントとフックを別ファイルに分離。
 *
 * ## 連動ルール
 *
 * - periodSelection.period1 が変更されたら、from.day 〜 to.day にスライダーを自動同期
 * - 月跨ぎの場合: from が対象月より前なら day 1 開始、to が対象月より後なら月末まで
 * - dataEndDay によるキャップは行わない（カレンダーが唯一の範囲指定元）
 * - ユーザーがスライダーを手動操作した場合はその値を優先
 */
import { useState, useCallback } from 'react'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { usePeriodSelectionStore } from '@/application/stores/periodSelectionStore'

/**
 * period1 と対象月(targetYear/targetMonth) を突き合わせて、
 * 対象月内の有効日範囲を算出する。
 *
 * 月跨ぎ時: from が前月なら 1日開始、to が翌月なら月末まで。
 */
function periodToDayRange(
  period1: {
    from: { year: number; month: number; day: number }
    to: { year: number; month: number; day: number }
  },
  targetYear: number,
  targetMonth: number,
  daysInMonth: number,
): [number, number] {
  const fromYM = period1.from.year * 12 + period1.from.month
  const targetYM = targetYear * 12 + targetMonth
  const toYM = period1.to.year * 12 + period1.to.month

  const start = fromYM < targetYM ? 1 : fromYM === targetYM ? period1.from.day : 1
  const rawEnd = toYM > targetYM ? daysInMonth : toYM === targetYM ? period1.to.day : daysInMonth
  const end = Math.min(rawEnd, daysInMonth)

  return [start, end]
}

export function useDayRange(daysInMonth: number): [number, number, (s: number, e: number) => void] {
  const targetYear = useSettingsStore((s) => s.settings.targetYear)
  const targetMonth = useSettingsStore((s) => s.settings.targetMonth)
  const period1 = usePeriodSelectionStore((s) => s.selection.period1)

  const [p1Start, p1End] = periodToDayRange(period1, targetYear, targetMonth, daysInMonth)

  const [range, setRange] = useState<[number, number]>([p1Start, p1End])

  // period1 が変わったらリセット
  const [prevPeriod1, setPrevPeriod1] = useState(period1)

  if (period1 !== prevPeriod1) {
    setPrevPeriod1(period1)
    const [newStart, newEnd] = periodToDayRange(period1, targetYear, targetMonth, daysInMonth)
    setRange([newStart, newEnd])
  }

  const effectiveEnd = Math.min(range[1], daysInMonth)
  const effectiveStart = Math.min(range[0], effectiveEnd)

  const handleChange = useCallback((s: number, e: number) => {
    setRange([s, e])
  }, [])

  return [effectiveStart, effectiveEnd, handleChange]
}
