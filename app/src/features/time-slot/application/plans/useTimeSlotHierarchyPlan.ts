/**
 * useTimeSlotHierarchyPlan — TimeSlot の部門/ライン/クラス階層クエリ
 *
 * useTimeSlotPlan から分離した hierarchy drill-through クエリを管理する。
 *
 * @guard H1 Screen Plan 経由のみ
 * @guard H4 component に acquisition logic 禁止
 *
 * @responsibility R:unclassified
 */
import { useMemo } from 'react'
import type { DateRange } from '@/domain/models/calendar'
import { dateRangeToKeys } from '@/domain/models/CalendarDate'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import {
  levelAggregationHandler,
  type LevelAggregationInput,
  type LevelAggregationRow,
} from '@/application/queries/cts/LevelAggregationHandler'

export interface TimeSlotHierarchyParams {
  readonly queryExecutor: QueryExecutor | null
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  readonly hierarchy: {
    readonly deptCode?: string
    readonly lineCode?: string
    readonly klassCode?: string
  }
}

export interface TimeSlotHierarchyResult {
  readonly deptRecords: readonly LevelAggregationRow[] | undefined
  readonly lineRecords: readonly LevelAggregationRow[] | undefined
  readonly klassRecords: readonly LevelAggregationRow[] | undefined
}

function toKeys(range: DateRange): { dateFrom: string; dateTo: string } {
  const { fromKey, toKey } = dateRangeToKeys(range)
  return { dateFrom: fromKey, dateTo: toKey }
}

function storeIdsArray(ids: ReadonlySet<string>): readonly string[] | undefined {
  return ids.size > 0 ? [...ids] : undefined
}

export function useTimeSlotHierarchyPlan(params: TimeSlotHierarchyParams): TimeSlotHierarchyResult {
  const { queryExecutor, currentDateRange, selectedStoreIds, hierarchy } = params
  const storeIds = storeIdsArray(selectedStoreIds)
  const deptCode = hierarchy.deptCode
  const lineCode = hierarchy.lineCode

  const deptInput = useMemo<LevelAggregationInput>(
    () => ({
      ...toKeys(currentDateRange),
      storeIds,
      level: 'department' as const,
    }),
    [currentDateRange, storeIds],
  )

  const lineInput = useMemo<LevelAggregationInput | null>(() => {
    if (!deptCode) return null
    return {
      ...toKeys(currentDateRange),
      storeIds,
      level: 'line' as const,
      deptCode,
    }
  }, [currentDateRange, storeIds, deptCode])

  const klassInput = useMemo<LevelAggregationInput | null>(() => {
    if (!deptCode && !lineCode) return null
    return {
      ...toKeys(currentDateRange),
      storeIds,
      level: 'klass' as const,
      deptCode: deptCode || undefined,
      lineCode: lineCode || undefined,
    }
  }, [currentDateRange, storeIds, deptCode, lineCode])

  const { data: deptOut } = useQueryWithHandler(queryExecutor, levelAggregationHandler, deptInput)
  const { data: lineOut } = useQueryWithHandler(queryExecutor, levelAggregationHandler, lineInput)
  const { data: klassOut } = useQueryWithHandler(queryExecutor, levelAggregationHandler, klassInput)

  return {
    deptRecords: deptOut?.records,
    lineRecords: lineOut?.records,
    klassRecords: klassOut?.records,
  }
}
