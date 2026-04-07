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
 * @responsibility R:query-plan
 */
import { useMemo } from 'react'
import type { DateRange } from '@/domain/models/calendar'
import type { PlanComparisonProvenance } from '@/domain/models/ComparisonWindow'
import { currentOnly, yoyWindow, wowWindow } from '@/domain/models/ComparisonWindow'
import { dateRangeToKeys } from '@/domain/models/calendar'
import type { CategoryTimeSalesRecord } from '@/domain/models/record'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import {
  categoryTimeRecordsHandler,
  type CategoryTimeRecordsInput,
} from '@/application/queries/cts/CategoryTimeRecordsHandler'

const EMPTY_RECORDS: readonly CategoryTimeSalesRecord[] = []

/** fallback 解決結果 — UI は comparisonSource を表示判断に使える  *
 * @responsibility R:query-plan
 */
export type ComparisonSource = 'primary' | 'fallback' | 'none'

export interface YoYWaterfallPlanInput {
  readonly curDateRange: DateRange
  readonly prevDateRange: DateRange | undefined
  readonly selectedStoreIds: ReadonlySet<string>
  /** YoY=true, WoW=false  *
   * @responsibility R:query-plan
   */
  readonly isPrevYear: boolean
}

export interface YoYWaterfallPlanResult {
  readonly currentRecords: readonly CategoryTimeSalesRecord[]
  readonly comparisonRecords: readonly CategoryTimeSalesRecord[]
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

  // ── Fallback resolution ──
  const currentRecords = curOutput?.records ?? EMPTY_RECORDS

  const { comparisonRecords, comparisonSource } = useMemo<{
    comparisonRecords: readonly CategoryTimeSalesRecord[]
    comparisonSource: ComparisonSource
  }>(() => {
    if (!prevDateRange) {
      return { comparisonRecords: EMPTY_RECORDS, comparisonSource: 'none' as const }
    }
    const primaryRecords = prevOutput?.records ?? []
    if (isPrevYear && primaryRecords.length === 0) {
      // isPrevYear=true だが primary が空 → fallback を使用
      return {
        comparisonRecords: fallbackOutput?.records ?? EMPTY_RECORDS,
        comparisonSource: 'fallback' as const,
      }
    }
    return {
      comparisonRecords: primaryRecords.length > 0 ? primaryRecords : EMPTY_RECORDS,
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
