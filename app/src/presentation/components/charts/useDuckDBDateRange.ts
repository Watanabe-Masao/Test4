/**
 * useDuckDBDateRange フック（DuckDBDateRangePicker から分離）
 *
 * DuckDB 分析用日付範囲を管理するフック。
 *
 * デフォルトは当月全日。ユーザーが自由に変更できる。
 * year/month が変わったら当月全日にリセットする。
 *
 * react-refresh/only-export-components 対応のため、
 * コンポーネントとフックを別ファイルに分離。
 */
import { useState, useCallback, useMemo } from 'react'
import type { DateRange } from '@/domain/models'

export function useDuckDBDateRange(
  year: number,
  month: number,
  daysInMonth: number,
): [DateRange, (range: DateRange) => void] {
  // year/month をキーとして追跡し、変更時にリセット
  const [trackedKey, setTrackedKey] = useState(`${year}-${month}`)

  const defaultRange = useMemo<DateRange>(
    () => ({ from: { year, month, day: 1 }, to: { year, month, day: daysInMonth } }),
    [year, month, daysInMonth],
  )

  const [range, setRange] = useState<DateRange>(defaultRange)

  const yearMonthKey = `${year}-${month}`
  if (yearMonthKey !== trackedKey) {
    setTrackedKey(yearMonthKey)
    setRange(defaultRange)
  }

  const handleChange = useCallback((newRange: DateRange) => {
    setRange(newRange)
  }, [])

  return [range, handleChange]
}
