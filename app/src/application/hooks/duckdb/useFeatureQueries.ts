/**
 * 特徴量クエリフック群
 *
 * Phase 3 移行済み: 日別特徴量・曜日パターンは JS 計算版に委譲。
 * DuckDB は生データ取得のみ。統計計算は rawAggregation.ts で実行。
 */
import { useMemo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import {
  queryHourlyProfile,
  type DailyFeatureRow,
  type HourlyProfileRow,
  type DowPatternRow,
} from '@/infrastructure/duckdb/queries/features'
import { useAsyncQuery, toDateKeys, storeIdsToArray, type AsyncQueryResult } from './useAsyncQuery'
import { useJsDailyFeatures, useJsDowPattern } from './useJsAggregationQueries'

/** 日別売上特徴量ベクトル（JS計算版に移行済み） */
export function useDuckDBDailyFeatures(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
): AsyncQueryResult<readonly DailyFeatureRow[]> {
  return useJsDailyFeatures(conn, dataVersion, dateRange, storeIds)
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

/** 曜日パターン（JS計算版に移行済み） */
export function useDuckDBDowPattern(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
): AsyncQueryResult<readonly DowPatternRow[]> {
  return useJsDowPattern(conn, dataVersion, dateRange, storeIds)
}

export type { DailyFeatureRow, HourlyProfileRow, DowPatternRow }
