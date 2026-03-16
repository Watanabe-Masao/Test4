/**
 * Open-Meteo Geocoding API クライアント
 *
 * 店舗名から緯度経度を検索する。
 * API キー不要・CORS 対応・無料。
 *
 * @see https://open-meteo.com/en/docs/geocoding-api
 */
import type { GeocodingResult } from '@/domain/models'

const GEOCODING_API_BASE = 'https://geocoding-api.open-meteo.com/v1/search'
const MAX_RESULTS = 5
const LANGUAGE = 'ja'

/**
 * 地名で位置情報を検索する。
 *
 * @param name 検索語（店舗名・地名・住所の一部）
 * @returns 候補リスト（最大5件）。該当なしの場合は空配列
 */
export async function searchLocation(name: string): Promise<readonly GeocodingResult[]> {
  if (!name.trim()) return []

  const params = new URLSearchParams({
    name: name.trim(),
    count: String(MAX_RESULTS),
    language: LANGUAGE,
    format: 'json',
  })

  const response = await fetch(`${GEOCODING_API_BASE}?${params}`)
  if (!response.ok) {
    throw new Error(`Geocoding API error: ${response.status} ${response.statusText}`)
  }

  const data: { results?: RawGeocodingResult[] } = await response.json()
  if (!data.results) return []

  return data.results.map(
    (r): GeocodingResult => ({
      name: r.name,
      latitude: r.latitude,
      longitude: r.longitude,
      country: r.country ?? '',
      admin1: r.admin1,
      admin2: r.admin2,
    }),
  )
}

/** Open-Meteo Geocoding API のレスポンス型（内部用） */
interface RawGeocodingResult {
  readonly name: string
  readonly latitude: number
  readonly longitude: number
  readonly country?: string
  readonly admin1?: string
  readonly admin2?: string
}
