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
const GSI_REVERSE_API_BASE = 'https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress'
const MAX_RESULTS = 5

/** 逆ジオコーディング結果 */
export interface ReverseGeocodeResult {
  readonly prefectureName: string
}

/** 国土地理院 逆ジオコーディングAPI のレスポンス */
interface GsiReverseResponse {
  readonly results?: {
    readonly prefNm?: string
  }
}

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

/**
 * 緯度経度から都道府県名を取得する（逆ジオコーディング）。
 *
 * 国土地理院の逆ジオコーディングAPIを使用。
 *
 * @param latitude 緯度
 * @param longitude 経度
 * @returns 都道府県名。取得失敗時は null
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<ReverseGeocodeResult | null> {
  const url = `${GSI_REVERSE_API_BASE}?lat=${latitude}&lon=${longitude}`
  console.debug('[Weather:Geocode] 逆ジオコーディング: lat=%f lon=%f', latitude, longitude)

  const response = await fetch(url)
  if (!response.ok) {
    console.warn('[Weather:Geocode] 逆ジオコーディングAPI error: %d', response.status)
    return null
  }

  const data: GsiReverseResponse = await response.json()
  const prefectureName = data.results?.prefNm
  if (!prefectureName) {
    console.warn('[Weather:Geocode] 逆ジオコーディング: 都道府県名が取得できません')
    return null
  }

  console.debug('[Weather:Geocode] 逆ジオコーディング完了: %s', prefectureName)
  return { prefectureName }
}
