/**
 * 天気データ Hook
 *
 * ETRN（過去の気象データ検索）から日別天気データを取得する。
 *
 * データフロー:
 *   ETRN → DailyWeatherSummary（月単位で1リクエスト）
 *
 * @responsibility R:unclassified
 */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import type { DailyWeatherSummary } from '@/domain/models/record'
import { loadEtrnDailyForStore } from '../usecases/weather/WeatherLoadService'
import { useSettingsStore } from '../stores/settingsStore'
import { useWeatherAdapter } from '@/application/context/useWeatherAdapter'

export interface UseWeatherResult {
  /** 日別天気サマリ（ETRN 由来） */
  readonly daily: readonly DailyWeatherSummary[]
  /** 取得中フラグ */
  readonly isLoading: boolean
  /** エラーメッセージ（取得失敗時） */
  readonly error: string | null
  /** 天気データを手動で再取得する */
  readonly reload: () => void
}

/** 天気データの内部状態（useState 統合用） */
interface WeatherState {
  readonly etrnDaily: readonly DailyWeatherSummary[]
  readonly isLoading: boolean
  readonly error: string | null
}

const INITIAL_STATE: WeatherState = {
  etrnDaily: [],
  isLoading: false,
  error: null,
}

/**
 * 天気データを取得する Hook。
 *
 * ETRN から月単位の日別天気データを取得する。
 */
export function useWeatherData(year: number, month: number, storeId: string): UseWeatherResult {
  const weather = useWeatherAdapter()
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
          const result = await loadEtrnDailyForStore(weather, storeId, location, year, month)
          if (cancelled || seq !== seqRef.current) return

          // 解決された ETRN 観測所情報を StoreLocation にキャッシュ
          if (result.resolvedStation) {
            cacheResolvedStation(location, storeId, storeLocations, updateSettings, result)
          }

          setState({ etrnDaily: result.daily, isLoading: false, error: null })
        } catch (e: unknown) {
          if (cancelled || seq !== seqRef.current) return
          setState((s) => ({
            ...s,
            isLoading: false,
            error: e instanceof Error ? e.message : String(e),
          }))
        }
      }
      run()
    }, 50)

    return () => {
      cancelled = true
      clearTimeout(timerId)
    }
  }, [weather, year, month, storeId, location, reloadKey, storeLocations, updateSettings])

  const daily = useMemo(() => state.etrnDaily, [state.etrnDaily])

  const reload = useCallback(() => {
    setState(INITIAL_STATE)
    setReloadKey((k) => k + 1)
  }, [])

  return { daily, isLoading: state.isLoading, error: state.error, reload }
}

// ─── Helpers ────────────────────────────────────────

function cacheResolvedStation(
  location: Parameters<typeof loadEtrnDailyForStore>[2],
  storeId: string,
  storeLocations: Readonly<Record<string, typeof location>>,
  updateSettings: (patch: Record<string, unknown>) => void,
  result: Awaited<ReturnType<typeof loadEtrnDailyForStore>>,
): void {
  if (!result.resolvedStation) return
  const updatedLocation = {
    ...location,
    etrnPrecNo: result.resolvedStation.precNo,
    etrnBlockNo: result.resolvedStation.blockNo,
    etrnStationType: result.resolvedStation.stationType,
  }
  updateSettings({
    storeLocations: { ...storeLocations, [storeId]: updatedLocation },
  })
}
