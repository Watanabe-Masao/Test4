/**
 * useClipExportPlan — クリップエクスポート用 CTS データ取得プラン
 *
 * queryExecutor.execute() 直接呼び出しを廃止し、
 * useQueryWithHandler 経由で当年・前年 CTS データを事前取得する。
 *
 * @guard H1 Screen Plan 経由のみ
 * @guard H2 比較は pair/bundle 契約
 */
import { useMemo } from 'react'
import type { DateRange } from '@/domain/models/CalendarDate'
import { dateRangeToKeys } from '@/domain/models/CalendarDate'
import type { CategoryTimeSalesRecord } from '@/domain/models/record'
import type { PlanComparisonProvenance } from '@/domain/models/ComparisonWindow'
import { yoyWindow } from '@/domain/models/ComparisonWindow'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import {
  categoryTimeRecordsHandler,
  type CategoryTimeRecordsInput,
} from '@/application/queries/cts/CategoryTimeRecordsHandler'

export interface ClipExportPlanInput {
  readonly curDateRange: DateRange
  readonly prevDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
}

export interface ClipExportPlanResult {
  readonly currentCtsRecords: readonly CategoryTimeSalesRecord[]
  readonly prevCtsRecords: readonly CategoryTimeSalesRecord[]
  readonly comparisonProvenance: PlanComparisonProvenance
}

const EMPTY_RECORDS: readonly CategoryTimeSalesRecord[] = []

/** DateRange → CategoryTimeRecordsInput を構築する */
function buildCtsInput(
  range: DateRange,
  storeIds: ReadonlySet<string>,
  isPrevYear?: boolean,
): CategoryTimeRecordsInput {
  const { fromKey, toKey } = dateRangeToKeys(range)
  return {
    dateFrom: fromKey,
    dateTo: toKey,
    storeIds: storeIds.size > 0 ? [...storeIds] : undefined,
    isPrevYear,
  }
}

export function useClipExportPlan(
  executor: QueryExecutor | null,
  input: ClipExportPlanInput,
): ClipExportPlanResult {
  const { curDateRange, prevDateRange, selectedStoreIds } = input

  const curInput = useMemo(
    () => buildCtsInput(curDateRange, selectedStoreIds),
    [curDateRange, selectedStoreIds],
  )
  const prevInput = useMemo(
    () => buildCtsInput(prevDateRange, selectedStoreIds, true),
    [prevDateRange, selectedStoreIds],
  )

  const curResult = useQueryWithHandler(executor, categoryTimeRecordsHandler, curInput)
  const prevResult = useQueryWithHandler(executor, categoryTimeRecordsHandler, prevInput)

  const comparisonProvenance = useMemo<PlanComparisonProvenance>(
    () => ({
      window: yoyWindow(prevDateRange),
      comparisonAvailable: prevResult.data != null,
    }),
    [prevDateRange, prevResult.data],
  )

  return {
    currentCtsRecords: curResult.data?.records ?? EMPTY_RECORDS,
    prevCtsRecords: prevResult.data?.records ?? EMPTY_RECORDS,
    comparisonProvenance,
  }
}
