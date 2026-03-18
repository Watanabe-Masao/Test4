/**
 * 気象庁 週間天気予報 API クライアント
 *
 * 3つの JMA JSON マスタデータを使い、AMEDAS 観測所 ID から
 * 府県予報区・週間予報区域を自動解決し、週間天気予報を取得する。
 *
 * マスタデータ:
 *   - area.json: 府県予報区 (offices) → 一次細分区域 (class10s) の階層
 *   - week_area.json: 週間予報区域 → AMEDAS 観測所のマッピング
 *   - week_area_name.json: 週間予報区域コード → 地域名
 *
 * @see https://www.jma.go.jp/bosai/forecast/
 */
import type { DailyForecast, ForecastAreaResolution } from '@/domain/models'
import { getJmaBaseUrl } from './jmaApiConfig'

// ─── URLs（プロキシ経由で動的解決） ─────────────────────

function getAreaJsonUrl(): string {
  return `${getJmaBaseUrl()}/bosai/common/const/area.json`
}
function getWeekAreaUrl(): string {
  return `${getJmaBaseUrl()}/bosai/forecast/const/week_area.json`
}
function getWeekAreaNameUrl(): string {
  return `${getJmaBaseUrl()}/bosai/forecast/const/week_area_name.json`
}
function getForecastUrl(): string {
  return `${getJmaBaseUrl()}/bosai/forecast/data/forecast`
}

/** リトライ設定 */
const MAX_RETRIES = 2
const INITIAL_RETRY_DELAY_MS = 1000

// ─── Raw JSON Types ──────────────────────────────────

/** area.json の offices エントリ */
interface AreaOffice {
  readonly name: string
  readonly enName: string
  readonly officeName: string
  readonly parent: string
  readonly children: readonly string[]
}

/** area.json の class10s エントリ */
interface AreaClass10 {
  readonly name: string
  readonly enName: string
  readonly parent: string
  readonly children: readonly string[]
}

/** area.json 全体 */
interface AreaJson {
  readonly offices: Readonly<Record<string, AreaOffice>>
  readonly class10s: Readonly<Record<string, AreaClass10>>
}

/**
 * week_area.json: officeCode → { weekAreaCode → { amedasStationIds: [...] } }
 *
 * 例: { "130000": { "130010": ["44132", "44263"], "130020": ["44301"] } }
 */
type WeekAreaJson = Readonly<Record<string, Readonly<Record<string, readonly string[]>>>>

/**
 * week_area_name.json: weekAreaCode → areaName
 *
 * 例: { "130010": "東京地方", "130020": "伊豆諸島北部" }
 */
type WeekAreaNameJson = Readonly<Record<string, string>>

// ─── Cache ───────────────────────────────────────────

let cachedAreaJson: AreaJson | null = null
let cachedWeekArea: WeekAreaJson | null = null
let cachedWeekAreaName: WeekAreaNameJson | null = null

// ─── Master Data Fetch ───────────────────────────────

async function fetchAreaJson(): Promise<AreaJson> {
  if (cachedAreaJson) return cachedAreaJson
  const data = (await fetchWithRetry(getAreaJsonUrl())) as AreaJson
  cachedAreaJson = data
  return data
}

async function fetchWeekArea(): Promise<WeekAreaJson> {
  if (cachedWeekArea) return cachedWeekArea
  const data = (await fetchWithRetry(getWeekAreaUrl())) as WeekAreaJson
  cachedWeekArea = data
  return data
}

async function fetchWeekAreaName(): Promise<WeekAreaNameJson> {
  if (cachedWeekAreaName) return cachedWeekAreaName
  const data = (await fetchWithRetry(getWeekAreaNameUrl())) as WeekAreaNameJson
  cachedWeekAreaName = data
  return data
}

// ─── Area Resolution ─────────────────────────────────

/**
 * AMEDAS 観測所 ID から予報区域を解決する。
 *
 * 解決フロー:
 *   1. week_area.json を走査し、指定 stationId を含む weekAreaCode を特定
 *   2. その weekAreaCode が所属する officeCode を同時に特定
 *   3. area.json から officeName を取得
 *   4. week_area_name.json から weekAreaName を取得
 *
 * @param amedasStationId AMEDAS 観測所番号 (例: "44132")
 * @returns 予報区域の解決結果。見つからない場合は null
 */
export async function resolveForcastArea(
  amedasStationId: string,
): Promise<ForecastAreaResolution | null> {
  const [weekArea, weekAreaName, area] = await Promise.all([
    fetchWeekArea(),
    fetchWeekAreaName(),
    fetchAreaJson(),
  ])

  // week_area.json を走査: officeCode → weekAreaCode → stationIds
  for (const [officeCode, weekAreas] of Object.entries(weekArea)) {
    for (const [weekAreaCode, stationIds] of Object.entries(weekAreas)) {
      if (Array.isArray(stationIds) && stationIds.includes(amedasStationId)) {
        const officeName = area.offices[officeCode]?.name ?? officeCode
        const areaName = weekAreaName[weekAreaCode] ?? weekAreaCode

        return {
          officeCode,
          officeName,
          weekAreaCode,
          weekAreaName: areaName,
          amedasStationId,
        }
      }
    }
  }

  return null
}

