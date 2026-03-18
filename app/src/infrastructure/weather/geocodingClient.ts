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
    readonly muniCd?: string // 市区町村コード（先頭2桁 = 都道府県コード 01-47）
    readonly lv01Nm?: string // 町丁目名
  }
}

/** 都道府県コード（01-47）→ 都道府県名 */
const PREFECTURE_NAMES: Readonly<Record<string, string>> = {
  '01': '北海道',
  '02': '青森県',
  '03': '岩手県',
  '04': '宮城県',
  '05': '秋田県',
  '06': '山形県',
  '07': '福島県',
  '08': '茨城県',
  '09': '栃木県',
  '10': '群馬県',
  '11': '埼玉県',
  '12': '千葉県',
  '13': '東京都',
  '14': '神奈川県',
  '15': '新潟県',
  '16': '富山県',
  '17': '石川県',
  '18': '福井県',
  '19': '山梨県',
  '20': '長野県',
  '21': '岐阜県',
  '22': '静岡県',
  '23': '愛知県',
  '24': '三重県',
  '25': '滋賀県',
  '26': '京都府',
  '27': '大阪府',
  '28': '兵庫県',
  '29': '奈良県',
  '30': '和歌山県',
  '31': '鳥取県',
  '32': '島根県',
  '33': '岡山県',
  '34': '広島県',
  '35': '山口県',
  '36': '徳島県',
  '37': '香川県',
  '38': '愛媛県',
  '39': '高知県',
  '40': '福岡県',
  '41': '佐賀県',
  '42': '長崎県',
  '43': '熊本県',
  '44': '大分県',
  '45': '宮崎県',
  '46': '鹿児島県',
  '47': '沖縄県',
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
  const muniCd = data.results?.muniCd
  console.debug('[Weather:Geocode] 逆ジオコーディング応答: muniCd=%s', muniCd)

  if (!muniCd || muniCd.length < 2) {
    console.warn('[Weather:Geocode] 逆ジオコーディング: muniCd が取得できません')
    return null
  }

  // muniCd の先頭2桁が都道府県コード（01-47）
  // muniCd は通常5桁だが、北海道等で4桁の場合があるため padStart で正規化
  const prefCode = muniCd.padStart(5, '0').slice(0, 2)
  const prefectureName = PREFECTURE_NAMES[prefCode]
  if (!prefectureName) {
    console.warn('[Weather:Geocode] 逆ジオコーディング: 不明な都道府県コード=%s', prefCode)
    return null
  }

  console.debug('[Weather:Geocode] 逆ジオコーディング完了: %s (muniCd=%s)', prefectureName, muniCd)
  return { prefectureName }
}
