/**
 * 天気データ Hook
 *
 * 2層のデータソースを使い分ける:
 *   - ETRN（メイン）: 長期の過去日別データ（1977年〜昨日）
 *   - AMEDAS（サブ）: 直近10日の時間別データ（HourlyWeatherOverlay 用）
 *
 * データフロー:
 *   ETRN → DailyWeatherSummary（月単位で1リクエスト）
 *   AMEDAS → DuckDB キャッシュ → HourlyWeatherRecord（直近のみ）
 */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import type { AsyncDuckDB, AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { HourlyWeatherRecord, DailyWeatherSummary } from '@/domain/models'
import { aggregateHourlyToDaily } from '@/domain/calculations/weatherAggregation'
import {
  loadWeatherForStore,
  loadEtrnDailyForStore,
  getDateRange,
} from '../usecases/weather/WeatherLoadService'
import { useSettingsStore } from '../stores/settingsStore'

export interface UseWeatherResult {
  /** 時間別天気レコード（AMEDAS 由来、直近のみ） */
  readonly hourly: readonly HourlyWeatherRecord[]
  /** 日別天気サマリ（ETRN 由来 or AMEDAS 集約） */
  readonly daily: readonly DailyWeatherSummary[]
  /** 取得中フラグ */
  readonly isLoading: boolean
  /** エラーメッセージ（取得失敗時） */
  readonly error: string | null
  /** 天気データを手動で再取得する（キャッシュ無視） */
  readonly reload: () => void
}

/** 天気データの内部状態（useState 統合用） */
interface WeatherState {
  readonly hourly: readonly HourlyWeatherRecord[]
  readonly etrnDaily: readonly DailyWeatherSummary[]
  readonly isLoading: boolean
  readonly error: string | null
}

const INITIAL_STATE: WeatherState = {
  hourly: [],
  etrnDaily: [],
  isLoading: false,
  error: null,
}

/**
 * 天気データを取得・集約する Hook。
 *
 * ETRN を優先的に使用し、日別データを直接取得する。
 * ETRN が失敗した場合は AMEDAS にフォールバックする。
 */
export function useWeatherData(
  year: number,
  month: number,
  storeId: string,
  duckConn?: AsyncDuckDBConnection | null,
  duckDb?: AsyncDuckDB | null,
): UseWeatherResult {
  const storeLocations = useSettingsStore((s) => s.settings.storeLocations)
  const updateSettings = useSettingsStore((s) => s.updateSettings)
  const [state, setState] = useState<WeatherState>(INITIAL_STATE)
  const [reloadKey, setReloadKey] = useState(0)
  const seqRef = useRef(0)

  const location = storeLocations[storeId]

  useEffect(() => {
    const seq = ++seqRef.current
    if (!location) return

    let cancelled = false

    const timerId = setTimeout(() => {
      if (cancelled) return
      setState((s) => ({ ...s, isLoading: true, error: null }))

      const run = async () => {
        try {
          const result = await loadEtrnDailyForStore(storeId, location, year, month)
          if (cancelled || seq !== seqRef.current) return

          // 解決された観測所情報を StoreLocation にキャッシュ
          if (result.resolvedStation || result.resolvedAmedas || result.resolvedOfficeCode) {
            cacheResolvedStation(location, storeId, storeLocations, updateSettings, result)
          }

          if (result.daily.length > 0) {
            setState({ hourly: [], etrnDaily: result.daily, isLoading: false, error: null })
            return
          }

          // ETRN が空 → AMEDAS フォールバック
          const hourly = await fetchAmedasFallback(
            location,
            year,
            month,
            storeId,
            duckConn,
            duckDb,
            reloadKey,
          )
          if (!cancelled && seq === seqRef.current) {
            setState({ hourly, etrnDaily: [], isLoading: false, error: null })
          }
        } catch {
          if (cancelled || seq !== seqRef.current) return
          try {
            const hourly = await fetchAmedasFallback(
              location,
              year,
              month,
              storeId,
              duckConn,
              duckDb,
              reloadKey,
            )
            if (!cancelled && seq === seqRef.current) {
              setState({ hourly, etrnDaily: [], isLoading: false, error: null })
            }
          } catch (e2: unknown) {
            if (!cancelled && seq === seqRef.current) {
              setState((s) => ({
                ...s,
                isLoading: false,
                error: e2 instanceof Error ? e2.message : String(e2),
              }))
            }
          }
        }
      }
      run()
    }, 50)

    return () => {
      cancelled = true
      clearTimeout(timerId)
    }
  }, [year, month, storeId, location, reloadKey, duckConn, duckDb, storeLocations, updateSettings])

  const daily = useMemo(() => {
    if (state.etrnDaily.length > 0) return state.etrnDaily
    return aggregateHourlyToDaily(state.hourly)
  }, [state.etrnDaily, state.hourly])

  const reload = useCallback(() => {
    setState(INITIAL_STATE)
    setReloadKey((k) => k + 1)
  }, [])

  return { hourly: state.hourly, daily, isLoading: state.isLoading, error: state.error, reload }
}

// ─── Helpers ────────────────────────────────────────

function cacheResolvedStation(
  location: Parameters<typeof loadEtrnDailyForStore>[1],
  storeId: string,
  storeLocations: Readonly<Record<string, typeof location>>,
  updateSettings: (patch: Record<string, unknown>) => void,
  result: Awaited<ReturnType<typeof loadEtrnDailyForStore>>,
): void {
  const updatedLocation = {
    ...location,
    ...(result.resolvedStation && {
      etrnPrecNo: result.resolvedStation.precNo,
      etrnBlockNo: result.resolvedStation.blockNo,
      etrnStationType: result.resolvedStation.stationType,
    }),
    ...(result.resolvedAmedas && {
      amedasStationId: result.resolvedAmedas.stationId,
      amedasStationName: result.resolvedAmedas.stationName,
    }),
    ...(result.resolvedOfficeCode && {
      forecastOfficeCode: result.resolvedOfficeCode,
    }),
  }
  updateSettings({
    storeLocations: { ...storeLocations, [storeId]: updatedLocation },
  })
}

async function fetchAmedasFallback(
  location: {
    readonly latitude: number
    readonly longitude: number
    readonly amedasStationId?: string
  },
  year: number,
  month: number,
  storeId: string,
  duckConn: AsyncDuckDBConnection | null | undefined,
  duckDb: AsyncDuckDB | null | undefined,
  reloadKey: number,
): Promise<readonly HourlyWeatherRecord[]> {
  const { startDate, endDate } = getDateRange(year, month)
  if (startDate > endDate) return []

  if (duckConn && duckDb) {
    return loadWeatherForStore(
      duckConn,
      duckDb,
      storeId,
      location as Parameters<typeof loadWeatherForStore>[3],
      startDate,
      endDate,
      undefined,
      reloadKey > 0,
    )
  }

  const { findNearestStation, fetchAmedasWeather } = await import('@/infrastructure/weather')
  let stationId = location.amedasStationId
  if (!stationId) {
    const station = await findNearestStation(location.latitude, location.longitude)
    if (!station) return []
    stationId = station.stationId
  }
  return fetchAmedasWeather(stationId, startDate, endDate)
}
