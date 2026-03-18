/** 気象庁 AMEDAS JSON API クライアント — プロキシ経由でアクセス（jmaApiConfig.ts 参照） */
import type { HourlyWeatherRecord } from '@/domain/models'
import { deriveWeatherCode } from '@/domain/calculations/weatherAggregation'
import { getJmaBaseUrl } from './jmaApiConfig'

/** AMEDAS 観測所テーブル URL（動的解決） */
function getAmedasTableUrl(): string {
  return `${getJmaBaseUrl()}/bosai/amedas/const/amedastable.json`
}

/** AMEDAS ポイントデータ URL ベース（動的解決） */
function getAmedasPointUrl(): string {
  return `${getJmaBaseUrl()}/bosai/amedas/data/point`
}

/** 3時間ブロックの開始時刻 */
const H3_BLOCKS = ['00', '03', '06', '09', '12', '15', '18', '21'] as const

/** リクエスト間の遅延 (ms) — JMA サーバーへの配慮 */
const REQUEST_DELAY_MS = 100

/** リトライ設定 */
const MAX_RETRIES = 2
const INITIAL_RETRY_DELAY_MS = 1000

/** 全ブロック 404 連続時の打ち切り日数 */
const MAX_CONSECUTIVE_NOT_FOUND_DAYS = 1

/** AMEDAS bosai API のデータ保持期間（日数）— これより古いデータは 404 になる */
const AMEDAS_DATA_RETENTION_DAYS = 10

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

  const response = await fetchWithRetry(getAmedasTableUrl())
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

// ─── Point Data ──────────────────────────────────────

/** AMEDAS 観測値: [値, 品質フラグ] */
type AmedasValue = readonly [number, number]

/** AMEDAS ポイントデータの1レコード */
interface AmedasPointRecord {
  readonly temp?: AmedasValue
  readonly humidity?: AmedasValue
  readonly precipitation10m?: AmedasValue
  readonly precipitation1h?: AmedasValue
  readonly wind?: AmedasValue // m/s
  readonly windDirection?: AmedasValue
  readonly sun10m?: AmedasValue // minutes (0-10)
  readonly sun1h?: AmedasValue // hours (0.0-1.0)
  readonly pressure?: AmedasValue
  readonly normalPressure?: AmedasValue
  readonly snow?: AmedasValue
  readonly weather?: AmedasValue
}

/** AMEDAS 3時間ブロックのレスポンス: timestamp → record */
type AmedasPointResponse = Record<string, AmedasPointRecord>

/** 指定した AMEDAS 観測所・日付範囲の天気データを時間別レコードとして取得する */
export async function fetchAmedasWeather(
  stationId: string,
  startDate: string,
  endDate: string,
  onProgress?: (progress: number) => void,
): Promise<readonly HourlyWeatherRecord[]> {
  // 境界検証: AMEDAS bosai API は直近約2週間分のみ提供する。
  // 未来日付は昨日にクランプし、古すぎる日付は保持期間の始点にクランプする。
  const now = Date.now()
  const yesterday = formatDateStr(new Date(now - 24 * 60 * 60 * 1000))
  const oldestAvailable = formatDateStr(
    new Date(now - AMEDAS_DATA_RETENTION_DAYS * 24 * 60 * 60 * 1000),
  )
  const clampedStart = startDate < oldestAvailable ? oldestAvailable : startDate
  const clampedEnd = endDate > yesterday ? yesterday : endDate

  if (clampedStart > clampedEnd) {
    onProgress?.(1)
    return []
  }

  const dates = generateDateRange(clampedStart, clampedEnd)

  if (dates.length === 0) {
    onProgress?.(1)
    return []
  }

  const pointUrl = getAmedasPointUrl()
  const totalBlocks = dates.length * H3_BLOCKS.length
  let completedBlocks = 0
  const allRecords: HourlyWeatherRecord[] = []

  // 新しい日付から逆順にフェッチし、連続 404 で古い日付を打ち切る
  let consecutiveNotFoundDays = 0

  for (let dayIdx = dates.length - 1; dayIdx >= 0; dayIdx--) {
    const dateStr = dates[dayIdx]
    const yyyymmdd = dateStr.replace(/-/g, '')
    let dayHasData = false

    for (const h3 of H3_BLOCKS) {
      try {
        const url = `${pointUrl}/${stationId}/${yyyymmdd}_${h3}.json`
        const data = (await fetchWithRetry(url)) as AmedasPointResponse

        const hourlyRecords = parsePointBlock(dateStr, data)
        allRecords.push(...hourlyRecords)
        dayHasData = true
      } catch (e) {
        // 404（データ未公開）の場合はその日の残りブロックもスキップ
        if (e instanceof AmedasNotFoundError) {
          completedBlocks += H3_BLOCKS.length - H3_BLOCKS.indexOf(h3)
          break
        }
        // CORS/ネットワークエラーの場合は即座に全体を中断
        if (e instanceof JmaAccessError) {
          throw e
        }
        // その他のエラー（一時的な障害等）はスキップして次へ
      }

      completedBlocks++
      onProgress?.(completedBlocks / totalBlocks)

      // JMA サーバーへの配慮
      if (completedBlocks < totalBlocks) {
        await delay(REQUEST_DELAY_MS)
      }
    }

    if (dayHasData) {
      consecutiveNotFoundDays = 0
    } else {
      consecutiveNotFoundDays++
      // 連続して N日分データが無い場合、それ以前の日付もデータなしと判断
      if (consecutiveNotFoundDays >= MAX_CONSECUTIVE_NOT_FOUND_DAYS) {
        completedBlocks = totalBlocks
        onProgress?.(1)
        break
      }
    }
  }

  return allRecords
}

