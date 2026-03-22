/**
 * 天気時間帯クエリフック
 *
 * weather_hourly テーブルから指定日・店舗の時間別天気を取得する。
 * DuckDB にデータがない場合は ETRN API から直接取得するフォールバック付き。
 * ETRN から取得したデータは DuckDB に永続化し、useDuckDBWeatherHourlyAvg が
 * 蓄積データから月間平均を返せるようにする。
 *
 * UIは「日付と店舗を指定したら天気データが返る」だけを知る。
 * 取得元の切替ロジックはこのフック内に閉じる。
 */
import { useMemo, useState, useEffect, useRef } from 'react'
import type { AsyncDuckDBConnection, AsyncDuckDB } from '@duckdb/duckdb-wasm'
import type { HourlyWeatherRecord, StoreLocation } from '@/domain/models/record'
import {
  queryWeatherHourly,
  queryWeatherHourlyAvg,
  type HourlyWeatherAvgRow,
} from '@/infrastructure/duckdb/queries/weatherQueries'
import { insertWeatherHourly } from '@/infrastructure/duckdb/dataConversions'
import { useAsyncQuery, toDateKeys, type AsyncQueryResult } from './useAsyncQuery'
import { type DateRange, splitDateRangeByMonth } from '@/domain/models/calendar'
import { loadEtrnHourlyForStore } from '@/application/usecases/weather/WeatherLoadService'
import { useSettingsStore } from '@/application/stores/settingsStore'

/**
 * 指定日・店舗の時間別天気データを取得する。
 *
 * 取得優先順位:
 *   1. DuckDB weather_hourly テーブル
 *   2. ETRN API（DuckDB にデータがない場合のフォールバック）
 *
 * ETRN から取得したデータは DuckDB に永続化する。
 * これにより useDuckDBWeatherHourlyAvg が蓄積データから月間平均を返せる。
 *
 * @param conn DuckDB コネクション
 * @param dataVersion DuckDB データバージョン（0 = 未ロード）
 * @param storeId 店舗ID
 * @param dateKey 対象日 (YYYY-MM-DD)
 * @param db DuckDB インスタンス（永続化用、省略時は永続化しない）
 */
export function useDuckDBWeatherHourly(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  storeId: string,
  dateKey: string | null,
  db?: AsyncDuckDB | null,
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
    // 同じキーで既にフェッチ済み（成功済み）ならスキップ
    if (fetchedKeyRef.current === fetchKey) return

    let cancelled = false
    const parts = dateKey.split('-').map(Number)
    const [y, m, d] = parts

    loadEtrnHourlyForStore(storeId, location, y, m, [d])
      .then(async (result) => {
        if (cancelled || result.hourly.length === 0) return
        fetchedKeyRef.current = fetchKey // 成功時のみ再取得を抑止
        setEtrnCache({ key: fetchKey, data: result.hourly })

        // DuckDB に永続化（次回以降 ETRN API 不要 + WeatherHourlyAvg が集計可能に）
        if (conn && db) {
          try {
            await insertWeatherHourly(conn, db, result.hourly, storeId)
          } catch {
            // 永続化失敗は無視（キャッシュとして動作するだけ）
          }
        }
      })
      .catch((err: unknown) => {
        // ETRN取得失敗は無視（天気データは必須ではない）
        console.warn('[useDuckDBWeatherHourly] ETRN fallback failed:', err)
      })

    return () => {
      cancelled = true
    }
  }, [hasDuckData, duckDone, location, storeId, dateKey, fetchKey, conn, db])

  // DuckDB 優先、空なら ETRN フォールバック
  if (hasDuckData) return duckResult

  if (etrnCache && etrnCache.key === fetchKey) {
    return { data: etrnCache.data, isLoading: false, error: null }
  }

  return duckResult
}

/**
 * 指定店舗・日付範囲の時間帯別天気平均を取得する（月間プロファイル用）。
 *
 * 1. DuckDB weather_hourly から集計を試みる
 * 2. 空なら ETRN API から日付範囲の全日を一括取得→DuckDB に永続化→再クエリ
 */
export function useDuckDBWeatherHourlyAvg(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  storeId: string,
  dateRange: DateRange | undefined,
  db?: AsyncDuckDB | null,
): AsyncQueryResult<readonly HourlyWeatherAvgRow[]> {
  const queryFn = useMemo(() => {
    if (!dateRange || !storeId) return null
    const { dateFrom, dateTo } = toDateKeys(dateRange)
    return (c: AsyncDuckDBConnection) => queryWeatherHourlyAvg(c, storeId, dateFrom, dateTo)
  }, [storeId, dateRange])

  const duckResult = useAsyncQuery(conn, dataVersion, queryFn)

  // ── ETRN フォールバック: DuckDB が空なら月間一括取得→永続化→再クエリ ──
  const storeLocations = useSettingsStore((s) => s.settings.storeLocations)
  const location: StoreLocation | undefined = storeLocations[storeId]
  const fetchedKeyRef = useRef('')
  const [retryVersion, setRetryVersion] = useState(0)

  const hasDuckData = (duckResult.data ?? []).length > 0
  const duckDone = !duckResult.isLoading && duckResult.error == null
  const fetchKey = dateRange
    ? `${storeId}|${dateRange.from.year}-${dateRange.from.month}-${dateRange.from.day}|${dateRange.to.year}-${dateRange.to.month}-${dateRange.to.day}`
    : ''

  useEffect(() => {
    if (hasDuckData || !duckDone || !location || !storeId || !dateRange || !conn || !db) return
    if (fetchedKeyRef.current === fetchKey) return

    let cancelled = false
    // 月別チャンクに分割（月跨ぎ対応）
    const chunks = splitDateRangeByMonth(dateRange.from, dateRange.to)

    // 全チャンクを並列取得し、結果を結合して DuckDB に永続化
    Promise.all(
      chunks.map((chunk) =>
        loadEtrnHourlyForStore(storeId, location, chunk.year, chunk.month, chunk.days),
      ),
    )
      .then(async (results) => {
        if (cancelled) return
        const allHourly = results.flatMap((r) => r.hourly)
        if (allHourly.length === 0) return
        fetchedKeyRef.current = fetchKey

        // DuckDB に永続化
        try {
          await insertWeatherHourly(conn, db, allHourly, storeId)
          // 永続化成功→再クエリをトリガー
          if (!cancelled) setRetryVersion((v) => v + 1)
        } catch {
          // 永続化失敗は無視
        }
      })
      .catch(() => {
        // ETRN取得失敗は無視
      })

    return () => {
      cancelled = true
    }
  }, [hasDuckData, duckDone, location, storeId, dateRange, fetchKey, conn, db])

  // 永続化後の再クエリ
  const retryQueryFn = useMemo(() => {
    if (retryVersion === 0 || !dateRange || !storeId) return null
    const { dateFrom, dateTo } = toDateKeys(dateRange)
    return (c: AsyncDuckDBConnection) => queryWeatherHourlyAvg(c, storeId, dateFrom, dateTo)
  }, [storeId, dateRange, retryVersion])

  const retryResult = useAsyncQuery(conn, dataVersion, retryQueryFn)

  if (retryVersion > 0 && (retryResult.data ?? []).length > 0) return retryResult
  return duckResult
}
