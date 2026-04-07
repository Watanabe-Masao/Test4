/**
 * useDayRange フック（DayRangeSlider から分離）
 *
 * 日付範囲のstate管理フック（取込データ有効期間に自動連動）
 *
 * react-refresh/only-export-components 対応のため、
 * コンポーネントとフックを別ファイルに分離。
 * @responsibility R:state-machine
 */
import { useState, useCallback } from 'react'
import { useSettingsStore } from '@/application/stores/settingsStore'

export function useDayRange(daysInMonth: number): [number, number, (s: number, e: number) => void] {
  const dataEndDay = useSettingsStore((s) => s.settings.dataEndDay)

  const defaultEnd = dataEndDay != null ? Math.min(dataEndDay, daysInMonth) : daysInMonth
  const [range, setRange] = useState<[number, number]>([1, defaultEnd])
  const [prevDataEndDay, setPrevDataEndDay] = useState(dataEndDay)

  // 取込データ有効期間が変わったらリセット
  if (dataEndDay !== prevDataEndDay) {
    setPrevDataEndDay(dataEndDay)
    const newEnd = dataEndDay != null ? Math.min(dataEndDay, daysInMonth) : daysInMonth
    setRange([1, newEnd])
  }

  const effectiveEnd = Math.min(range[1], daysInMonth)
  const effectiveStart = Math.min(range[0], effectiveEnd)

  const handleChange = useCallback((s: number, e: number) => {
    setRange([s, e])
  }, [])

  return [effectiveStart, effectiveEnd, handleChange]
}