/** 3時間ブロックのレスポンスを HourlyWeatherRecord に変換（正時のみ抽出） */
function parsePointBlock(dateKey: string, data: AmedasPointResponse): HourlyWeatherRecord[] {
  const records: HourlyWeatherRecord[] = []

  // タイムスタンプをソートして処理
  const timestamps = Object.keys(data).sort()

  // 正時 (:00) のタイムスタンプを抽出 — "YYYYMMDDHHmmss" の mm が "00"
  const hourlyTimestamps = timestamps.filter((ts) => ts.slice(10, 12) === '00')

  for (const ts of hourlyTimestamps) {
    const record = data[ts]
    if (!record) continue

    const hour = parseInt(ts.slice(8, 10), 10)
    const temp = extractValue(record.temp)
    const precipitation = extractValue(record.precipitation1h)
    const sunHours = extractValue(record.sun1h)

    records.push({
      dateKey,
      hour,
      temperature: temp,
      humidity: extractValue(record.humidity),
      precipitation,
      windSpeed: extractValue(record.wind) * 3.6, // m/s → km/h
      weatherCode: deriveWeatherCode(precipitation, sunHours),
      sunshineDuration: sunHours * 3600, // hours → seconds
    })
  }

  return records
}

/** AMEDAS [値, 品質フラグ] から値を抽出。null/undefined → 0 */
function extractValue(v: AmedasValue | undefined): number {
  if (!v) return 0
  const val = v[0]
  return val != null && Number.isFinite(val) ? val : 0
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

/** Date を YYYY-MM-DD 文字列に変換 */
function formatDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** YYYY-MM-DD 形式の日付範囲を生成 */
function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')

  const current = new Date(start)
  while (current <= end) {
    dates.push(formatDateStr(current))
    current.setDate(current.getDate() + 1)
  }

  return dates
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithRetry(url: string): Promise<unknown> {
  let lastError: Error | undefined
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        // 404 はデータ未公開を示す — リトライしても回復しない
        if (response.status === 404) {
          throw new AmedasNotFoundError(url)
        }
        // 403 はホスト制限（CORS プロキシ未設定）— リトライしても回復しない
        if (response.status === 403) {
          throw new JmaAccessError(
            `JMA API がリクエストを拒否しました (403)。CORS プロキシの設定を確認してください。URL: ${url}`,
          )
        }
        throw new Error(`AMEDAS API error: ${response.status} ${response.statusText}`)
      }
      return await response.json()
    } catch (e) {
      // 回復不能なエラーはリトライせず即座に伝播
      if (e instanceof AmedasNotFoundError || e instanceof JmaAccessError) {
        throw e
      }
      // TypeError は fetch 自体の失敗 = CORS ブロックまたはネットワーク障害
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
  throw lastError ?? new Error('AMEDAS API request failed')
}

/** AMEDAS データが存在しない (404) ことを示すエラー */
class AmedasNotFoundError extends Error {
  constructor(url: string) {
    super(`AMEDAS data not found: ${url}`)
    this.name = 'AmedasNotFoundError'
  }
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
