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
import { fetchStationTable } from './jmaAmedasClient'
import { fetchJsonWithRetry } from './jmaJsonClient'

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
 * week_area.json: officeCode → { weekAreaCode → stationIds }
 *
 * 実際の構造は JMA 側で変わりうるため、内側の値は unknown で受ける。
 * extractStationIds() で配列・オブジェクト両対応で station ID を抽出する。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WeekAreaJson = Readonly<Record<string, Readonly<Record<string, any>>>>

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
  const data = (await fetchJsonWithRetry(getAreaJsonUrl(), 'Forecast')) as AreaJson
  cachedAreaJson = data
  return data
}

async function fetchWeekArea(): Promise<WeekAreaJson> {
  if (cachedWeekArea) return cachedWeekArea
  const data = (await fetchJsonWithRetry(getWeekAreaUrl(), 'Forecast')) as WeekAreaJson
  cachedWeekArea = data
  return data
}

async function fetchWeekAreaName(): Promise<WeekAreaNameJson> {
  if (cachedWeekAreaName) return cachedWeekAreaName
  const data = (await fetchJsonWithRetry(getWeekAreaNameUrl(), 'Forecast')) as WeekAreaNameJson
  cachedWeekAreaName = data
  return data
}

// ─── week_area.json Station ID Extraction ────────

/**
 * week_area.json の値から station ID 配列を抽出する。
 *
 * JMA の week_area.json は構造が変わりうるため、以下のパターンに対応:
 * - 直接配列: ["44132", "44263"]
 * - オブジェクト内の station フィールド: { station: ["44132"], ... }
 * - オブジェクト内の配列値を再帰的に探索
 */
function extractStationIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string')
  }
  if (value != null && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    // "station" フィールドを優先
    if (Array.isArray(obj['station'])) {
      return (obj['station'] as unknown[]).filter((v): v is string => typeof v === 'string')
    }
    // 全フィールドから文字列配列を探索
    for (const v of Object.values(obj)) {
      if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'string') {
        return v.filter((item): item is string => typeof item === 'string')
      }
    }
  }
  return []
}

