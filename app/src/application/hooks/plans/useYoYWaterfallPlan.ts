/**
 * useYoYWaterfallPlan — YoY/WoW ウォーターフォールの Screen Query Plan
 *
 * Fallback-aware Comparison: isPrevYear=true で取得→空なら isPrevYear=false で再取得。
 * 3 本の categoryTimeRecordsHandler クエリを管理し、fallback 解決結果を返す。
 * Derivation chain (sales aggregation, factor decomposition) は widget に残す。
 *
 * @guard H1 Screen Plan 経由のみ
 * @guard H4 component に acquisition logic 禁止
 *
 * @responsibility R:unclassified
 */
import { useMemo } from 'react'
import type { DateRange } from '@/domain/models/calendar'
import type { PlanComparisonProvenance } from '@/domain/models/ComparisonWindow'
import { currentOnly, yoyWindow, wowWindow } from '@/domain/models/ComparisonWindow'
import { dateRangeToKeys } from '@/domain/models/calendar'
import type { CategoryTimeSalesRecord } from '@/domain/models/record'
import type { CategoryLeafDailyEntry } from '@/application/hooks/categoryLeafDaily/CategoryLeafDailyBundle.types'
import { toCategoryLeafDailyEntries } from '@/application/hooks/categoryLeafDaily/projectCategoryLeafDailySeries'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import {
  categoryTimeRecordsHandler,
  type CategoryTimeRecordsInput,
} from '@/application/queries/cts/CategoryTimeRecordsHandler'

const EMPTY_RECORDS: readonly CategoryTimeSalesRecord[] = []
const EMPTY_ENTRIES: readonly CategoryLeafDailyEntry[] = []

/** fallback 解決結果 — UI は comparisonSource を表示判断に使える  *
 * @responsibility R:unclassified
 */
export type ComparisonSource = 'primary' | 'fallback' | 'none'

export interface YoYWaterfallPlanInput {
  readonly curDateRange: DateRange
  readonly prevDateRange: DateRange | undefined
  readonly selectedStoreIds: ReadonlySet<string>
  /** YoY=true, WoW=false  *
   * @responsibility R:unclassified
   */
  readonly isPrevYear: boolean
}

export interface YoYWaterfallPlanResult {
  readonly currentRecords: readonly CategoryLeafDailyEntry[]
  readonly comparisonRecords: readonly CategoryLeafDailyEntry[]
  readonly comparisonSource: ComparisonSource
  readonly comparisonProvenance: PlanComparisonProvenance
  readonly isLoading: boolean
}

export function useYoYWaterfallPlan(
  executor: QueryExecutor | null,
  input: YoYWaterfallPlanInput,
): YoYWaterfallPlanResult {
  const { curDateRange, prevDateRange, selectedStoreIds, isPrevYear } = input

  const storeIds = useMemo(
    () => (selectedStoreIds.size > 0 ? [...selectedStoreIds] : undefined),
    [selectedStoreIds],
  )

  // ── 当年 CTS ──
  const curInput = useMemo<CategoryTimeRecordsInput>(() => {
    const { fromKey, toKey } = dateRangeToKeys(curDateRange)
    return { dateFrom: fromKey, dateTo: toKey, storeIds }
  }, [curDateRange, storeIds])

  const { data: curOutput, isLoading: curLoading } = useQueryWithHandler(
    executor,
    categoryTimeRecordsHandler,
    curInput,
  )

  // ── 比較期間 CTS (isPrevYear 付き) ──
  const prevInput = useMemo<CategoryTimeRecordsInput | null>(() => {
    if (!prevDateRange) return null
    const { fromKey, toKey } = dateRangeToKeys(prevDateRange)
    return { dateFrom: fromKey, dateTo: toKey, storeIds, isPrevYear }
  }, [prevDateRange, storeIds, isPrevYear])

  const { data: prevOutput, isLoading: prevLoading } = useQueryWithHandler(
    executor,
    categoryTimeRecordsHandler,
    prevInput,
  )

  // ── フォールバック CTS (isPrevYear=false) ──
  // isPrevYear=true でデータが格納されていない場合のフォールバック
  const fallbackInput = useMemo<CategoryTimeRecordsInput | null>(() => {
    if (!prevDateRange || !isPrevYear) return null
    const { fromKey, toKey } = dateRangeToKeys(prevDateRange)
    return { dateFrom: fromKey, dateTo: toKey, storeIds }
  }, [prevDateRange, storeIds, isPrevYear])

  const { data: fallbackOutput, isLoading: fallbackLoading } = useQueryWithHandler(
    executor,
    categoryTimeRecordsHandler,
    fallbackInput,
  )

  // ── Fallback resolution (category-leaf-daily-entry-shape-break Phase 1:
  //    acquisition 境界で projection を適用し CategoryLeafDailyEntry[] として
  //    配布する) ──
  const currentRecords = useMemo<readonly CategoryLeafDailyEntry[]>(
    () => (curOutput ? toCategoryLeafDailyEntries(curOutput.records) : EMPTY_ENTRIES),
    [curOutput],
  )

  const { comparisonRecords, comparisonSource } = useMemo<{
    comparisonRecords: readonly CategoryLeafDailyEntry[]
    comparisonSource: ComparisonSource
  }>(() => {
    if (!prevDateRange) {
      return { comparisonRecords: EMPTY_ENTRIES, comparisonSource: 'none' as const }
    }
    const primaryRecords: readonly CategoryTimeSalesRecord[] = prevOutput?.records ?? EMPTY_RECORDS
    if (isPrevYear && primaryRecords.length === 0) {
      // isPrevYear=true だが primary が空 → fallback を使用
      const fallbackRecords: readonly CategoryTimeSalesRecord[] =
        fallbackOutput?.records ?? EMPTY_RECORDS
      return {
        comparisonRecords: toCategoryLeafDailyEntries(fallbackRecords),
        comparisonSource: 'fallback' as const,
      }
    }
    return {
      comparisonRecords:
        primaryRecords.length > 0 ? toCategoryLeafDailyEntries(primaryRecords) : EMPTY_ENTRIES,
      comparisonSource: 'primary' as const,
    }
  }, [prevDateRange, prevOutput, isPrevYear, fallbackOutput])

  const comparisonProvenance = useMemo<PlanComparisonProvenance>(() => {
    if (!prevDateRange) return { window: currentOnly(), comparisonAvailable: false }
    const win = isPrevYear ? yoyWindow(prevDateRange) : wowWindow(prevDateRange)
    return { window: win, comparisonAvailable: comparisonSource !== 'none' }
  }, [prevDateRange, isPrevYear, comparisonSource])

  return {
    currentRecords,
    comparisonRecords,
    comparisonSource,
    comparisonProvenance,
    isLoading: curLoading || prevLoading || fallbackLoading,
  }
}
