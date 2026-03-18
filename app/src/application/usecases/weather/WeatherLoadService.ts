/**
 * 天気データ取得オーケストレーション
 *
 * ETRN（過去の気象データ検索）から長期の過去データ（1977年〜昨日）を取得する。
 *
 * データフロー:
 *   1. ETRN 観測所を解決（初回のみ、以降キャッシュ）
 *   2. ETRN 日別 HTML テーブルをフェッチ・パース → DailyWeatherSummary
 */
import type { StoreLocation, DailyWeatherSummary } from '@/domain/models'
import type { EtrnStation } from '@/infrastructure/weather'
import {
  findNearestStation,
  resolveEtrnStation,
  fetchEtrnDailyWeather,
  resolveForcastArea,
} from '@/infrastructure/weather'

/** 天気データ取得の進捗状態 */
export interface WeatherLoadProgress {
  readonly storeId: string
  readonly status: 'resolving' | 'loading' | 'done' | 'error'
  readonly recordCount: number
  readonly error?: string
  readonly stationName?: string
}

/** 観測所解決結果（キャッシュ用） */
export interface ResolvedStation {
  readonly stationId: string
  readonly stationName: string
}

/**
 * 年月から取得日付範囲を計算する。
 *
 * @param year 対象年
 * @param month 対象月 (1-12)
 * @returns { startDate, endDate } YYYY-MM-DD 形式
 */
export function getDateRange(
  year: number,
  month: number,
): { readonly startDate: string; readonly endDate: string } {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const monthEndDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  // ETRN データは前日分まで利用可能 — endDate を昨日にクランプ
  const today = new Date()
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  const yy = yesterday.getFullYear()
  const mm = String(yesterday.getMonth() + 1).padStart(2, '0')
  const dd = String(yesterday.getDate()).padStart(2, '0')
  const yesterdayStr = `${yy}-${mm}-${dd}`

  const endDate = monthEndDate <= yesterdayStr ? monthEndDate : yesterdayStr

  // If entire range is in the future, startDate > endDate — caller should skip fetch
  return { startDate, endDate }
}

// ─── ETRN (過去データ) ──────────────────────────────

/** ETRN 日別データの取得結果 */
export interface EtrnLoadResult {
  readonly daily: readonly DailyWeatherSummary[]
  /** 初回解決した ETRN 観測所情報（StoreLocation キャッシュ用） */
  readonly resolvedStation?: EtrnStation
  /** 初回解決した AMeDAS 観測所情報（StoreLocation キャッシュ用） */
  readonly resolvedAmedas?: ResolvedStation
  /** 初回解決した予報区コード（StoreLocation キャッシュ用） */
  readonly resolvedOfficeCode?: string
}

/**
 * ETRN から月単位の日別天気データを取得する。
 *
 * ETRN 観測所情報が未解決の場合は自動解決する:
 *   1. AMeDAS 観測所テーブルから観測所名を取得
 *   2. 予報区域を解決（office name 取得のため）
 *   3. ETRN 観測所を解決（name マッチング）
 *   4. ETRN 日別データを取得
 *
 * 解決結果は EtrnLoadResult に含まれるため、呼び出し側で StoreLocation にキャッシュすべき。
 */
export async function loadEtrnDailyForStore(
  storeId: string,
  location: StoreLocation,
  year: number,
  month: number,
  onProgress?: (progress: WeatherLoadProgress) => void,
): Promise<EtrnLoadResult> {
  let precNo = location.etrnPrecNo
  let blockNo = location.etrnBlockNo
  let stationType = location.etrnStationType
  let resolvedStation: EtrnStation | undefined
  let resolvedAmedas: ResolvedStation | undefined
  let resolvedOfficeCode: string | undefined

  // ETRN 観測所が未解決の場合は自動解決
  if (precNo == null || !blockNo || !stationType) {
    onProgress?.({ storeId, status: 'resolving', recordCount: 0 })

    // Step 1: AMeDAS 観測所テーブルから観測所名を取得
    let stationName = location.amedasStationName ?? ''
    let stationId = location.amedasStationId
    if (!stationName) {
      const station = await findNearestStation(location.latitude, location.longitude)
      if (!station) {
        onProgress?.({
          storeId,
          status: 'error',
          recordCount: 0,
          error: '最寄りの観測所が見つかりません',
        })
        return { daily: [] }
      }
      stationName = station.kjName
      stationId = station.stationId
      resolvedAmedas = { stationId: station.stationId, stationName: station.kjName }
    }

    // Step 2: 予報区名を取得（ETRN の府県名マッチングに使用）
    let officeName = ''
    const amedasId = stationId ?? resolvedAmedas?.stationId
    if (amedasId) {
      const areaResult = await resolveForcastArea(amedasId)
      officeName = areaResult?.officeName ?? ''
      if (!location.forecastOfficeCode && areaResult) {
        resolvedOfficeCode = areaResult.officeCode
      }
    }

    if (!officeName) {
      onProgress?.({
        storeId,
        status: 'error',
        recordCount: 0,
        error: 'ETRN 観測所の解決に必要な予報区名を取得できません',
      })
      return { daily: [], resolvedAmedas, resolvedOfficeCode }
    }

    // Step 3: ETRN 観測所を解決
    const etrnResult = await resolveEtrnStation(stationName, officeName)
    if (!etrnResult) {
      onProgress?.({
        storeId,
        status: 'error',
        recordCount: 0,
        error: `ETRN 観測所が見つかりません: ${stationName} (${officeName})`,
      })
      return { daily: [], resolvedAmedas, resolvedOfficeCode }
    }

    precNo = etrnResult.precNo
    blockNo = etrnResult.blockNo
    stationType = etrnResult.stationType
    resolvedStation = etrnResult
  }

  // ETRN 日別データを取得
  onProgress?.({ storeId, status: 'loading', recordCount: 0 })

  const daily = await fetchEtrnDailyWeather(precNo, blockNo, stationType, year, month)

  onProgress?.({ storeId, status: 'done', recordCount: daily.length })

  return { daily, resolvedStation, resolvedAmedas, resolvedOfficeCode }
}