/** week_area.json から全代表観測所 ID を収集する */
function collectRepresentativeIds(weekArea: WeekAreaJson): Set<string> {
  const ids = new Set<string>()
  for (const weekAreas of Object.values(weekArea)) {
    for (const value of Object.values(weekAreas)) {
      for (const id of extractStationIds(value)) ids.add(id)
    }
  }
  return ids
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
 *   5. 直接一致しない場合、AMEDAS テーブルから地理的に最も近い代表観測所にフォールバック
 *
 * @param amedasStationId AMEDAS 観測所番号 (例: "44132")
 * @returns 予報区域の解決結果。見つからない場合は null
 */
export async function resolveForcastArea(
  amedasStationId: string,
): Promise<ForecastAreaResolution | null> {
  console.debug('[Weather:Forecast] 予報区域解決開始: stationId=%s', amedasStationId)
  const [weekArea, weekAreaName, area] = await Promise.all([
    fetchWeekArea(),
    fetchWeekAreaName(),
    fetchAreaJson(),
  ])

  // week_area.json を走査: officeCode → weekAreaCode → stationIds
  const directResult = findStationInWeekArea(weekArea, weekAreaName, area, amedasStationId)
  if (directResult) {
    console.debug(
      '[Weather:Forecast] 予報区域解決完了: stationId=%s → office=%s(%s) weekArea=%s(%s)',
      amedasStationId,
      directResult.officeCode,
      directResult.officeName,
      directResult.weekAreaCode,
      directResult.weekAreaName,
    )
    return directResult
  }

  // フォールバック: AMEDAS テーブルから地理的に最も近い代表観測所を探す
  console.debug(
    '[Weather:Forecast] 直接一致なし → 地理的フォールバック: stationId=%s',
    amedasStationId,
  )
  const fallbackResult = await resolveByNearestRepresentativeStation(
    amedasStationId,
    weekArea,
    weekAreaName,
    area,
  )
  if (fallbackResult) {
    return fallbackResult
  }

  console.warn('[Weather:Forecast] 予報区域が見つかりません: stationId=%s', amedasStationId)
  return null
}

/**
 * 緯度経度から予報区域を解決する（stationId 不要）。
 *
 * week_area.json 内の全代表観測所の座標を AMEDAS テーブルから取得し、
 * 指定座標に最も近い代表観測所の予報区域を返す。
 */
export async function resolveForcastAreaByLocation(
  latitude: number,
  longitude: number,
): Promise<ForecastAreaResolution | null> {
  console.debug('[Weather:Forecast] 位置ベース予報区域解決: lat=%f lon=%f', latitude, longitude)
  const [weekArea, weekAreaName, area] = await Promise.all([
    fetchWeekArea(),
    fetchWeekAreaName(),
    fetchAreaJson(),
  ])
  const stationTable = await fetchStationTable()

  const representativeIds = collectRepresentativeIds(weekArea)
  console.debug('[Weather:Forecast] 代表観測所ID数=%d', representativeIds.size)
  if (representativeIds.size === 0) {
    // 診断: week_area.json の実際の構造をログ出力
    const sampleKey = Object.keys(weekArea)[0]
    if (sampleKey) {
      const inner = weekArea[sampleKey]
      const innerKey = Object.keys(inner)[0]
      console.warn(
        '[Weather:Forecast] week_area構造診断: key=%s innerKey=%s type=%s value=%s',
        sampleKey,
        innerKey,
        typeof inner[innerKey],
        JSON.stringify(inner[innerKey]).slice(0, 200),
      )
    }
  }

  // 位置座標から最近傍の代表観測所を探す
  let nearestId: string | null = null
  let minDist = Infinity
  for (const station of stationTable) {
    if (!representativeIds.has(station.stationId)) continue
    const dist = haversineDistance(latitude, longitude, station.latitude, station.longitude)
    if (dist < minDist) {
      minDist = dist
      nearestId = station.stationId
    }
  }

  if (!nearestId) {
    console.warn('[Weather:Forecast] 位置ベース解決失敗: 代表観測所なし')
    return null
  }

  const result = findStationInWeekArea(weekArea, weekAreaName, area, nearestId)
  if (result) {
    console.debug(
      '[Weather:Forecast] 位置ベース解決成功: 代表観測所 %s (%.1fkm) → office=%s(%s)',
      nearestId,
      minDist,
      result.officeCode,
      result.officeName,
    )
  }
  return result
}

function findStationInWeekArea(
  weekArea: WeekAreaJson,
  weekAreaName: WeekAreaNameJson,
  area: AreaJson,
  stationId: string,
): ForecastAreaResolution | null {
  for (const [officeCode, weekAreas] of Object.entries(weekArea)) {
    for (const [weekAreaCode, value] of Object.entries(weekAreas)) {
      const ids = extractStationIds(value)
      if (ids.includes(stationId)) {
        return {
          officeCode,
          officeName: area.offices[officeCode]?.name ?? officeCode,
          weekAreaCode,
          weekAreaName: weekAreaName[weekAreaCode] ?? weekAreaCode,
          amedasStationId: stationId,
        }
      }
    }
  }
  return null
}

/**
 * week_area.json に登録されている全代表観測所から、
 * 対象観測所に地理的に最も近いものを探してフォールバックする。
 */
async function resolveByNearestRepresentativeStation(
  targetStationId: string,
  weekArea: WeekAreaJson,
  weekAreaName: WeekAreaNameJson,
  area: AreaJson,
): Promise<ForecastAreaResolution | null> {
  const stationTable = await fetchStationTable()
  const targetStation = stationTable.find((s) => s.stationId === targetStationId)
  if (!targetStation) return null

  const representativeIds = collectRepresentativeIds(weekArea)

  // 代表観測所の座標を AMEDAS テーブルから引き、最近傍を探す
  let nearestId: string | null = null
  let minDist = Infinity
  for (const station of stationTable) {
    if (!representativeIds.has(station.stationId)) continue
    const dist = haversineDistance(
      targetStation.latitude,
      targetStation.longitude,
      station.latitude,
      station.longitude,
    )
    if (dist < minDist) {
      minDist = dist
      nearestId = station.stationId
    }
  }

  if (!nearestId) return null

  const result = findStationInWeekArea(weekArea, weekAreaName, area, nearestId)
  if (result) {
    console.debug(
      '[Weather:Forecast] 地理的フォールバック成功: %s → 代表観測所 %s (%.1fkm) → office=%s(%s)',
      targetStationId,
      nearestId,
      minDist,
      result.officeCode,
      result.officeName,
    )
    // 元の stationId を保持する
    return { ...result, amedasStationId: targetStationId }
  }
  return null
}

/** 2地点間のハバーサイン距離 (km) */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
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
  console.debug(
    '[Weather:Forecast] 週間予報取得: office=%s weekArea=%s station=%s',
    officeCode,
    weekAreaCode,
    amedasStationId,
  )
  console.debug('[Weather:Forecast] URL: %s', url)
  const data = (await fetchJsonWithRetry(url, 'Forecast')) as readonly [unknown, ForecastWeeklyRaw]

  const weekly = data[1]
  if (!weekly?.timeSeries) {
    console.warn('[Weather:Forecast] 週間予報データなし (timeSeries が存在しない)')
    return []
  }

  const ts0 = weekly.timeSeries[0]
  const ts1 = weekly.timeSeries[1]

  // 該当する週間予報区域のデータを抽出
  const weatherArea = ts0.areas.find((a) => a.area.code === weekAreaCode)
  if (!weatherArea) {
    console.warn(
      '[Weather:Forecast] weekAreaCode=%s に該当するデータなし。利用可能: %s',
      weekAreaCode,
      ts0.areas.map((a) => `${a.area.code}(${a.area.name})`).join(', '),
    )
    return []
  }

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

  console.debug('[Weather:Forecast] 週間予報取得完了: %d日分', forecasts.length)
  return forecasts
}

/** テスト用: マスタデータキャッシュをクリアする */
export function clearForecastCache(): void {
  cachedAreaJson = null
  cachedWeekArea = null
  cachedWeekAreaName = null
}
