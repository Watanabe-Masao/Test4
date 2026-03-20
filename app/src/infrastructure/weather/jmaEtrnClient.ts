/** 気象庁 ETRN（過去の気象データ検索）クライアント */
import type { DailyWeatherSummary, HourlyWeatherRecord } from '@/domain/models/record'
import { getJmaDataBaseUrl } from './jmaApiConfig'
import { parseDailyTable } from './etrnTableParser'
import { parseHourlyTable } from './etrnHourlyParser'
import { REQUEST_DELAY_MS, EtrnNotFoundError, delay, fetchHtmlWithRetry } from './etrnHttpClient'
import { reverseGeocode } from './geocodingClient'
import etrnStationsData from './etrnStations.json'

// ─── Types ──────────────────────────────────────────

/** ETRN 観測所情報（解決済み） */
export interface EtrnStation {
  readonly precNo: number
  readonly blockNo: string
  readonly stationType: 'a1' | 's1'
  readonly stationName: string
}

// ─── Static Station Data ────────────────────────────

interface StationEntry {
  readonly precNo: number
  readonly blockNo: string
  readonly name: string
  readonly prefecture: string
  readonly lat: readonly [number, number]
  readonly lon: readonly [number, number]
}

const STATIC_STATIONS = etrnStationsData as unknown as readonly StationEntry[]

// ─── Station Resolution (Static List Based) ─────────

/** Haversine distance in km (approximate) */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function dmsToDecimal(dm: readonly [number, number]): number {
  return dm[0] + dm[1] / 60
}

/**
 * 緯度経度から最寄りの ETRN s1 観測所を返す（静的リストベース）。
 *
 * 逆ジオコーディングで都道府県を特定し、同一都道府県内の最寄り観測所を返す。
 * 都道府県特定に失敗した場合は全国から最寄りを返す。
 */
export async function resolveEtrnStationByLocation(
  latitude: number,
  longitude: number,
): Promise<EtrnStation | null> {
  if (STATIC_STATIONS.length === 0) return null

  // 逆ジオコーディングで都道府県を特定し、同一都道府県の観測所を優先
  let candidates = STATIC_STATIONS
  try {
    const geocodeResult = await reverseGeocode(latitude, longitude)
    if (geocodeResult) {
      const prefStations = STATIC_STATIONS.filter(
        (s) =>
          s.prefecture === geocodeResult.prefectureName ||
          s.prefecture === geocodeResult.prefectureName.replace(/[県都府道]$/, '') + '県',
      )
      if (prefStations.length > 0) candidates = prefStations
    }
  } catch {
    // 逆ジオコーディング失敗は非致命的 — 全国から最寄りを選択
  }

  let nearest: StationEntry | null = null
  let minDist = Infinity
  for (const s of candidates) {
    const dist = haversineKm(latitude, longitude, dmsToDecimal(s.lat), dmsToDecimal(s.lon))
    if (dist < minDist) {
      minDist = dist
      nearest = s
    }
  }

  if (!nearest) return null
  return {
    precNo: nearest.precNo,
    blockNo: nearest.blockNo,
    stationType: 's1',
    stationName: nearest.name,
  }
}

/** 静的リストの全 s1 観測所エントリ */
export interface EtrnStationEntry {
  readonly precNo: number
  readonly blockNo: string
  readonly name: string
  readonly prefecture: string
  readonly lat: readonly [number, number]
  readonly lon: readonly [number, number]
}

/** 静的リストから全観測所を返す */
export function getStaticStationList(): readonly EtrnStationEntry[] {
  return STATIC_STATIONS as readonly EtrnStationEntry[]
}

// ─── Daily Weather Data ─────────────────────────────

/**
 * ETRN から月単位の日別天気データを取得する。
 */