// ─── Forecast Fetch ──────────────────────────────────

/** 気象庁 forecast API 週間予報のレスポンス型 */
interface ForecastWeeklyRaw {
  readonly publishingOffice: string
  readonly reportDatetime: string
  readonly timeSeries: readonly [WeeklyTimeSeries0, WeeklyTimeSeries1]
  readonly tempAverage?: {
    readonly areas: readonly {
      readonly area: { readonly code: string }
      readonly min: string
      readonly max: string
    }[]
  }
  readonly precipAverage?: {
    readonly areas: readonly {
      readonly area: { readonly code: string }
      readonly min: string
      readonly max: string
    }[]
  }
}

/** timeSeries[0]: 天気・降水確率・信頼度 */
interface WeeklyTimeSeries0 {
  readonly timeDefines: readonly string[]
  readonly areas: readonly {
    readonly area: { readonly name: string; readonly code: string }
    readonly weatherCodes: readonly string[]
    readonly pops: readonly string[]
    readonly reliabilities?: readonly string[]
  }[]
}

/** timeSeries[1]: 気温（AMEDAS 観測所別） */
interface WeeklyTimeSeries1 {
  readonly timeDefines: readonly string[]
  readonly areas: readonly {
    readonly area: { readonly name: string; readonly code: string }
    readonly tempsMin: readonly string[]
    readonly tempsMinUpper: readonly string[]
    readonly tempsMinLower: readonly string[]
    readonly tempsMax: readonly string[]
    readonly tempsMaxUpper: readonly string[]
    readonly tempsMaxLower: readonly string[]
  }[]
}

/**
 * 週間天気予報を取得し、DailyForecast 配列に変換する。
 *
 * @param officeCode 府県予報区コード (例: "130000")
 * @param weekAreaCode 週間予報区域コード (例: "130010")
 * @param amedasStationId 気温データ抽出用 AMEDAS 観測所番号
 * @returns DailyForecast の配列 (最大7日分)
 */
export async function fetchWeeklyForecast(
  officeCode: string,
  weekAreaCode: string,
  amedasStationId: string,
): Promise<readonly DailyForecast[]> {
  const url = `${getForecastUrl()}/${officeCode}.json`
  const data = (await fetchWithRetry(url)) as readonly [unknown, ForecastWeeklyRaw]

  const weekly = data[1]
  if (!weekly?.timeSeries) return []

  const ts0 = weekly.timeSeries[0]
  const ts1 = weekly.timeSeries[1]

  // 該当する週間予報区域のデータを抽出
  const weatherArea = ts0.areas.find((a) => a.area.code === weekAreaCode)
  if (!weatherArea) return []

  // 該当する AMEDAS 観測所の気温データを抽出
  const tempArea = ts1?.areas.find((a) => a.area.code === amedasStationId)

  const forecasts: DailyForecast[] = []
  const timeDefines = ts0.timeDefines

  for (let i = 0; i < timeDefines.length; i++) {
    const dateKey = timeDefines[i].slice(0, 10) // "2026-03-17T00:00:00+09:00" → "2026-03-17"

    const popStr = weatherArea.pops[i]
    const pop = popStr !== '' && popStr != null ? parseInt(popStr, 10) : null

    const reliabilityStr = weatherArea.reliabilities?.[i]
    const reliability =
      reliabilityStr === 'A' || reliabilityStr === 'B' || reliabilityStr === 'C'
        ? reliabilityStr
        : null

    // 気温: timeSeries[1] の timeDefines と [0] の timeDefines はずれることがある
    // tempArea の対応する日付を探す
    let tempMin: number | null = null
    let tempMax: number | null = null
    if (tempArea && ts1) {
      const tempIdx = ts1.timeDefines.findIndex((td) => td.slice(0, 10) === dateKey)
      if (tempIdx >= 0) {
        const minStr = tempArea.tempsMin[tempIdx]
        const maxStr = tempArea.tempsMax[tempIdx]
        tempMin = minStr !== '' && minStr != null ? parseFloat(minStr) : null
        tempMax = maxStr !== '' && maxStr != null ? parseFloat(maxStr) : null
      }
    }

    forecasts.push({
      dateKey,
      weatherCode: weatherArea.weatherCodes[i] ?? '',
      pop,
      tempMin,
      tempMax,
      reliability,
    })
  }

  return forecasts
}

// ─── Utilities ───────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithRetry(url: string): Promise<unknown> {
  let lastError: Error | undefined
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`JMA Forecast API error: ${response.status} ${response.statusText}`)
      }
      return await response.json()
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))
      if (attempt < MAX_RETRIES) {
        await delay(INITIAL_RETRY_DELAY_MS * 2 ** attempt)
      }
    }
  }
  throw lastError ?? new Error('JMA Forecast API request failed')
}

/** テスト用: マスタデータキャッシュをクリアする */
export function clearForecastCache(): void {
  cachedAreaJson = null
  cachedWeekArea = null
  cachedWeekAreaName = null
}
