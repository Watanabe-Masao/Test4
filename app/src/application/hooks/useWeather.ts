/**
 * 天気データ Hook
 *
 * DuckDB weather_hourly テーブルをキャッシュとして使用し、
 * 未取得分のみ AMEDAS API からフェッチする。
 *
 * データフロー:
 *   DuckDB キャッシュ確認 → (miss) → API フェッチ → DuckDB INSERT → DuckDB SELECT
 *                        → (hit)  → DuckDB SELECT
 */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import type { AsyncDuckDB, AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { HourlyWeatherRecord, DailyWeatherSummary } from '@/domain/models'
import { aggregateHourlyToDaily } from '@/domain/calculations/weatherAggregation'
import { loadWeatherForStore, getDateRange } from '../usecases/weather/WeatherLoadService'
import { useSettingsStore } from '../stores/settingsStore'

export interface UseWeatherResult {
  /** 時間別天気レコード */
  readonly hourly: readonly HourlyWeatherRecord[]
  /** 日別天気サマリ（domain 純粋関数で集約済み） */
  readonly daily: readonly DailyWeatherSummary[]
  /** 取得中フラグ */
  readonly isLoading: boolean
  /** エラーメッセージ（取得失敗時） */
  readonly error: string | null
  /** 天気データを手動で再取得する（キャッシュ無視） */
  readonly reload: () => void
}

/**
 * 天気データを DuckDB 経由で取得・集約する Hook。
 *
 * DuckDB にキャッシュ済みデータがあれば API を叩かずに返す。
 * キャッシュミス時のみ AMEDAS API にフェッチし、DuckDB に投入する。
 *
 * @param year 対象年
 * @param month 対象月 (1-12)
 * @param storeId 店舗ID
 * @param duckConn DuckDB コネクション（null なら DuckDB 未準備）
 * @param duckDb DuckDB インスタンス（null なら DuckDB 未準備）
 */
export function useWeatherData(
  year: number,
  month: number,
  storeId: string,
  duckConn?: AsyncDuckDBConnection | null,
  duckDb?: AsyncDuckDB | null,
): UseWeatherResult {
  const storeLocations = useSettingsStore((s) => s.settings.storeLocations)
  const [hourly, setHourly] = useState<readonly HourlyWeatherRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const seqRef = useRef(0)

  const location = storeLocations[storeId]

  useEffect(() => {
    const seq = ++seqRef.current

    if (!location) {
      return
    }

    let cancelled = false

    const timerId = setTimeout(() => {
      if (cancelled) return
      setIsLoading(true)
      setError(null)

      const { startDate, endDate } = getDateRange(year, month)

      // Skip fetch if entire range is in the future (no archive data available)
      if (startDate > endDate) {
        setHourly([])
        setIsLoading(false)
        return
      }

      const run = async () => {
        try {
          // DuckDB コネクション + インスタンスが利用可能な場合はキャッシュ経由で取得
          if (duckConn && duckDb) {
            const forceRefresh = reloadKey > 0
            const records = await loadWeatherForStore(
              duckConn,
              duckDb,
              storeId,
              location,
              startDate,
              endDate,
              undefined,
              forceRefresh && seq === seqRef.current,
            )
            if (!cancelled && seq === seqRef.current) {
              setHourly(records)
            }
          } else {
            // DuckDB 未準備: フォールバックとして API 直接取得
            // （初期化完了後に DuckDB 経由に切り替わる）
            const { findNearestStation, fetchAmedasWeather } =
              await import('@/infrastructure/weather')
            let stationId = location.amedasStationId
            if (!stationId) {
              const station = await findNearestStation(location.latitude, location.longitude)
              if (!station) {
                if (!cancelled && seq === seqRef.current) {
                  setError('最寄りの AMEDAS 観測所が見つかりません')
                }
                return
              }
              stationId = station.stationId
            }
            const records = await fetchAmedasWeather(stationId, startDate, endDate)
            if (!cancelled && seq === seqRef.current) {
              setHourly(records)
            }
          }
        } catch (e: unknown) {
          if (!cancelled && seq === seqRef.current) {
            setError(e instanceof Error ? e.message : String(e))
          }
        } finally {
          if (!cancelled && seq === seqRef.current) {
            setIsLoading(false)
          }
        }
      }
      run()
    }, 50)

    return () => {
      cancelled = true
      clearTimeout(timerId)
    }
  }, [year, month, storeId, location, reloadKey, duckConn, duckDb])

  const daily = useMemo(() => aggregateHourlyToDaily(hourly), [hourly])

  const reload = useCallback(() => {
    setReloadKey((k) => k + 1)
  }, [])

  return {
    hourly,
    daily,
    isLoading,
    error,
    reload,
  }
}