export async function fetchEtrnDailyWeather(
  precNo: number,
  blockNo: string,
  stationType: 'a1' | 's1',
  year: number,
  month: number,
): Promise<readonly DailyWeatherSummary[]> {
  const baseUrl = getJmaDataBaseUrl()
  const url =
    `${baseUrl}/obd/stats/etrn/view/daily_${stationType}.php` +
    `?prec_no=${precNo}&block_no=${blockNo}&year=${year}&month=${month}&day=&view=`

  console.debug(
    '[Weather:ETRN] 日別データ取得: %d/%d precNo=%d block=%s type=%s',
    year,
    month,
    precNo,
    blockNo,
    stationType,
  )

  let html: string
  try {
    html = await fetchHtmlWithRetry(url)
  } catch (e) {
    if (e instanceof EtrnNotFoundError) {
      console.warn('[Weather:ETRN] 日別データ 404: %d/%d', year, month)
      return []
    }
    throw e
  }
  const doc = new DOMParser().parseFromString(html, 'text/html')

  const results = parseDailyTable(doc, year, month)
  console.debug('[Weather:ETRN] 日別データ取得完了: %d/%d → %d日分', year, month, results.length)
  return results
}

/**
 * 複数月の日別天気データを一括取得する。
 */
export async function fetchEtrnDailyRange(
  precNo: number,
  blockNo: string,
  stationType: 'a1' | 's1',
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number,
  onProgress?: (completed: number, total: number) => void,
): Promise<readonly DailyWeatherSummary[]> {
  const months: { year: number; month: number }[] = []
  let y = startYear
  let m = startMonth
  while (y < endYear || (y === endYear && m <= endMonth)) {
    months.push({ year: y, month: m })
    m++
    if (m > 12) {
      m = 1
      y++
    }
  }

  const allResults: DailyWeatherSummary[] = []

  for (let i = 0; i < months.length; i++) {
    const { year, month } = months[i]
    try {
      const dailyData = await fetchEtrnDailyWeather(precNo, blockNo, stationType, year, month)
      allResults.push(...dailyData)
    } catch {
      // 該当月のデータがない場合はスキップ
    }
    onProgress?.(i + 1, months.length)

    if (i < months.length - 1) {
      await delay(REQUEST_DELAY_MS)
    }
  }

  return allResults
}

// ─── Hourly Weather Data ─────────────────────────────

/**
 * ETRN から1日分の時間別天気データを取得する。
 */
export async function fetchEtrnHourlyWeather(
  precNo: number,
  blockNo: string,
  stationType: 'a1' | 's1',
  year: number,
  month: number,
  day: number,
): Promise<readonly HourlyWeatherRecord[]> {
  const baseUrl = getJmaDataBaseUrl()
  const url =
    `${baseUrl}/obd/stats/etrn/view/hourly_${stationType}.php` +
    `?prec_no=${precNo}&block_no=${blockNo}&year=${year}&month=${month}&day=${day}&view=`

  let html: string
  try {
    html = await fetchHtmlWithRetry(url)
  } catch (e) {
    if (e instanceof EtrnNotFoundError) return []
    throw e
  }
  const doc = new DOMParser().parseFromString(html, 'text/html')

  const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return parseHourlyTable(doc, dateKey)
}

/**
 * ETRN から月単位の時間別天気データを一括取得する。
 */
export async function fetchEtrnHourlyRange(
  precNo: number,
  blockNo: string,
  stationType: 'a1' | 's1',
  year: number,
  month: number,
  days: readonly number[],
  onProgress?: (completed: number, total: number) => void,
): Promise<readonly HourlyWeatherRecord[]> {
  const allResults: HourlyWeatherRecord[] = []

  for (let i = 0; i < days.length; i++) {
    try {
      const hourlyData = await fetchEtrnHourlyWeather(
        precNo,
        blockNo,
        stationType,
        year,
        month,
        days[i],
      )
      allResults.push(...hourlyData)
    } catch {
      // 該当日のデータがない場合はスキップ
    }
    onProgress?.(i + 1, days.length)

    if (i < days.length - 1) {
      await delay(REQUEST_DELAY_MS)
    }
  }

  return allResults
}
