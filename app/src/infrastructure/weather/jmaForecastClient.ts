/**
 * 気象庁 週間天気予報 API クライアント
 *
 * 緯度経度 → 逆ジオコーディング → area.json → officeCode → forecast API
 * の流れで週間天気予報を取得する。AMeDAS/week_area.json に非依存。
 *
 * @see https://www.jma.go.jp/bosai/forecast/
 */
import type { DailyForecast } from '@/domain/models/record'
import { getJmaBaseUrl } from './jmaApiConfig'
import { reverseGeocode } from './geocodingClient'
import { fetchJsonWithRetry } from './jmaJsonClient'

// ─── URLs ────────────────────────────────────────────

function getAreaJsonUrl(): string {
  return `${getJmaBaseUrl()}/bosai/common/const/area.json`
}
function getForecastUrl(): string {
  return `${getJmaBaseUrl()}/bosai/forecast/data/forecast`
}

// ─── Raw JSON Types ──────────────────────────────────

interface AreaOffice {
  readonly name: string
  readonly enName: string
  readonly officeName: string
  readonly parent: string
  readonly children: readonly string[]
}

interface AreaClass10 {
  readonly name: string
  readonly enName: string
  readonly parent: string
  readonly children: readonly string[]
}

interface AreaJson {
  readonly offices: Readonly<Record<string, AreaOffice>>
  readonly class10s: Readonly<Record<string, AreaClass10>>
}

// ─── Cache ───────────────────────────────────────────

let cachedAreaJson: AreaJson | null = null

async function fetchAreaJson(): Promise<AreaJson> {
  if (cachedAreaJson) return cachedAreaJson
  const data = (await fetchJsonWithRetry(getAreaJsonUrl(), 'Forecast')) as AreaJson
  cachedAreaJson = data
  return data
}

// ─── Office Resolution ──────────────────────────────

/**
 * 緯度経度から府県予報区の officeCode を解決する。
 *
 * 1. reverseGeocode(lat, lon) で都道府県名を取得
 * 2. area.json の offices を走査し、名前一致する officeCode を返す
 */
export async function resolveForecastOfficeByLocation(
  latitude: number,
  longitude: number,
): Promise<{ officeCode: string; officeName: string } | null> {
  console.debug('[Weather:Forecast] office resolve start: lat=%f lon=%f', latitude, longitude)

  const geocodeResult = await reverseGeocode(latitude, longitude)
  if (!geocodeResult) {
    console.warn('[Weather:Forecast] 逆ジオコーディング失敗')
    return null
  }
  const prefName = geocodeResult.prefectureName
  console.debug('[Weather:Forecast] 都道府県: %s', prefName)

  const area = await fetchAreaJson()

  // 完全一致
  for (const [code, office] of Object.entries(area.offices)) {
    if (office.name === prefName) {
      console.debug('[Weather:Forecast] office resolved: %s %s', code, office.name)
      return { officeCode: code, officeName: office.name }
    }
  }

  // 部分一致（「県」「都」「府」「道」を除いたコア名で比較）
  const coreName = prefName.replace(/[県都府道]$/u, '')
  for (const [code, office] of Object.entries(area.offices)) {
    const officeCore = office.name.replace(/[県都府道地方]$/u, '')
    if (officeCore.includes(coreName) || coreName.includes(officeCore)) {
      console.debug('[Weather:Forecast] office resolved (fuzzy): %s %s', code, office.name)
      return { officeCode: code, officeName: office.name }
    }
  }

  console.warn('[Weather:Forecast] officeCode解決失敗: prefecture=%s', prefName)
  // 診断: area.json の全 office 名を出力
  const names = Object.values(area.offices)
    .map((o) => o.name)
    .join(', ')
  console.debug('[Weather:Forecast] 利用可能な offices: %s', names)
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

/** timeSeries[1]: 気温 */
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
 * 週間天気予報を取得する。
 *
 * weekAreaCode を指定すると該当区域のデータを返す。
 * 省略時はレスポンスの最初の区域を使用する。
 * 気温データは利用可能な最初の区域から取得する（null 許容）。
 */
export async function fetchWeeklyForecast(
  officeCode: string,
  weekAreaCode?: string,
): Promise<{ forecasts: readonly DailyForecast[]; resolvedWeekAreaCode: string }> {
  const url = `${getForecastUrl()}/${officeCode}.json`
  console.debug(
    '[Weather:Forecast] forecast fetch start: office=%s weekArea=%s',
    officeCode,
    weekAreaCode ?? '(auto)',
  )
  const data = (await fetchJsonWithRetry(url, 'Forecast')) as readonly [unknown, ForecastWeeklyRaw]

  const weekly = data[1]
  if (!weekly?.timeSeries) {
    console.warn('[Weather:Forecast] 週間予報データなし (timeSeries が存在しない)')
    return { forecasts: [], resolvedWeekAreaCode: '' }
  }

  const ts0 = weekly.timeSeries[0]
  const ts1 = weekly.timeSeries[1]

  // 該当する週間予報区域のデータを抽出（指定 or 最初の区域）
  const weatherArea = weekAreaCode
    ? ts0.areas.find((a) => a.area.code === weekAreaCode)
    : ts0.areas[0]
  if (!weatherArea) {
    console.warn(
      '[Weather:Forecast] 予報データなし。利用可能: %s',
      ts0.areas.map((a) => `${a.area.code}(${a.area.name})`).join(', '),
    )
    return { forecasts: [], resolvedWeekAreaCode: '' }
  }
  const resolvedWeekAreaCode = weatherArea.area.code

  // 気温データ: 最初の利用可能な区域
  const tempArea = ts1?.areas[0]

  const forecasts: DailyForecast[] = []
  const timeDefines = ts0.timeDefines

  for (let i = 0; i < timeDefines.length; i++) {
    const dateKey = timeDefines[i].slice(0, 10)
    const popStr = weatherArea.pops[i]
    const pop = popStr !== '' && popStr != null ? parseInt(popStr, 10) : null
    const reliabilityStr = weatherArea.reliabilities?.[i]
    const reliability =
      reliabilityStr === 'A' || reliabilityStr === 'B' || reliabilityStr === 'C'
        ? reliabilityStr
        : null

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

  console.debug(
    '[Weather:Forecast] forecast fetch done: days=%d weekArea=%s(%s)',
    forecasts.length,
    resolvedWeekAreaCode,
    weatherArea.area.name,
  )
  return { forecasts, resolvedWeekAreaCode }
}

/** テスト用: マスタデータキャッシュをクリアする */
export function clearForecastCache(): void {
  cachedAreaJson = null
}
