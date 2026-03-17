/**
 * 天気データ Hook
 *
 * 指定した年月・店舗の天気データを取得し、
 * 時間別レコードと日別サマリを提供する。
 */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import type { HourlyWeatherRecord, DailyWeatherSummary } from '@/domain/models'
import { aggregateHourlyToDaily } from '@/domain/calculations/weatherAggregation'
import { loadWeatherData, getDateRange } from '../usecases/weather/WeatherLoadService'
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
  /** 天気データを手動で再取得する */
  readonly reload: () => void
}

/**
 * 天気データを取得・集約する Hook。
 *
 * storeLocations に緯度経度が設定されている場合のみ取得する。
 * 結果は useMemo でキャッシュし、日別サマリは domain 純粋関数で導出する。
 *
 * @param year 対象年
 * @param month 対象月 (1-12)
 * @param storeId 店舗ID
 */
export function useWeatherData(year: number, month: number, storeId: string): UseWeatherResult {
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

      const locations = { [storeId]: location }

      const run = async () => {
        try {
          const result = await loadWeatherData(locations, startDate, endDate)
          if (!cancelled && seq === seqRef.current) {
            setHourly(result.get(storeId) ?? [])
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
  }, [year, month, storeId, location, reloadKey])

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
