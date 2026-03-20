/**
 * ジオコーディング検索フック
 *
 * infrastructure/weather/geocodingClient を application 層経由で公開する。
 * presentation 層から infrastructure への直接依存を回避するためのブリッジ。
 */
import { useState, useCallback } from 'react'
import type { GeocodingResult } from '@/domain/models/record'
import { weatherAdapter } from '@/application/adapters/weatherAdapter'

export interface UseGeocodeResult {
  readonly candidates: readonly GeocodingResult[]
  readonly isSearching: boolean
  readonly search: (query: string) => Promise<void>
  readonly clear: () => void
}

export function useGeocode(): UseGeocodeResult {
  const [candidates, setCandidates] = useState<readonly GeocodingResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const search = useCallback(async (query: string) => {
    if (!query.trim()) return
    setIsSearching(true)
    try {
      const results = await weatherAdapter.searchLocation(query.trim())
      setCandidates(results)
    } catch {
      setCandidates([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  const clear = useCallback(() => {
    setCandidates([])
  }, [])

  return { candidates, isSearching, search, clear }
}
