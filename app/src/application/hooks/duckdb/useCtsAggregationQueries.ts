/**
 * CTS 集約・マトリクスクエリフック群
 *
 * 時間帯別集約・店舗別集約・曜日マトリクス・日数カウント・曜日除数。
 * useCtsQueries.ts から分割。
 */
import { useMemo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models/calendar'
import {
  queryHourlyAggregation,
  queryStoreAggregation,
  queryHourDowMatrix,
  queryDistinctDayCount,
  queryDowDivisorMap,
  type CtsFilterParams,
  type HourlyAggregationRow,
  type StoreAggregationRow,
  type HourDowMatrixRow,
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
  isPrevYear?: boolean,
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
      isPrevYear,
    }
    return (c: AsyncDuckDBConnection) => queryHourDowMatrix(c, params)
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

/** distinct 日数（営業日のみ: total_amount > 0 の日のみカウント） */
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
    const params: CtsFilterParams & { readonly businessDaysOnly: boolean } = {
      dateFrom,
      dateTo,
      storeIds: storeIdsToArray(storeIds),
      isPrevYear,
      businessDaysOnly: true,
    }
    return (c: AsyncDuckDBConnection) => queryDistinctDayCount(c, params)
  }, [dateRange, storeIds, isPrevYear])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

/** 曜日別除数マップ（営業日のみ: total_amount > 0 の日のみカウント） */
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
    const params: CtsFilterParams & { readonly businessDaysOnly: boolean } = {
      dateFrom,
      dateTo,
      storeIds: storeIdsToArray(storeIds),
      isPrevYear,
      businessDaysOnly: true,
    }
    return (c: AsyncDuckDBConnection) => queryDowDivisorMap(c, params)
  }, [dateRange, storeIds, isPrevYear])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

export type { HourlyAggregationRow, StoreAggregationRow, HourDowMatrixRow }
