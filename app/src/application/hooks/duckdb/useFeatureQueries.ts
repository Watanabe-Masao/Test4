/**
 * 特徴量クエリフック群
 *
 * Phase 3 移行済み: 日別特徴量・曜日パターンは JS 計算版に委譲。
 * DuckDB は生データ取得のみ。統計計算は rawAggregation.ts で実行。
 * @responsibility R:unclassified
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models/calendar'
import {
  type DailyFeatureRow,
  type HourlyProfileRow,
  type DowPatternRow,
} from '@/infrastructure/duckdb/queries/features'
import type { AsyncQueryResult } from './useAsyncQuery'
import { useJsDailyFeatures, useJsDowPattern } from './useJsFeatureQueries'
import { useJsHourlyProfile } from './useJsSalesCompQueries'

/** 日別売上特徴量ベクトル（JS計算版に移行済み） */
export function useDuckDBDailyFeatures(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
): AsyncQueryResult<readonly DailyFeatureRow[]> {
  return useJsDailyFeatures(conn, dataVersion, dateRange, storeIds)
}

/** 時間帯別売上構成比（JS計算版に移行済み） */
export function useDuckDBHourlyProfile(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
): AsyncQueryResult<readonly HourlyProfileRow[]> {
  return useJsHourlyProfile(conn, dataVersion, dateRange, storeIds)
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
