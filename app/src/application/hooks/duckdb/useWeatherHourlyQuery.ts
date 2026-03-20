/**
 * 天気時間帯クエリフック
 *
 * weather_hourly テーブルから指定日・店舗の時間別天気を取得する。
 * DuckDB にデータがない場合は ETRN API から直接取得するフォールバック付き。
 *
 * UIは「日付と店舗を指定したら天気データが返る」だけを知る。
 * 取得元の切替ロジックはこのフック内に閉じる。
 */
import { useMemo, useState, useEffect, useRef } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { HourlyWeatherRecord, StoreLocation } from '@/domain/models'
import {
  queryWeatherHourly,
  queryWeatherHourlyAvg,
  type HourlyWeatherAvgRow,
} from '@/infrastructure/duckdb/queries/weatherQueries'
import { useAsyncQuery, toDateKeys, type AsyncQueryResult } from './useAsyncQuery'
import type { DateRange } from '@/domain/models'
import { loadEtrnHourlyForStore } from '@/application/usecases/weather/WeatherLoadService'
import { useSettingsStore } from '@/application/stores/settingsStore'

/**
 * 指定日・店舗の時間別天気データを取得する。
 *
 * 取得優先順位:
 *   1. DuckDB weather_hourly テーブル
 *   2. ETRN API（DuckDB にデータがない場合のフォールバック）
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

  const duckResult = useAsyncQuery(conn, dataVersion, queryFn)

  // ── ETRN フォールバック ──
  const storeLocations = useSettingsStore((s) => s.settings.storeLocations)
  const location: StoreLocation | undefined = storeLocations[storeId]
  const [etrnCache, setEtrnCache] = useState<{
    key: string
    data: readonly HourlyWeatherRecord[]
  } | null>(null)
  const fetchedKeyRef = useRef('')

  const hasDuckData = (duckResult.data ?? []).length > 0
  const duckDone = !duckResult.isLoading && duckResult.error == null
  const fetchKey = `${storeId}|${dateKey}`

  useEffect(() => {
    // DuckDB にデータがある、まだロード中、location がない場合はスキップ
    if (hasDuckData || !duckDone || !location || !storeId || !dateKey) return
    // 同じキーで既にフェッチ済みならスキップ
    if (fetchedKeyRef.current === fetchKey) return
    fetchedKeyRef.current = fetchKey

    let cancelled = false
    const parts = dateKey.split('-').map(Number)
    const [y, m, d] = parts

    loadEtrnHourlyForStore(storeId, location, y, m, [d])
      .then((result) => {
        if (!cancelled && result.hourly.length > 0) {
          setEtrnCache({ key: fetchKey, data: result.hourly })
        }
      })
      .catch(() => {
        // ETRN取得失敗は無視（天気データは必須ではない）
      })

    return () => {
      cancelled = true
    }
  }, [hasDuckData, duckDone, location, storeId, dateKey, fetchKey])

  // DuckDB 優先、空なら ETRN フォールバック
  if (hasDuckData) return duckResult

  if (etrnCache && etrnCache.key === fetchKey) {
    return { data: etrnCache.data, isLoading: false, error: null }
  }

  return duckResult
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
