/**
 * CTS カテゴリ階層クエリフック群
 *
 * 階層レベル別集約・カテゴリ日次トレンド・カテゴリ時間帯・CTS レコード取得。
 * useCtsQueries.ts から分割。
 */
import { useMemo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import type { CategoryTimeSalesRecord } from '@/domain/models'
import {
  queryLevelAggregation,
  queryCategoryDailyTrend,
  queryCategoryHourly,
  queryCategoryTimeRecords,
  type CtsFilterParams,
  type LevelAggregationRow,
  type CategoryDailyTrendRow,
  type CategoryHourlyRow,
} from '@/infrastructure/duckdb/queries/categoryTimeSales'
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

/**
 * CategoryTimeSalesRecord[] 互換データを DuckDB から取得。
 *
 * category_time_sales + time_slots を JOIN し、子コンポーネント
 * （HourlyChart, CategoryDrilldown, DrilldownWaterfall 等）が
 * そのまま使える CategoryTimeSalesRecord[] を返す。
 */
export function useDuckDBCategoryTimeRecords(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
  isPrevYear?: boolean,
): AsyncQueryResult<readonly CategoryTimeSalesRecord[]> {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    const { dateFrom, dateTo } = toDateKeys(dateRange)
    const params: CtsFilterParams = {
      dateFrom,
      dateTo,
      storeIds: storeIdsToArray(storeIds),
      isPrevYear,
    }
    return (c: AsyncDuckDBConnection) => queryCategoryTimeRecords(c, params)
  }, [dateRange, storeIds, isPrevYear])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

/**
 * CTS レコードを命令的に取得する（非フック）。
 * クリップエクスポート等、イベントハンドラ内で使用する。
 */
export async function fetchCategoryTimeRecords(
  conn: AsyncDuckDBConnection,
  dateRange: DateRange,
  storeIds: ReadonlySet<string>,
  isPrevYear?: boolean,
): Promise<readonly CategoryTimeSalesRecord[]> {
  const { dateFrom, dateTo } = toDateKeys(dateRange)
  return queryCategoryTimeRecords(conn, {
    dateFrom,
    dateTo,
    storeIds: storeIdsToArray(storeIds),
    isPrevYear,
  })
}

export type { LevelAggregationRow, CategoryDailyTrendRow, CategoryHourlyRow }
