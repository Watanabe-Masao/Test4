/**
 * ETRN 観測所検索フック
 *
 * 静的リスト（etrnStations.json）から都道府県→観測所の2段選択を提供する。
 * HTML スクレイピング不要。ネットワークリクエスト不要で即座に結果を返す。
 */
import { useMemo } from 'react'
import type { EtrnStation, EtrnStationEntry } from '@/domain/ports/WeatherPort'
import { useWeatherAdapter } from '@/application/context/useAdapters'

/** 都道府県選択肢 */
export interface PrefectureOption {
  readonly code: string
  readonly name: string
}

export interface UseEtrnStationSearchResult {
  /** 都道府県選択肢（観測所が存在する都道府県のみ） */
  readonly prefectures: readonly PrefectureOption[]
  /** 指定都道府県の観測所一覧を返す（同期） */
  readonly getStations: (prefectureName: string) => readonly EtrnStation[]
  /** 観測所から緯度経度を取得する（同期） */
  readonly getCoordinates: (blockNo: string) => { latitude: number; longitude: number } | null
}

/** 度分 → 10進度 変換 */
function dmsToDecimal(dm: readonly [number, number]): number {
  return dm[0] + dm[1] / 60
}

/** 静的リストから都道府県→観測所を検索するフック */
export function useEtrnStationSearch(): UseEtrnStationSearchResult {
  const weatherAdapter = useWeatherAdapter()
  const stations: readonly EtrnStationEntry[] = useMemo(
    () => weatherAdapter.getStaticStationList(),
    [weatherAdapter],
  )

  const prefectures = useMemo<readonly PrefectureOption[]>(() => {
    const seen = new Set<string>()
    const result: PrefectureOption[] = []
    for (const s of stations) {
      if (!seen.has(s.prefecture)) {
        seen.add(s.prefecture)
        result.push({ code: String(s.precNo), name: s.prefecture })
      }
    }
    return result
  }, [stations])

  const getStations = useMemo(
    () =>
      (prefectureName: string): readonly EtrnStation[] =>
        stations
          .filter((s) => s.prefecture === prefectureName)
          .map((s) => ({
            precNo: s.precNo,
            blockNo: s.blockNo,
            stationType: 's1' as const,
            stationName: s.name,
          })),
    [stations],
  )

  const getCoordinates = useMemo(
    () =>
      (blockNo: string): { latitude: number; longitude: number } | null => {
        const s = stations.find((e) => e.blockNo === blockNo)
        if (!s) return null
        return { latitude: dmsToDecimal(s.lat), longitude: dmsToDecimal(s.lon) }
      },
    [stations],
  )

  return { prefectures, getStations, getCoordinates }
}
