/**
 * 天気時間帯クエリフック
 *
 * weather_hourly テーブルから指定日・店舗の時間別天気を取得する。
 * DayDetailModal の時間帯分析タブで売上と天気の重ね描きに使用。
 */
import { useMemo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { HourlyWeatherRecord } from '@/domain/models'
import {
  queryWeatherHourly,
  queryWeatherHourlyAvg,
  type HourlyWeatherAvgRow,
} from '@/infrastructure/duckdb/queries/weatherQueries'
import { useAsyncQuery, toDateKeys, type AsyncQueryResult } from './useAsyncQuery'
import type { DateRange } from '@/domain/models'

/**
 * 指定日・店舗の時間別天気データを DuckDB から取得する。
 *
 * @param conn DuckDB コネクション
 * @param dataVersion DuckDB データバージョン（0 = 未ロード）
 * @param storeId 店舗ID
 * @param dateKey 対象日 (YYYY-MM-DD)
 */
export function useDuckDBWeatherHourly(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  storeId: string,
  dateKey: string | null,
): AsyncQueryResult<readonly HourlyWeatherRecord[]> {
  const queryFn = useMemo(() => {
    if (!dateKey || !storeId) return null
    return (c: AsyncDuckDBConnection) => queryWeatherHourly(c, storeId, dateKey, dateKey)
  }, [storeId, dateKey])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

/**
 * 指定店舗・日付範囲の時間帯別天気平均を取得する（月間プロファイル用）。
 */
export function useDuckDBWeatherHourlyAvg(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  storeId: string,
  dateRange: DateRange | undefined,
): AsyncQueryResult<readonly HourlyWeatherAvgRow[]> {
  const queryFn = useMemo(() => {
    if (!dateRange || !storeId) return null
    const { dateFrom, dateTo } = toDateKeys(dateRange)
    return (c: AsyncDuckDBConnection) => queryWeatherHourlyAvg(c, storeId, dateFrom, dateTo)
  }, [storeId, dateRange])

  return useAsyncQuery(conn, dataVersion, queryFn)
}
