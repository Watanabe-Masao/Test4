/**
 * 週間天気予報 Hook
 *
 * StoreLocation から予報区域を自動解決し、
 * 気象庁 Forecast API から週間天気予報を取得する。
 *
 * 予報データはキャッシュせず毎回最新を取得する。
 * 解決した予報区域コードは settingsStore に保存してキャッシュする。
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import type { DailyForecast, ForecastAreaResolution } from '@/domain/models'
import { loadForecastForStore } from '../usecases/weather/ForecastLoadService'
import { useSettingsStore } from '../stores/settingsStore'

export interface UseWeatherForecastResult {
  /** 週間天気予報（最大7日分） */
  readonly forecasts: readonly DailyForecast[]
  /** 予報区域の解決情報 */
  readonly resolution: ForecastAreaResolution | null
  /** 取得中フラグ */
  readonly isLoading: boolean
  /** エラーメッセージ */
  readonly error: string | null
  /** 手動で再取得する */
  readonly reload: () => void
}

/**
 * 週間天気予報を取得する Hook。
 *
 * @param storeId 店舗ID
 */
export function useWeatherForecast(storeId: string): UseWeatherForecastResult {
  const storeLocations = useSettingsStore((s) => s.settings.storeLocations)
  const updateSettings = useSettingsStore((s) => s.updateSettings)
  const [state, setState] = useState<{
    readonly forecasts: readonly DailyForecast[]
    readonly resolution: ForecastAreaResolution | null
    readonly isLoading: boolean
    readonly error: string | null
  }>({ forecasts: [], resolution: null, isLoading: false, error: null })
  const [reloadKey, setReloadKey] = useState(0)
  const seqRef = useRef(0)

  const location = storeLocations[storeId]

  useEffect(() => {
    const seq = ++seqRef.current

    if (!location) return

    let cancelled = false

    setState((s) => ({ ...s, isLoading: true, error: null }))

    const run = async () => {
      try {
        const result = await loadForecastForStore(location)

        if (cancelled || seq !== seqRef.current) return

        setState({
          forecasts: result.forecasts,
          resolution: result.resolution,
          isLoading: false,
          error: null,
        })

        // 解決した予報区域コードを StoreLocation にキャッシュ
        if (
          result.resolution &&
          (!location.forecastOfficeCode || !location.weekAreaCode)
        ) {
          const updatedLocation = {
            ...location,
            forecastOfficeCode: result.resolution.officeCode,
            weekAreaCode: result.resolution.weekAreaCode,
          }
          updateSettings({
            storeLocations: {
              ...storeLocations,
              [storeId]: updatedLocation,
            },
          })
        }
      } catch (e: unknown) {
        if (!cancelled && seq === seqRef.current) {
          setState((s) => ({
            ...s,
            isLoading: false,
            error: e instanceof Error ? e.message : String(e),
          }))
        }
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [storeId, location, reloadKey, storeLocations, updateSettings])

  const reload = useCallback(() => {
    setReloadKey((k) => k + 1)
  }, [])

  return { forecasts: state.forecasts, resolution: state.resolution, isLoading: state.isLoading, error: state.error, reload }
}
