/** 気象庁 ETRN（過去の気象データ検索）クライアント */
import type { DailyWeatherSummary, HourlyWeatherRecord } from '@/domain/models'
import { getJmaDataBaseUrl } from './jmaApiConfig'
import { parseDailyTable } from './etrnTableParser'
import { parseHourlyTable } from './etrnHourlyParser'
import { REQUEST_DELAY_MS, EtrnNotFoundError, delay, fetchHtmlWithRetry } from './etrnHttpClient'
import { reverseGeocode } from './geocodingClient'

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
  if (cachedPrefMap) {
    console.debug('[Weather:ETRN] 府県マップ: キャッシュヒット (%d件)', cachedPrefMap.size)
    return cachedPrefMap
  }

  const baseUrl = getJmaDataBaseUrl()
  const url = `${baseUrl}/obd/stats/etrn/select/prefecture00.php`
  console.debug('[Weather:ETRN] 府県一覧を取得: %s', url)
  const html = await fetchHtmlWithRetry(url)
  console.debug(
    '[Weather:ETRN] prefecture00 HTML length=%d head=%s',
    html.length,
    html.slice(0, 300),
  )
  const doc = new DOMParser().parseFromString(html, 'text/html')

  const map = new Map<string, number>()
  // <area> タグ（画像マップ）と <a> タグの両方を検索
  const links = doc.querySelectorAll('area[href*="prec_no="], a[href*="prec_no="]')
  for (const link of links) {
    const href = link.getAttribute('href') ?? ''
    const match = href.match(/prec_no=(\d+)/)
    if (!match) continue
    const precNo = parseInt(match[1], 10)
    // <area> は void 要素なので alt/title 属性から名前を取得
    const rawName = link.getAttribute('alt') || link.getAttribute('title') || link.textContent || ''
    const name = rawName.replace(/\s+/g, ' ').trim()
    if (name && !isNaN(precNo)) {
      if (map.has(name) && map.get(name) !== precNo) {
        console.debug('[Weather:ETRN] 重複府県エントリ: %s → %d/%d', name, map.get(name), precNo)
      }
      map.set(name, precNo)
    }
  }

  console.debug('[Weather:ETRN] 府県マップ: nodes=%d parsed=%d', links.length, map.size)
  cachedPrefMap = map
  return map
}

// ─── Station Resolution ─────────────────────────────

