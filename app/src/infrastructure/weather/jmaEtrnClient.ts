/**
 * 気象庁 ETRN（過去の気象データ検索）クライアント
 *
 * 長期の過去気象データを日別で取得する。
 * ETRN は HTML テーブルで提供されるため、DOMParser でパースする。
 *
 * データフロー:
 *   1. ETRN 府県一覧ページから prec_no を解決
 *   2. 府県内の観測所一覧から block_no + stationType を解決
 *   3. daily_{stationType}.php で月単位の日別データを取得
 *   4. HTML テーブルをパースして DailyWeatherSummary に変換
 *
 * 効率: 1リクエスト = 1ヶ月分（AMeDAS API の 240リクエスト/月 と比較）
 *
 * @see https://www.data.jma.go.jp/obd/stats/etrn/index.php
 */
import type { DailyWeatherSummary, HourlyWeatherRecord } from '@/domain/models'
import { getJmaDataBaseUrl } from './jmaApiConfig'
import { parseDailyTable } from './etrnTableParser'
import { parseHourlyTable } from './etrnHourlyParser'

/** JMA サーバーへの配慮 — リクエスト間隔 (ms) */
const REQUEST_DELAY_MS = 300

/** リトライ設定 */
const MAX_RETRIES = 2
const INITIAL_RETRY_DELAY_MS = 1000

// ─── Types ──────────────────────────────────────────

/** ETRN 観測所情報（解決済み） */
export interface EtrnStation {
  readonly precNo: number
  readonly blockNo: string
  readonly stationType: 'a1' | 's1'
  readonly stationName: string
}

// ─── Cache ──────────────────────────────────────────

let cachedPrefMap: ReadonlyMap<string, number> | null = null
const cachedStationLists = new Map<number, readonly EtrnStation[]>()

// ─── Prefecture Resolution ──────────────────────────

async function fetchPrefectureMap(): Promise<ReadonlyMap<string, number>> {
  if (cachedPrefMap) return cachedPrefMap

  const baseUrl = getJmaDataBaseUrl()
  const url = `${baseUrl}/obd/stats/etrn/select/prefecture00.php`
  const html = await fetchHtmlWithRetry(url)
  const doc = new DOMParser().parseFromString(html, 'text/html')

  const map = new Map<string, number>()
  const links = doc.querySelectorAll('a[href*="prec_no="]')
  for (const link of links) {
    const href = link.getAttribute('href') ?? ''
    const match = href.match(/prec_no=(\d+)/)
    if (!match) continue
    const precNo = parseInt(match[1], 10)
    const name = (link.textContent ?? '').trim()
    if (name && !isNaN(precNo)) {
      map.set(name, precNo)
    }
  }

  cachedPrefMap = map
  return map
}

// ─── Station Resolution ─────────────────────────────

async function fetchStationList(precNo: number): Promise<readonly EtrnStation[]> {
  const cached = cachedStationLists.get(precNo)
  if (cached) return cached

  const baseUrl = getJmaDataBaseUrl()
  const url = `${baseUrl}/obd/stats/etrn/select/prefecture.php?prec_no=${precNo}`
  const html = await fetchHtmlWithRetry(url)
  const doc = new DOMParser().parseFromString(html, 'text/html')

  const stations: EtrnStation[] = []
  const links = doc.querySelectorAll('a[href*="daily_"]')
  for (const link of links) {
    const href = link.getAttribute('href') ?? ''
    const typeMatch = href.match(/daily_(a1|s1)\.php/)
    const blockMatch = href.match(/block_no=(\d+)/)
    if (!typeMatch || !blockMatch) continue

    const stationType = typeMatch[1] as 'a1' | 's1'
    const blockNo = blockMatch[1]
    const stationName = (link.textContent ?? '').trim()

    if (stationName && blockNo) {
      stations.push({ precNo, blockNo, stationType, stationName })
    }
  }

  cachedStationLists.set(precNo, stations)
  return stations
}

/**
 * AMeDAS 観測所名と府県予報区名から ETRN 観測所を解決する。
 *
 * @param amedasStationName AMeDAS 観測所名（漢字、例: "高知"）
 * @param officeName 府県予報区名（例: "高知県"）
 */
export async function resolveEtrnStation(
  amedasStationName: string,
  officeName: string,
): Promise<EtrnStation | null> {
  const prefMap = await fetchPrefectureMap()

  const precNo = findPrecNo(prefMap, officeName)
  if (precNo == null) return null

  await delay(REQUEST_DELAY_MS)
  const stations = await fetchStationList(precNo)
  if (stations.length === 0) return null

  const exactMatch = stations.find((s) => s.stationName === amedasStationName)
  if (exactMatch) return exactMatch

  const partialMatch = stations.find(
    (s) => s.stationName.includes(amedasStationName) || amedasStationName.includes(s.stationName),
  )
  if (partialMatch) return partialMatch

  return stations.find((s) => s.stationType === 's1') ?? stations[0] ?? null
}

function findPrecNo(prefMap: ReadonlyMap<string, number>, officeName: string): number | null {
  const exact = prefMap.get(officeName)
  if (exact != null) return exact

  const coreName = officeName.replace(/[県都府道地方]$/u, '')
  for (const [name, precNo] of prefMap) {
    if (name.includes(coreName) || coreName.includes(name.replace(/[地方]$/u, ''))) {
      return precNo
    }
  }

  return null
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

  let html: string
  try {
    html = await fetchHtmlWithRetry(url)
  } catch (e) {
    if (e instanceof EtrnNotFoundError) return []
    throw e
  }
  const doc = new DOMParser().parseFromString(html, 'text/html')

  return parseDailyTable(doc, year, month)
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
 *
 * 1リクエスト = 1日分（最大24レコード）。
 * 日別データ（1リクエスト = 1月分）と比べてリクエスト数が多いため、
 * 必要な日付範囲のみ取得すること。
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
 *
 * 1日ごとにリクエストを送るため、30日分 ≈ 30リクエスト。
 * JMA サーバーへの配慮として REQUEST_DELAY_MS 間隔で取得する。
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

// ─── Utilities ──────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchHtmlWithRetry(url: string): Promise<string> {
  let lastError: Error | undefined

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        if (response.status === 404) {
          throw new EtrnNotFoundError(url)
        }
        throw new Error(`ETRN error: ${response.status} ${response.statusText}`)
      }

      const contentType = response.headers.get('Content-Type') ?? ''
      const charsetMatch = contentType.match(/charset=([^\s;]+)/i)
      const charset = (charsetMatch?.[1] ?? 'utf-8').toLowerCase()

      if (charset === 'utf-8') {
        return await response.text()
      }

      const buffer = await response.arrayBuffer()
      return new TextDecoder(charset).decode(buffer)
    } catch (e) {
      if (e instanceof EtrnNotFoundError) throw e
      lastError = e instanceof Error ? e : new Error(String(e))
      if (attempt < MAX_RETRIES) {
        await delay(INITIAL_RETRY_DELAY_MS * 2 ** attempt)
      }
    }
  }

  throw lastError ?? new Error('ETRN request failed')
}

class EtrnNotFoundError extends Error {
  constructor(url: string) {
    super(`ETRN data not found: ${url}`)
    this.name = 'EtrnNotFoundError'
  }
}

/** テスト用: キャッシュをクリアする */
export function clearEtrnCache(): void {
  cachedPrefMap = null
  cachedStationLists.clear()
}
