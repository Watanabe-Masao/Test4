/**
 * 天気データ取得オーケストレーション
 *
 * 2つのデータソースを使い分ける:
 *   - ETRN（過去の気象データ検索）: 長期の過去データ（1977年〜昨日）— メイン
 *   - AMEDAS リアルタイム API: 直近10日の時間別データ — サブ
 *
 * データフロー (ETRN):
 *   1. ETRN 観測所を解決（初回のみ、以降キャッシュ）
 *   2. ETRN 日別 HTML テーブルをフェッチ・パース → DailyWeatherSummary
 *
 * データフロー (AMEDAS):
 *   1. DuckDB にキャッシュ済みか確認
 *   2. キャッシュなし → AMEDAS API フェッチ → DuckDB に INSERT
 *   3. DuckDB から SELECT して返却
 */
import type { AsyncDuckDB, AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { StoreLocation, HourlyWeatherRecord, DailyWeatherSummary } from '@/domain/models'
import type { EtrnStation } from '@/infrastructure/weather'
import {
  findNearestStation,
  fetchAmedasWeather,
  resolveEtrnStation,
  fetchEtrnDailyWeather,
  resolveForcastArea,
} from '@/infrastructure/weather'
import { insertWeatherHourly } from '@/infrastructure/duckdb/dataConversions'
import {
  queryWeatherHourly,
  queryWeatherCacheCount,
  deleteWeatherCache,
} from '@/infrastructure/duckdb/queries/weatherQueries'

/** 天気データ取得の進捗状態 */
export interface WeatherLoadProgress {
  readonly storeId: string
  readonly status: 'cache-hit' | 'resolving' | 'loading' | 'done' | 'error'
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
 * 指定した店舗の天気データを DuckDB キャッシュ経由で取得する。
 *
 * 1. DuckDB にキャッシュ済みデータがあれば即返却
 * 2. なければ AMEDAS API からフェッチし DuckDB に投入
 * 3. DuckDB から SELECT して返却
 *
 * @param conn DuckDB コネクション
 * @param db DuckDB インスタンス
 * @param storeId 店舗ID
 * @param location 店舗の位置情報
 * @param startDate 開始日 (YYYY-MM-DD)
 * @param endDate 終了日 (YYYY-MM-DD)
 * @param onProgress 進捗コールバック
 * @param forceRefresh true の場合キャッシュを無視して再取得
 */
export async function loadWeatherForStore(
  conn: AsyncDuckDBConnection,
  db: AsyncDuckDB,
  storeId: string,
  location: StoreLocation,
  startDate: string,
  endDate: string,
  onProgress?: (progress: WeatherLoadProgress) => void,
  forceRefresh?: boolean,
): Promise<readonly HourlyWeatherRecord[]> {
  // 1. DuckDB キャッシュ確認
  if (!forceRefresh) {
    const cachedCount = await queryWeatherCacheCount(conn, storeId, startDate, endDate)
    if (cachedCount > 0) {
      onProgress?.({ storeId, status: 'cache-hit', recordCount: cachedCount })
      return queryWeatherHourly(conn, storeId, startDate, endDate)
    }
  } else {
    // 強制リフレッシュ: 既存キャッシュを削除
    await deleteWeatherCache(conn, storeId, startDate, endDate)
  }

  // 2. AMEDAS API からフェッチ
  let stationId = location.amedasStationId
  let stationName = location.amedasStationName ?? ''

  if (!stationId) {
    onProgress?.({ storeId, status: 'resolving', recordCount: 0 })

    const station = await findNearestStation(location.latitude, location.longitude)
    if (!station) {
      onProgress?.({
        storeId,
        status: 'error',
        recordCount: 0,
        error: '最寄りの AMEDAS 観測所が見つかりません',
      })
      return []
    }
    stationId = station.stationId
    stationName = station.kjName
  }

  onProgress?.({ storeId, status: 'loading', recordCount: 0, stationName })

  const records = await fetchAmedasWeather(stationId, startDate, endDate)

  // 3. DuckDB に投入
  if (records.length > 0) {
    await insertWeatherHourly(conn, db, records, storeId)
  }

  onProgress?.({
    storeId,
    status: 'done',
    recordCount: records.length,
    stationName,
  })

  // 4. DuckDB から読み出して返却（投入直後でも DuckDB が正式なソース）
  if (records.length > 0) {
    return queryWeatherHourly(conn, storeId, startDate, endDate)
  }
  return []
}

/**
 * 複数店舗の天気データを一括取得する。
 *
 * @param conn DuckDB コネクション
 * @param db DuckDB インスタンス
 * @param storeLocations storeId → StoreLocation のマップ
 * @param startDate 開始日 (YYYY-MM-DD)
 * @param endDate 終了日 (YYYY-MM-DD)
 * @param onProgress 進捗コールバック
 */
export async function loadWeatherData(
  conn: AsyncDuckDBConnection,
  db: AsyncDuckDB,
  storeLocations: Readonly<Record<string, StoreLocation>>,
  startDate: string,
  endDate: string,
  onProgress?: (progress: WeatherLoadProgress) => void,
): Promise<ReadonlyMap<string, readonly HourlyWeatherRecord[]>> {
  const result = new Map<string, readonly HourlyWeatherRecord[]>()

  for (const [storeId, location] of Object.entries(storeLocations)) {
    try {
      const records = await loadWeatherForStore(
        conn,
        db,
        storeId,
        location,
        startDate,
        endDate,
        onProgress,
      )
      result.set(storeId, records)
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e)
      onProgress?.({ storeId, status: 'error', recordCount: 0, error })
    }
  }

  return result
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

  // AMEDAS データは前日分まで利用可能 — endDate を昨日にクランプ
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
 *   1. AMeDAS 観測所を解決（station name 取得のため）
 *   2. 予報区域を解決（office name 取得のため）
 *   3. ETRN 観測所を解決（name マッチング）
 *   4. ETRN 日別データを取得
 *
 * 解決結果は EtrnLoadResult に含まれるため、呼び出し側で StoreLocation にキャッシュすべき。
 *
 * @param storeId 店舗ID（進捗表示用）
 * @param location 店舗の位置情報
 * @param year 対象年
 * @param month 対象月 (1-12)
 * @param onProgress 進捗コールバック
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

    // Step 1: AMeDAS 観測所名を取得
    let amedasStationName = location.amedasStationName ?? ''
    if (!amedasStationName) {
      const station = await findNearestStation(location.latitude, location.longitude)
      if (!station) {
        onProgress?.({
          storeId,
          status: 'error',
          recordCount: 0,
          error: '最寄りの AMEDAS 観測所が見つかりません',
        })
        return { daily: [] }
      }
      amedasStationName = station.kjName
      resolvedAmedas = { stationId: station.stationId, stationName: station.kjName }
    }

    // Step 2: 予報区名を取得（ETRN の府県名マッチングに使用）
    let officeName = ''
    const officeCode = location.forecastOfficeCode
    if (officeCode) {
      // area.json から officeName を取得するために resolveForcastArea を利用
      const amedasId = location.amedasStationId ?? resolvedAmedas?.stationId
      if (amedasId) {
        const areaResult = await resolveForcastArea(amedasId)
        officeName = areaResult?.officeName ?? ''
        if (!location.forecastOfficeCode && areaResult) {
          resolvedOfficeCode = areaResult.officeCode
        }
      }
    } else {
      // forecastOfficeCode が未設定の場合も解決を試みる
      const amedasId = location.amedasStationId ?? resolvedAmedas?.stationId
      if (amedasId) {
        const areaResult = await resolveForcastArea(amedasId)
        officeName = areaResult?.officeName ?? ''
        resolvedOfficeCode = areaResult?.officeCode
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
    const etrnResult = await resolveEtrnStation(amedasStationName, officeName)
    if (!etrnResult) {
      onProgress?.({
        storeId,
        status: 'error',
        recordCount: 0,
        error: `ETRN 観測所が見つかりません: ${amedasStationName} (${officeName})`,
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
