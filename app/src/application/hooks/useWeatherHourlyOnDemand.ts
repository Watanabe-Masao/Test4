/**
 * 天気時間別データのオンデマンド取得 hook
 *
 * WeatherWidget のモーダル用。日付クリック時に ETRN から時間別天気を取得する。
 * Presentation 層が外部 API を直接呼ばないための Application 層フック。
 *
 * @responsibility R:unclassified
 */
import { useState, useCallback } from 'react'
import type { AlignmentMode } from '@/domain/models/calendar'
import type { HourlyWeatherRecord, StoreLocation } from '@/domain/models/record'
import { loadEtrnHourlyForStore } from '@/application/usecases/weather/WeatherLoadService'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { useWeatherAdapter } from '@/application/context/useWeatherAdapter'

/** 時間別データの取得状態 */
export interface HourlyFetchState {
  readonly status: 'idle' | 'loading' | 'done' | 'error'
  readonly records: readonly HourlyWeatherRecord[]
  readonly error?: string
}

/**
 * 当年 dateKey から前年の対応日を算出する
 *
 * sameDayOfWeek: anchor = 前年同日 → ±7日の候補から同じ曜日の最近傍を選択。
 */
function resolvePrevYearDate(
  dateKey: string,
  policy: AlignmentMode,
): { year: number; month: number; day: number; dateKey: string } {
  const d = new Date(dateKey + 'T00:00:00')
  if (policy === 'sameDayOfWeek') {
    const anchor = new Date(d.getFullYear() - 1, d.getMonth(), d.getDate())
    const targetDow = d.getDay()
    let best = anchor
    let bestDist = Infinity
    for (let diff = -7; diff <= 7; diff++) {
      const c = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + diff)
      if (c.getDay() !== targetDow) continue
      const dist = Math.abs(c.getTime() - anchor.getTime())
      if (dist < bestDist || (dist === bestDist && c.getTime() >= anchor.getTime())) {
        bestDist = dist
        best = c
      }
    }
    const bYear = best.getFullYear()
    const bMonth = best.getMonth() + 1
    const bDay = best.getDate()
    const bMm = String(bMonth).padStart(2, '0')
    const bDd = String(bDay).padStart(2, '0')
    return { year: bYear, month: bMonth, day: bDay, dateKey: `${bYear}-${bMm}-${bDd}` }
  }
  const year = d.getFullYear() - 1
  const month = d.getMonth() + 1
  const day = d.getDate()
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return { year, month, day, dateKey: `${year}-${mm}-${dd}` }
}

export interface UseWeatherHourlyOnDemandResult {
  /** 当年の時間別天気キャッシュ */
  readonly hourlyCache: Readonly<Record<string, HourlyFetchState>>
  /** 前年の時間別天気キャッシュ */
  readonly prevHourlyCache: Readonly<Record<string, HourlyFetchState>>
  /** 当年データを取得する */
  readonly fetchHourly: (dateKey: string, year: number, month: number) => void
  /** 前年データを取得する */
  readonly fetchPrevHourly: (dateKey: string) => void
  /** 前年日付を解決する */
  readonly resolvePrevDate: (dateKey: string) => {
    year: number
    month: number
    day: number
    dateKey: string
  }
}

/**
 * 天気時間別データのオンデマンド取得 hook
 *
 * @param storeId 店舗ID
 * @param policy 比較ポリシー（sameDayOfWeek / sameDate）
 */
export function useWeatherHourlyOnDemand(
  storeId: string,
  policy: AlignmentMode,
): UseWeatherHourlyOnDemandResult {
  const weather = useWeatherAdapter()
  const storeLocations = useSettingsStore((s) => s.settings.storeLocations)
  const location: StoreLocation | undefined = storeLocations[storeId]

  const [hourlyCache, setHourlyCache] = useState<Record<string, HourlyFetchState>>({})
  const [prevHourlyCache, setPrevHourlyCache] = useState<Record<string, HourlyFetchState>>({})

  const fetchHourly = useCallback(
    (dateKey: string, year: number, month: number) => {
      if (hourlyCache[dateKey]?.status === 'done' || hourlyCache[dateKey]?.status === 'loading')
        return
      if (!location) return

      const day = parseInt(dateKey.slice(8), 10)
      setHourlyCache((prev) => ({
        ...prev,
        [dateKey]: { status: 'loading', records: [] },
      }))
      loadEtrnHourlyForStore(weather, storeId, location, year, month, [day])
        .then((result) => {
          setHourlyCache((prev) => ({
            ...prev,
            [dateKey]: { status: 'done', records: result.hourly },
          }))
        })
        .catch((err) => {
          setHourlyCache((prev) => ({
            ...prev,
            [dateKey]: {
              status: 'error',
              records: [],
              error: err instanceof Error ? err.message : String(err),
            },
          }))
        })
    },
    [hourlyCache, weather, storeId, location],
  )

  const fetchPrevHourly = useCallback(
    (dateKey: string) => {
      if (
        prevHourlyCache[dateKey]?.status === 'done' ||
        prevHourlyCache[dateKey]?.status === 'loading'
      )
        return
      if (!location) return
      const prev = resolvePrevYearDate(dateKey, policy)
      setPrevHourlyCache((c) => ({
        ...c,
        [dateKey]: { status: 'loading', records: [] },
      }))
      loadEtrnHourlyForStore(weather, storeId, location, prev.year, prev.month, [prev.day])
        .then((result) => {
          setPrevHourlyCache((c) => ({
            ...c,
            [dateKey]: { status: 'done', records: result.hourly },
          }))
        })
        .catch((err) => {
          setPrevHourlyCache((c) => ({
            ...c,
            [dateKey]: {
              status: 'error',
              records: [],
              error: err instanceof Error ? err.message : String(err),
            },
          }))
        })
    },
    [prevHourlyCache, weather, storeId, policy, location],
  )

  const resolvePrevDate = useCallback(
    (dateKey: string) => resolvePrevYearDate(dateKey, policy),
    [policy],
  )

  return { hourlyCache, prevHourlyCache, fetchHourly, fetchPrevHourly, resolvePrevDate }
}
