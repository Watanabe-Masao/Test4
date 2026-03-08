/**
 * フィルタセレクタフック
 *
 * filterStore + settingsStore + uiStore を合成し、
 * DuckDB データ取得や JS 計算が必要とする形式に変換する。
 *
 * ## 設計意図
 *
 * 各ストアの責務は変えず、消費側が必要な形式をここで導出する。
 * これにより filterStore が Single Source of Truth であることと、
 * 既存のストア構造の安定性を両立する。
 */
import { useMemo } from 'react'
import type { DateRange } from '@/domain/models/CalendarDate'
import type { UnifiedFilterState } from '@/domain/models/UnifiedFilter'
import type { BaseQueryInput } from '@/application/queries/QueryContract'
import { useFilterStore } from '@/application/stores/filterStore'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { useUiStore } from '@/application/stores/uiStore'
import { getDaysInMonth } from '@/domain/constants/defaults'
import { toDateKeys, storeIdsToArray } from '@/application/hooks/duckdb/useAsyncQuery'

/**
 * filterStore の dayRange + settingsStore の targetYear/month から
 * DateRange を導出する。
 */
export function useFilterDateRange(): DateRange {
  const { targetYear, targetMonth } = useSettingsStore((s) => s.settings)
  const dayRange = useFilterStore((s) => s.dayRange)
  const daysInMonth = getDaysInMonth(targetYear, targetMonth)

  return useMemo<DateRange>(
    () => ({
      from: { year: targetYear, month: targetMonth, day: dayRange[0] },
      to: {
        year: targetYear,
        month: targetMonth,
        day: Math.min(dayRange[1], daysInMonth),
      },
    }),
    [targetYear, targetMonth, dayRange, daysInMonth],
  )
}

/**
 * uiStore の selectedStoreIds を返す（統一アクセスポイント）。
 */
export function useFilterStoreIds(): ReadonlySet<string> {
  return useUiStore((s) => s.selectedStoreIds)
}

/**
 * 全ストアを合成して UnifiedFilterState を返す。
 *
 * 全フィルタ条件を一括で取得したい場合に使用する。
 */
export function useUnifiedFilter(): UnifiedFilterState {
  const dateRange = useFilterDateRange()
  const storeIds = useFilterStoreIds()
  const dayRange = useFilterStore((s) => s.dayRange)
  const aggregateMode = useFilterStore((s) => s.aggregateMode)
  const selectedDows = useFilterStore((s) => s.selectedDows)
  const hierarchy = useFilterStore((s) => s.hierarchy)
  const categoryFilter = useFilterStore((s) => s.categoryFilter)
  const departmentFilter = useFilterStore((s) => s.departmentFilter)

  return useMemo<UnifiedFilterState>(
    () => ({
      dateRange,
      dayRange,
      storeIds,
      aggregateMode,
      selectedDows,
      hierarchy,
      categoryFilter,
      departmentFilter,
    }),
    [
      dateRange,
      dayRange,
      storeIds,
      aggregateMode,
      selectedDows,
      hierarchy,
      categoryFilter,
      departmentFilter,
    ],
  )
}

/**
 * DuckDB クエリ用の BaseQueryInput を導出する。
 *
 * 既存の DuckDB フック（dateRange + storeIds パラメータ）との
 * 互換形式を提供する。
 */
export function useFilterAsQueryInput(): BaseQueryInput {
  const dateRange = useFilterDateRange()
  const storeIds = useFilterStoreIds()

  return useMemo(() => {
    const { dateFrom, dateTo } = toDateKeys(dateRange)
    return {
      dateFrom,
      dateTo,
      storeIds: storeIdsToArray(storeIds),
    }
  }, [dateRange, storeIds])
}
