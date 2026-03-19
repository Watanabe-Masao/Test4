/**
 * ETRN 観測所検索フック
 *
 * 都道府県ドロップダウン → 観測所ドロップダウンの2段選択を提供する。
 * infrastructure/weather の ETRN クライアントを application 層経由で公開。
 */
import { useState, useCallback, useMemo } from 'react'
import type { EtrnStation } from '@/infrastructure/weather'
import {
  searchStationsByPrefecture,
  searchLocation,
  PREFECTURE_NAMES,
} from '@/infrastructure/weather'

/** 都道府県選択肢 */
export interface PrefectureOption {
  readonly code: string
  readonly name: string
}

export interface UseEtrnStationSearchResult {
  /** 都道府県選択肢（47件、コード順） */
  readonly prefectures: readonly PrefectureOption[]
  /** 検索結果の観測所一覧 */
  readonly stations: readonly EtrnStation[]
  /** 観測所検索中 */
  readonly isSearching: boolean
  /** 都道府県を選択して観測所を検索する */
  readonly searchByPrefecture: (prefectureName: string) => Promise<void>
  /** 都道府県名からジオコーディングで緯度経度を取得する */
  readonly geocodePrefecture: (
    prefectureName: string,
  ) => Promise<{ latitude: number; longitude: number } | null>
  /** 検索結果をクリアする */
  readonly clear: () => void
}

export function useEtrnStationSearch(): UseEtrnStationSearchResult {
  const [stations, setStations] = useState<readonly EtrnStation[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const prefectures = useMemo<readonly PrefectureOption[]>(
    () =>
      Object.entries(PREFECTURE_NAMES)
        .map(([code, name]) => ({ code, name }))
        .sort((a, b) => a.code.localeCompare(b.code)),
    [],
  )

  const searchByPrefecture = useCallback(async (prefectureName: string) => {
    if (!prefectureName) {
      setStations([])
      return
    }
    setIsSearching(true)
    try {
      const all = await searchStationsByPrefecture(prefectureName)
      // 気象台・測候所（s1）のみ表示。AMeDAS（a1）は観測要素が不十分なため除外
      const results = all.filter((s) => s.stationType === 's1')
      setStations(results)
    } catch {
      setStations([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  const geocodePrefecture = useCallback(
    async (prefectureName: string): Promise<{ latitude: number; longitude: number } | null> => {
      try {
        const results = await searchLocation(prefectureName)
        if (results.length > 0) {
          return { latitude: results[0].latitude, longitude: results[0].longitude }
        }
      } catch {
        // geocoding failure is non-critical
      }
      return null
    },
    [],
  )

  const clear = useCallback(() => setStations([]), [])

  return { prefectures, stations, isSearching, searchByPrefecture, geocodePrefecture, clear }
}
