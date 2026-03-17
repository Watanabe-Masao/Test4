/**
 * 天気データ取得オーケストレーション
 *
 * DuckDB テーブル (weather_hourly) をキャッシュとして使用し、
 * 未取得分のみ AMEDAS API からフェッチする。
 *
 * データフロー:
 *   1. DuckDB にキャッシュ済みか確認
 *   2. キャッシュなし → AMEDAS API フェッチ → DuckDB に INSERT
 *   3. DuckDB から SELECT して返却
 *
 * 下層（hooks, presentation）は DuckDB テーブルのみを参照し、
 * 生 API データに直接アクセスしない。
 */
import type { AsyncDuckDB, AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { StoreLocation, HourlyWeatherRecord } from '@/domain/models'
import { findNearestStation, fetchAmedasWeather } from '@/infrastructure/weather'
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
