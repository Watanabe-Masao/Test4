/**
 * CTS カテゴリ階層クエリフック群
 *
 * 階層レベル別集約・カテゴリ日次トレンド・カテゴリ時間帯・CTS レコード取得。
 * useCtsQueries.ts から分割。
 */
import { useMemo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models/calendar'
import {
  queryLevelAggregation,
  queryCategoryDailyTrend,
  queryCategoryHourly,
  queryCategoryDowMatrix,
  type CtsFilterParams,
  type LevelAggregationRow,
  type CategoryDailyTrendRow,
  type CategoryHourlyRow,
  type CategoryDowMatrixRow,
} from '@/infrastructure/duckdb/queries/categoryTimeSales'

// re-export types for barrel consumers
export type { CategoryDowMatrixRow }
import { useAsyncQuery, toDateKeys, storeIdsToArray, type AsyncQueryResult } from './useAsyncQuery'

/** 階層レベル別集約 */
export function useDuckDBLevelAggregation(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
  level: 'department' | 'line' | 'klass',
  hierarchy?: { deptCode?: string; lineCode?: string; klassCode?: string },
  isPrevYear?: boolean,
): AsyncQueryResult<readonly LevelAggregationRow[]> {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    const { dateFrom, dateTo } = toDateKeys(dateRange)
    const params: CtsFilterParams & { level: 'department' | 'line' | 'klass' } = {
      dateFrom,
      dateTo,
      storeIds: storeIdsToArray(storeIds),
      deptCode: hierarchy?.deptCode,
      lineCode: hierarchy?.lineCode,
      klassCode: hierarchy?.klassCode,
      isPrevYear,
      level,
    }
    return (c: AsyncDuckDBConnection) => queryLevelAggregation(c, params)
  }, [
    dateRange,
    storeIds,
    level,
    hierarchy?.deptCode,
    hierarchy?.lineCode,
    hierarchy?.klassCode,
    isPrevYear,
  ])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

/** カテゴリ別日次トレンド */
export function useDuckDBCategoryDailyTrend(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
  level: 'department' | 'line' | 'klass',
  hierarchy?: { deptCode?: string; lineCode?: string; klassCode?: string },
  topN?: number,
  dow?: readonly number[],
): AsyncQueryResult<readonly CategoryDailyTrendRow[]> {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    const { dateFrom, dateTo } = toDateKeys(dateRange)
    return (c: AsyncDuckDBConnection) =>
      queryCategoryDailyTrend(c, {
        dateFrom,
        dateTo,
        storeIds: storeIdsToArray(storeIds),
        deptCode: hierarchy?.deptCode,
        lineCode: hierarchy?.lineCode,
        klassCode: hierarchy?.klassCode,
        level,
        topN,
        dow,
      })
  }, [
    dateRange,
    storeIds,
    level,
    hierarchy?.deptCode,
    hierarchy?.lineCode,
    hierarchy?.klassCode,
    topN,
    dow,
  ])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

/** カテゴリ別×時間帯集約 */
export function useDuckDBCategoryHourly(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
  level: 'department' | 'line' | 'klass',
  hierarchy?: { deptCode?: string; lineCode?: string; klassCode?: string },
  isPrevYear?: boolean,
): AsyncQueryResult<readonly CategoryHourlyRow[]> {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    const { dateFrom, dateTo } = toDateKeys(dateRange)
    return (c: AsyncDuckDBConnection) =>
      queryCategoryHourly(c, {
        dateFrom,
        dateTo,
        storeIds: storeIdsToArray(storeIds),
        deptCode: hierarchy?.deptCode,
        lineCode: hierarchy?.lineCode,
        klassCode: hierarchy?.klassCode,
        isPrevYear,
        level,
      })
  }, [
    dateRange,
    storeIds,
    level,
    hierarchy?.deptCode,
    hierarchy?.lineCode,
    hierarchy?.klassCode,
    isPrevYear,
  ])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

/** カテゴリ別×曜日マトリクス（部門/ライン/クラス × 曜日の売上・点数集約） */
export function useDuckDBCategoryDowMatrix(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
  level: 'department' | 'line' | 'klass',
  hierarchy?: { deptCode?: string; lineCode?: string; klassCode?: string },
): AsyncQueryResult<readonly CategoryDowMatrixRow[]> {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    const { dateFrom, dateTo } = toDateKeys(dateRange)
    return (c: AsyncDuckDBConnection) =>
      queryCategoryDowMatrix(c, {
        dateFrom,
        dateTo,
        storeIds: storeIdsToArray(storeIds),
        deptCode: hierarchy?.deptCode,
        lineCode: hierarchy?.lineCode,
        klassCode: hierarchy?.klassCode,
        level,
      })
  }, [dateRange, storeIds, level, hierarchy?.deptCode, hierarchy?.lineCode, hierarchy?.klassCode])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

export type { LevelAggregationRow, CategoryDailyTrendRow, CategoryHourlyRow }
