/**
 * 特徴量クエリフック群
 */
import { useMemo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import {
  queryDailyFeatures,
  queryHourlyProfile,
  queryDowPattern,
  type DailyFeatureRow,
  type HourlyProfileRow,
  type DowPatternRow,
} from '@/infrastructure/duckdb/queries/features'
import { useAsyncQuery, toDateKeys, storeIdsToArray, type AsyncQueryResult } from './useAsyncQuery'

/** 日別売上特徴量ベクトル */
export function useDuckDBDailyFeatures(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
): AsyncQueryResult<readonly DailyFeatureRow[]> {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    const { dateFrom, dateTo } = toDateKeys(dateRange)
    return (c: AsyncDuckDBConnection) =>
      queryDailyFeatures(c, {
        dateFrom,
        dateTo,
        storeIds: storeIdsToArray(storeIds),
      })
  }, [dateRange, storeIds])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

/** 時間帯別売上構成比 */
export function useDuckDBHourlyProfile(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
): AsyncQueryResult<readonly HourlyProfileRow[]> {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    const { dateFrom, dateTo } = toDateKeys(dateRange)
    return (c: AsyncDuckDBConnection) =>
      queryHourlyProfile(c, {
        dateFrom,
        dateTo,
        storeIds: storeIdsToArray(storeIds),
      })
  }, [dateRange, storeIds])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

/** 曜日パターン */
export function useDuckDBDowPattern(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
): AsyncQueryResult<readonly DowPatternRow[]> {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    const { dateFrom, dateTo } = toDateKeys(dateRange)
    return (c: AsyncDuckDBConnection) =>
      queryDowPattern(c, {
        dateFrom,
        dateTo,
        storeIds: storeIdsToArray(storeIds),
      })
  }, [dateRange, storeIds])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

export type { DailyFeatureRow, HourlyProfileRow, DowPatternRow }