async function fetchStationList(precNo: number): Promise<readonly EtrnStation[]> {
  const cached = cachedStationLists.get(precNo)
  if (cached) {
    console.debug(
      '[Weather:ETRN] 観測所一覧: キャッシュヒット (precNo=%d, %d件)',
      precNo,
      cached.length,
    )
    return cached
  }

  const baseUrl = getJmaDataBaseUrl()
  const url = `${baseUrl}/obd/stats/etrn/select/prefecture.php?prec_no=${precNo}`
  console.debug('[Weather:ETRN] 観測所一覧を取得: %s', url)
  const html = await fetchHtmlWithRetry(url)
  console.debug(
    '[Weather:ETRN] prefecture page length=%d head=%s',
    html.length,
    html.slice(0, 1200),
  )
  const doc = new DOMParser().parseFromString(html, 'text/html')

  // 診断: href 付き要素を確認（パーサが空振りした場合の原因特定用）
  const allHref = doc.querySelectorAll('area[href], a[href]')
  if (allHref.length > 0) {
    const sample = Array.from(allHref)
      .slice(0, 10)
      .map((el) => `<${el.tagName.toLowerCase()}> ${el.getAttribute('href')}`)
      .join(' | ')
    console.debug('[Weather:ETRN] prefecture href要素=%d sample: %s', allHref.length, sample)
  }

  const stations: EtrnStation[] = []
  let links = doc.querySelectorAll('area[href*="daily_"], a[href*="daily_"]')
  if (links.length === 0) {
    // daily_ が見つからない場合、block_no を含む要素で代替
    links = doc.querySelectorAll('area[href*="block_no"], a[href*="block_no"]')
    if (links.length > 0)
      console.debug('[Weather:ETRN] daily_ 空振り → block_no fallback: %d件', links.length)
  }
  for (const link of links) {
    const href = link.getAttribute('href') ?? ''
    // daily_a1.php / daily_s1.php を探す。見つからなければ hourly_ や view/ も許容
    const typeMatch = href.match(/(?:daily|hourly)_(a1|s1)\.php/) ?? href.match(/_(a1|s1)\.php/)
    const blockMatch = href.match(/block_no=(\d+)/)
    if (!blockMatch) continue

    const stationType = (typeMatch?.[1] as 'a1' | 's1') ?? 'a1'
    const blockNo = blockMatch[1]
    // <area> は void 要素なので alt/title 属性から名前を取得
    const stationName = (
      link.getAttribute('alt') ||
      link.getAttribute('title') ||
      link.textContent ||
      ''
    )
      .replace(/\s+/g, ' ')
      .trim()

    if (stationName && blockNo) {
      stations.push({ precNo, blockNo, stationType, stationName })
    }
  }

  console.debug(
    '[Weather:ETRN] 観測所一覧: precNo=%d nodes=%d parsed=%d',
    precNo,
    links.length,
    stations.length,
  )
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
  console.debug('[Weather:ETRN] 観測所解決開始: name=%s, office=%s', amedasStationName, officeName)
  const prefMap = await fetchPrefectureMap()

  const precNo = findPrecNo(prefMap, officeName)
  if (precNo == null) {
    console.warn('[Weather:ETRN] 府県が見つかりません: office=%s', officeName)
    return null
  }
  console.debug('[Weather:ETRN] 府県解決: %s → precNo=%d', officeName, precNo)

  await delay(REQUEST_DELAY_MS)
  const stations = await fetchStationList(precNo)
  if (stations.length === 0) {
    console.warn('[Weather:ETRN] 観測所が0件: precNo=%d', precNo)
    return null
  }

  const exactMatch = stations.find((s) => s.stationName === amedasStationName)
  if (exactMatch) {
    console.debug(
      '[Weather:ETRN] 完全一致: %s → block=%s type=%s',
      exactMatch.stationName,
      exactMatch.blockNo,
      exactMatch.stationType,
    )
    return exactMatch
  }

  const partialMatch = stations.find(
    (s) => s.stationName.includes(amedasStationName) || amedasStationName.includes(s.stationName),
  )
  if (partialMatch) {
    console.debug(
      '[Weather:ETRN] 部分一致: %s → block=%s type=%s',
      partialMatch.stationName,
      partialMatch.blockNo,
      partialMatch.stationType,
    )
    return partialMatch
  }

  const fallback = stations.find((s) => s.stationType === 's1') ?? stations[0] ?? null
  console.debug('[Weather:ETRN] フォールバック: %s', fallback?.stationName ?? 'null')
  return fallback
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

/** 緯度経度から ETRN 観測所を解決する（逆ジオコーディング経由、AMeDAS・予報区域に非依存） */
export async function resolveEtrnStationByLocation(
  latitude: number,
  longitude: number,
): Promise<EtrnStation | null> {
  console.debug('[Weather:ETRN] 位置ベース観測所解決: lat=%f lon=%f', latitude, longitude)

  const geocodeResult = await reverseGeocode(latitude, longitude)
  if (!geocodeResult) {
    console.warn('[Weather:ETRN] 逆ジオコーディング失敗')
    return null
  }

  const prefMap = await fetchPrefectureMap()
  const precNo = findPrecNo(prefMap, geocodeResult.prefectureName)
  if (precNo == null) {
    console.warn('[Weather:ETRN] 府県が見つかりません: %s', geocodeResult.prefectureName)
    return null
  }

  await delay(REQUEST_DELAY_MS)
  const stations = await fetchStationList(precNo)
  if (stations.length === 0) {
    console.warn('[Weather:ETRN] 観測所が0件: precNo=%d', precNo)
    return null
  }

  const selected = stations.find((s) => s.stationType === 's1') ?? stations[0]
  console.debug('[Weather:ETRN] 観測所選択: %s (block=%s)', selected.stationName, selected.blockNo)
  return selected
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
// delay, fetchHtmlWithRetry, EtrnNotFoundError → etrnHttpClient.ts

/** 都道府県名から ETRN 観測所一覧を検索する */
export async function searchStationsByPrefecture(
  prefectureName: string,
): Promise<readonly EtrnStation[]> {
  const prefMap = await fetchPrefectureMap()
  const precNo = findPrecNo(prefMap, prefectureName)
  if (precNo == null) return []
  return fetchStationList(precNo)
}

/** テスト用: キャッシュをクリアする */
export function clearEtrnCache(): void {
  cachedPrefMap = null
  cachedStationLists.clear()
}
