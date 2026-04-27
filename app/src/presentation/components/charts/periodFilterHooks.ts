/**
 * PeriodFilter フック（PeriodFilter.tsx から分離）
 *
 * react-refresh/only-export-components 対応のため、
 * コンポーネント（PeriodFilterBar, HierarchyDropdowns）とフックを別ファイルに分離。
 *
 * @see PeriodFilter.tsx — 設計ルール (RULE-1〜RULE-6) の詳細
 * @see periodFilterUtils.ts — 純粋関数群
 * @see divisorRules.test.ts — アーキテクチャガードテスト
 * @responsibility R:unclassified
 */
import { useState, useCallback } from 'react'
import type { CategoryLeafDailyEntry } from '@/application/hooks/categoryLeafDaily/CategoryLeafDailyBundle.types'
import type { AggregateMode } from './periodFilterUtils'

export type { AggregateMode } from './periodFilterUtils'

export interface PeriodFilterState {
  /** 対象日範囲 [from, to] */
  dayRange: [number, number]
  /** 集計モード: total=期間合計, dailyAvg=期間内日平均, dowAvg=曜日別平均 */
  mode: AggregateMode
  /** dowAvg 時に対象とする曜日 (0=日〜6=土)。空=全曜日 */
  selectedDows: ReadonlySet<number>
}

export interface PeriodFilterResult extends PeriodFilterState {
  setDayRange: (range: [number, number]) => void
  setMode: (mode: AggregateMode) => void
  toggleDow: (dow: number) => void
  /** 期間 + 曜日でフィルタ済みレコードを返す */
  filterRecords: (records: readonly CategoryLeafDailyEntry[]) => readonly CategoryLeafDailyEntry[]
  /** year/month (曜日計算用) */
  year: number
  month: number
  /** データ末日に基づくデフォルト終了日（リセット用） */
  defaultEndDay: number
  /** デフォルト範囲にリセット */
  resetToDefault: () => void
}

/**
 * @param daysInMonth 月の日数
 * @param year 年
 * @param month 月
 * @param dataMaxDay データが存在する最大日（0 = 未検出）。変化時に自動リセット。
 */
export function usePeriodFilter(
  daysInMonth: number,
  year: number,
  month: number,
  dataMaxDay?: number,
): PeriodFilterResult {
  const effectiveEnd =
    dataMaxDay && dataMaxDay > 0 ? Math.min(dataMaxDay, daysInMonth) : daysInMonth
  const [dayRange, setDayRange] = useState<[number, number]>([1, effectiveEnd])
  const [mode, setMode] = useState<AggregateMode>('total')
  const [selectedDows, setSelectedDows] = useState<ReadonlySet<number>>(new Set<number>())

  // dataMaxDay 変化時（ファイル取込など）に自動リセット。
  // state に前回値を保持し、レンダー中に比較→リセット（React推奨パターン）。
  const [prevDataMaxDay, setPrevDataMaxDay] = useState(dataMaxDay)
  if (prevDataMaxDay !== dataMaxDay) {
    setPrevDataMaxDay(dataMaxDay)
    const newEnd = dataMaxDay && dataMaxDay > 0 ? Math.min(dataMaxDay, daysInMonth) : daysInMonth
    setDayRange([1, newEnd])
  }

  const resetToDefault = useCallback(() => {
    const end = dataMaxDay && dataMaxDay > 0 ? Math.min(dataMaxDay, daysInMonth) : daysInMonth
    setDayRange([1, end])
  }, [dataMaxDay, daysInMonth])

  const toggleDow = useCallback((dow: number) => {
    setSelectedDows((prev) => {
      const next = new Set(prev)
      if (next.has(dow)) next.delete(dow)
      else next.add(dow)
      return next
    })
  }, [])

  const filterRecords = useCallback(
    (records: readonly CategoryLeafDailyEntry[]) => {
      let result = records.filter((r) => r.day >= dayRange[0] && r.day <= dayRange[1])
      if (mode === 'dowAvg' && selectedDows.size > 0) {
        result = result.filter((r) => {
          const dow = new Date(year, month - 1, r.day).getDay()
          return selectedDows.has(dow)
        })
      }
      return result
    },
    [dayRange, mode, selectedDows, year, month],
  )

  return {
    dayRange,
    setDayRange,
    mode,
    setMode,
    selectedDows,
    toggleDow,
    filterRecords,
    year,
    month,
    defaultEndDay: effectiveEnd,
    resetToDefault,
  }
}

// useHierarchyDropdown は useHierarchyDropdown.ts に分離済み
export {
  useHierarchyDropdown,
  type HierarchyFilterState,
  type HierarchyFilterResult,
} from './useHierarchyDropdown'
