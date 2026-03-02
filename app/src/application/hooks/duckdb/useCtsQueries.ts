/**
 * CTS（分類別時間帯売上）クエリフック群
 */
import { useMemo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import type { CategoryTimeSalesRecord } from '@/domain/models'
import {
  queryHourlyAggregation,
  queryLevelAggregation,
  queryStoreAggregation,
  queryHourDowMatrix,
  queryDistinctDayCount,
  queryDowDivisorMap,
  queryCategoryDailyTrend,
  queryCategoryHourly,
  queryCategoryTimeRecords,
  type CtsFilterParams,
  type HourlyAggregationRow,
  type LevelAggregationRow,
  type StoreAggregationRow,
  type HourDowMatrixRow,
  type CategoryDailyTrendRow,
  type CategoryHourlyRow,
} from '@/infrastructure/duckdb/queries/categoryTimeSales'
import { useAsyncQuery, toDateKeys, storeIdsToArray, type AsyncQueryResult } from './useAsyncQuery'

/** 時間帯別集約データ */
export function useDuckDBHourlyAggregation(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
  hierarchy?: { deptCode?: string; lineCode?: string; klassCode?: string },
  isPrevYear?: boolean,
): AsyncQueryResult<readonly HourlyAggregationRow[]> {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    const { dateFrom, dateTo } = toDateKeys(dateRange)
    const params: CtsFilterParams = {
      dateFrom,
      dateTo,
      storeIds: storeIdsToArray(storeIds),
      deptCode: hierarchy?.deptCode,
      lineCode: hierarchy?.lineCode,
      klassCode: hierarchy?.klassCode,
      isPrevYear,
    }
    return (c: AsyncDuckDBConnection) => queryHourlyAggregation(c, params)
  }, [
    dateRange,
    storeIds,
    hierarchy?.deptCode,
    hierarchy?.lineCode,
    hierarchy?.klassCode,
    isPrevYear,
  ])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

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

/** 店舗別×時間帯集約 */
export function useDuckDBStoreAggregation(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
  hierarchy?: { deptCode?: string; lineCode?: string; klassCode?: string },
  isPrevYear?: boolean,
): AsyncQueryResult<readonly StoreAggregationRow[]> {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    const { dateFrom, dateTo } = toDateKeys(dateRange)
    const params: CtsFilterParams = {
      dateFrom,
      dateTo,
      storeIds: storeIdsToArray(storeIds),
      deptCode: hierarchy?.deptCode,
      lineCode: hierarchy?.lineCode,
      klassCode: hierarchy?.klassCode,
      isPrevYear,
    }
    return (c: AsyncDuckDBConnection) => queryStoreAggregation(c, params)
  }, [
    dateRange,
    storeIds,
    hierarchy?.deptCode,
    hierarchy?.lineCode,
    hierarchy?.klassCode,
    isPrevYear,
  ])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

/** 時間帯×曜日マトリクス */
export function useDuckDBHourDowMatrix(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
  hierarchy?: { deptCode?: string; lineCode?: string; klassCode?: string },
): AsyncQueryResult<readonly HourDowMatrixRow[]> {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    const { dateFrom, dateTo } = toDateKeys(dateRange)
    const params: CtsFilterParams = {
      dateFrom,
      dateTo,
      storeIds: storeIdsToArray(storeIds),
      deptCode: hierarchy?.deptCode,
      lineCode: hierarchy?.lineCode,
      klassCode: hierarchy?.klassCode,
    }
    return (c: AsyncDuckDBConnection) => queryHourDowMatrix(c, params)
  }, [dateRange, storeIds, hierarchy?.deptCode, hierarchy?.lineCode, hierarchy?.klassCode])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

/** distinct 日数 */
export function useDuckDBDistinctDayCount(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
  isPrevYear?: boolean,
): AsyncQueryResult<number> {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    const { dateFrom, dateTo } = toDateKeys(dateRange)
    const params: CtsFilterParams = {
      dateFrom,
      dateTo,
      storeIds: storeIdsToArray(storeIds),
      isPrevYear,
    }
    return (c: AsyncDuckDBConnection) => queryDistinctDayCount(c, params)
  }, [dateRange, storeIds, isPrevYear])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

/** 曜日別除数マップ */
export function useDuckDBDowDivisorMap(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
  isPrevYear?: boolean,
): AsyncQueryResult<ReadonlyMap<number, number>> {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    const { dateFrom, dateTo } = toDateKeys(dateRange)
    const params: CtsFilterParams = {
      dateFrom,
      dateTo,
      storeIds: storeIdsToArray(storeIds),
      isPrevYear,
    }
    return (c: AsyncDuckDBConnection) => queryDowDivisorMap(c, params)
  }, [dateRange, storeIds, isPrevYear])

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
        level,
      })
  }, [dateRange, storeIds, level, hierarchy?.deptCode, hierarchy?.lineCode, hierarchy?.klassCode])

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

export type { HourlyAggregationRow, LevelAggregationRow, StoreAggregationRow, HourDowMatrixRow }
export type { CategoryDailyTrendRow, CategoryHourlyRow }
