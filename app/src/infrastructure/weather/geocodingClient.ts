/**
 * 国土地理院 住所検索API クライアント
 *
 * 店舗名・地名から緯度経度を検索する。
 * API キー不要。日本国内の住所・地名に特化。
 *
 * @see https://msearch.gsi.go.jp/address-search/AddressSearch
 */
import type { GeocodingResult } from '@/domain/models'

const GSI_API_BASE = 'https://msearch.gsi.go.jp/address-search/AddressSearch'
const MAX_RESULTS = 5

/** 国土地理院 住所検索API の GeoJSON レスポンス要素 */
interface GsiFeature {
  readonly geometry: {
    readonly coordinates: readonly [number, number] // [longitude, latitude]
    readonly type: string
  }
  readonly type: string
  readonly properties: {
    readonly title: string
    readonly addressCode?: string
  }
}

/**
 * 地名で位置情報を検索する。
 *
 * @param name 検索語（店舗名・地名・住所の一部）
 * @returns 候補リスト（最大5件）。該当なしの場合は空配列
 */
export async function searchLocation(name: string): Promise<readonly GeocodingResult[]> {
  if (!name.trim()) return []

  const params = new URLSearchParams({ q: name.trim() })

  const response = await fetch(`${GSI_API_BASE}?${params}`)
  if (!response.ok) {
    throw new Error(`国土地理院 住所検索API error: ${response.status} ${response.statusText}`)
  }

  const data: GsiFeature[] = await response.json()
  if (!Array.isArray(data) || data.length === 0) return []

  return data.slice(0, MAX_RESULTS).map(
    (f): GeocodingResult => ({
      name: f.properties.title,
      latitude: f.geometry.coordinates[1], // GeoJSON: [lon, lat]
      longitude: f.geometry.coordinates[0],
      country: '日本',
    }),
  )
}
