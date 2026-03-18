/**
 * 気象庁 AMEDAS 観測所テーブルクライアント
 *
 * AMEDAS 観測所テーブル（amedastable.json）から観測所メタデータを取得する。
 * 天気予報の区域解決、ETRN 観測所名マッチングに使用。
 *
 * 注: AMEDAS 天気データ（bosai/amedas/data/point）の取得は廃止済み。
 *     天気実測データは ETRN から取得する。
 */
import { getJmaBaseUrl } from './jmaApiConfig'

/** AMEDAS 観測所テーブル URL（動的解決） */
function getAmedasTableUrl(): string {
  return `${getJmaBaseUrl()}/bosai/amedas/const/amedastable.json`
}

/** リトライ設定 */
const MAX_RETRIES = 2
const INITIAL_RETRY_DELAY_MS = 1000

// ─── Station Table ───────────────────────────────────

/** AMEDAS 観測所テーブルのエントリ */
export interface AmedasStation {
  readonly stationId: string
  readonly type: string
  readonly elems: string // "11111010" = 気温,降水量,風向,風速,日照,積雪,湿度,気圧
  readonly latitude: number // 十進度
  readonly longitude: number // 十進度
  readonly altitude: number
  readonly kjName: string // 漢字名
  readonly knName: string // カタカナ名
  readonly enName: string // 英語名
}

/** 観測要素のインデックス (elems 文字列内の位置) */
const ELEM_INDEX = {
  temp: 0,
  precipitation: 1,
  windDirection: 2,
  windSpeed: 3,
  sunshine: 4,
  snow: 5,
  humidity: 6,
  pressure: 7,
} as const

/** 天気データに必要な最低限の観測要素 */
const REQUIRED_ELEMS = [ELEM_INDEX.temp, ELEM_INDEX.precipitation] as const

let cachedStationTable: readonly AmedasStation[] | null = null

/**
 * AMEDAS 観測所テーブルを取得する（キャッシュ付き）。
 */
export async function fetchStationTable(): Promise<readonly AmedasStation[]> {
  if (cachedStationTable) return cachedStationTable

  const response = await fetchJsonWithRetry(getAmedasTableUrl())
  const data = response as Record<
    string,
    {
      type: string
      elems: string
      lat: [number, number]
      lon: [number, number]
      alt: number
      kjName: string
      knName: string
      enName: string
    }
  >

  const stations: AmedasStation[] = []
  for (const [id, entry] of Object.entries(data)) {
    stations.push({
      stationId: id,
      type: entry.type,
      elems: entry.elems,
      latitude: entry.lat[0] + entry.lat[1] / 60,
      longitude: entry.lon[0] + entry.lon[1] / 60,
      altitude: entry.alt,
      kjName: entry.kjName,
      knName: entry.knName,
      enName: entry.enName,
    })
  }

  cachedStationTable = stations
  return stations
}

/** 指定した緯度経度に最も近い AMEDAS 観測所を見つける */
export async function findNearestStation(
  latitude: number,
  longitude: number,
): Promise<AmedasStation | null> {
  const stations = await fetchStationTable()

  let nearest: AmedasStation | null = null
  let minDist = Infinity

  for (const station of stations) {
    // 必須観測要素のチェック
    const hasRequired = REQUIRED_ELEMS.every((idx) => station.elems[idx] === '1')
    if (!hasRequired) continue

    const dist = haversineDistance(latitude, longitude, station.latitude, station.longitude)
    if (dist < minDist) {
      minDist = dist
      nearest = station
    }
  }

  return nearest
}

// ─── Utilities ───────────────────────────────────────

/** 2地点間のハバーサイン距離 (km) */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // 地球半径 (km)
  const toRad = (deg: number) => (deg * Math.PI) / 180

  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchJsonWithRetry(url: string): Promise<unknown> {
  let lastError: Error | undefined
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        if (response.status === 403) {
          throw new JmaAccessError(
            `JMA API がリクエストを拒否しました (403)。CORS プロキシの設定を確認してください。URL: ${url}`,
          )
        }
        throw new Error(`JMA API error: ${response.status} ${response.statusText}`)
      }
      return await response.json()
    } catch (e) {
      if (e instanceof JmaAccessError) throw e
      if (e instanceof TypeError && attempt === 0) {
        throw new JmaAccessError(
          `JMA API にアクセスできません。CORS プロキシが設定されていない可能性があります。詳細: ${e.message}`,
        )
      }
      lastError = e instanceof Error ? e : new Error(String(e))
      if (attempt < MAX_RETRIES) {
        await delay(INITIAL_RETRY_DELAY_MS * 2 ** attempt)
      }
    }
  }
  throw lastError ?? new Error('JMA API request failed')
}

/** JMA API へのアクセスが拒否された (CORS/403) ことを示すエラー */
export class JmaAccessError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JmaAccessError'
  }
}

/** テスト用: 観測所テーブルキャッシュをクリアする */
export function clearStationTableCache(): void {
  cachedStationTable = null
}
