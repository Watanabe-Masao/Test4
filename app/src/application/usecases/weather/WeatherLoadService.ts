/**
 * 天気データ取得オーケストレーション
 *
 * ETRN（過去の気象データ検索）から長期の過去データ（1977年〜昨日）を取得する。
 *
 * データフロー:
 *   1. ETRN 観測所を解決（初回のみ、以降キャッシュ）
 *      - 逆ジオコーディングで都道府県名を取得
 *      - ETRN 府県マップから観測所を解決
 *      - AMeDAS・予報区域に依存しない
 *   2. ETRN 日別 HTML テーブルをフェッチ・パース → DailyWeatherSummary
 */
import type { StoreLocation, DailyWeatherSummary, HourlyWeatherRecord } from '@/domain/models'
import type { EtrnStation } from '@/infrastructure/weather'
import {
  resolveEtrnStationByLocation,
  fetchEtrnDailyWeather,
  fetchEtrnHourlyRange,
} from '@/infrastructure/weather'

/** 天気データ取得の進捗状態 */
export interface WeatherLoadProgress {
  readonly storeId: string
  readonly status: 'resolving' | 'loading' | 'done' | 'error'
  readonly recordCount: number
  readonly error?: string
  readonly stationName?: string
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
}

/** ETRN 時間別データの取得結果 */
export interface EtrnHourlyLoadResult {
  readonly hourly: readonly HourlyWeatherRecord[]
  readonly resolvedStation?: EtrnStation
}

/**
 * ETRN から月単位の日別天気データを取得する。
 *
 * ETRN 観測所情報が未解決の場合は自動解決する:
 *   1. 逆ジオコーディングで都道府県名を取得
 *   2. ETRN 府県マップから観測所を解決（s1 優先）
 *   3. ETRN 日別データを取得
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
  console.debug(
    '[Weather:Load] ETRN日別取得開始: store=%s %d/%d lat=%f lon=%f',
    storeId,
    year,
    month,
    location.latitude,
    location.longitude,
  )

  let precNo = location.etrnPrecNo
  let blockNo = location.etrnBlockNo
  let stationType = location.etrnStationType
  let resolvedStation: EtrnStation | undefined

  // ETRN 観測所が未解決、または AMeDAS(a1) がキャッシュされている場合は気象台(s1)に再解決
  const needsResolve = precNo == null || !blockNo || !stationType || stationType === 'a1'
  if (needsResolve) {
    console.debug(
      '[Weather:Load] ETRN観測所%s → 自動解決開始',
      stationType === 'a1' ? '(AMeDAS→気象台に昇格)' : '未解決',
    )
    onProgress?.({ storeId, status: 'resolving', recordCount: 0 })

    const etrnResult = await resolveEtrnStationByLocation(location.latitude, location.longitude)
    if (!etrnResult) {
      console.warn('[Weather:Load] ETRN観測所解決失敗')
      onProgress?.({
        storeId,
        status: 'error',
        recordCount: 0,
        error: 'ETRN 観測所が見つかりません',
      })
      return { daily: [] }
    }

    precNo = etrnResult.precNo
    blockNo = etrnResult.blockNo
    stationType = etrnResult.stationType
    resolvedStation = etrnResult
    console.debug(
      '[Weather:Load] ETRN観測所解決完了: precNo=%d block=%s type=%s (%s)',
      precNo,
      blockNo,
      stationType,
      etrnResult.stationName,
    )
  } else {
    console.debug(
      '[Weather:Load] ETRN観測所キャッシュ済み: precNo=%d block=%s type=%s',
      precNo,
      blockNo,
      stationType,
    )
  }

  // ここに到達した時点で precNo / blockNo / stationType は確定済み
  // （未解決の場合は上で return している）
  const finalPrecNo = precNo!
  const finalBlockNo = blockNo!
  const finalStationType = stationType!

  // ETRN 日別データを取得
  console.debug('[Weather:Load] ETRN日別データ取得 %d/%d', year, month)
  onProgress?.({ storeId, status: 'loading', recordCount: 0 })

  const daily = await fetchEtrnDailyWeather(
    finalPrecNo,
    finalBlockNo,
    finalStationType,
    year,
    month,
  )

  console.debug('[Weather:Load] ETRN日別取得完了: %d日分', daily.length)
  onProgress?.({ storeId, status: 'done', recordCount: daily.length })

  return { daily, resolvedStation }
}

/**
 * ETRN から月単位の時間別天気データを取得する。
 *
 * 1日 = 1リクエストのため、日別取得より負荷が高い。
 * 対象日リスト（days）を指定して必要な日のみ取得する。
 *
 * ETRN 観測所が未解決の場合は逆ジオコーディング経由で解決する。
 */
export async function loadEtrnHourlyForStore(
  storeId: string,
  location: StoreLocation,
  year: number,
  month: number,
  days: readonly number[],
  onProgress?: (progress: WeatherLoadProgress) => void,
): Promise<EtrnHourlyLoadResult> {
  let precNo = location.etrnPrecNo
  let blockNo = location.etrnBlockNo
  let stationType = location.etrnStationType
  let resolvedStation: EtrnStation | undefined

  // ETRN 観測所が未解決、または AMeDAS(a1) がキャッシュされている場合は気象台(s1)に再解決
  if (precNo == null || !blockNo || !stationType || stationType === 'a1') {
    onProgress?.({ storeId, status: 'resolving', recordCount: 0 })

    const etrnResult = await resolveEtrnStationByLocation(location.latitude, location.longitude)
    if (!etrnResult) {
      onProgress?.({
        storeId,
        status: 'error',
        recordCount: 0,
        error: 'ETRN 観測所が見つかりません',
      })
      return { hourly: [] }
    }

    precNo = etrnResult.precNo
    blockNo = etrnResult.blockNo
    stationType = etrnResult.stationType
    resolvedStation = etrnResult
  }

  const finalPrecNo = precNo!
  const finalBlockNo = blockNo!
  const finalStationType = stationType!

  // ETRN 時間別データを取得
  onProgress?.({ storeId, status: 'loading', recordCount: 0 })

  const hourly = await fetchEtrnHourlyRange(
    finalPrecNo,
    finalBlockNo,
    finalStationType,
    year,
    month,
    days,
    (completed, total) => {
      onProgress?.({
        storeId,
        status: 'loading',
        recordCount: completed * 23,
        stationName: `${completed}/${total} 日`,
      })
    },
  )

  onProgress?.({ storeId, status: 'done', recordCount: hourly.length })

  return { hourly, resolvedStation }
}
