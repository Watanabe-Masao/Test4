/**
 * 日別明細クエリフック群
 *
 * dailyRecords.ts のクエリを useAsyncQuery ベースのフックとして提供する。
 * DailyRecord (JS) の代替。DailySalesChart, GrossProfitAmountChart 等で使用。
 * @responsibility R:unclassified
 */
import { useMemo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models/calendar'
import {
  queryDailyRecords,
  queryPrevYearDailyRecords,
  queryAggregatedDailyRecords,
  type DailyRecordRow,
} from '@/infrastructure/duckdb'
import { useAsyncQuery, type AsyncQueryResult } from './useAsyncQuery'

/**
 * 日別明細（店舗別）を取得する。
 *
 * store_day_summary の全カラム + 予算額を返す。
 * DailyRecord (JS) の代替。DailySalesChart, GrossProfitAmountChart 等で使用。
 */
export function useDuckDBDailyRecords(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
): AsyncQueryResult<readonly DailyRecordRow[]> {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    return (c: AsyncDuckDBConnection) => queryDailyRecords(c, dateRange, storeIds)
  }, [dateRange, storeIds])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

/**
 * 前年日別明細を取得する。
 *
 * 前年比較チャート（DailySalesChart の前年ライン等）で使用。
 */
export function useDuckDBPrevYearDailyRecords(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
): AsyncQueryResult<readonly DailyRecordRow[]> {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    return (c: AsyncDuckDBConnection) => queryPrevYearDailyRecords(c, dateRange, storeIds)
  }, [dateRange, storeIds])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

/**
 * 日別集約明細（全店舗合算）を取得する。
 *
 * 複数店舗選択時に店舗をまたいで日別合算したデータを返す。
 */
export function useDuckDBAggregatedDailyRecords(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
): AsyncQueryResult<readonly DailyRecordRow[]> {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    return (c: AsyncDuckDBConnection) => queryAggregatedDailyRecords(c, dateRange, storeIds)
  }, [dateRange, storeIds])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

export type { DailyRecordRow }
