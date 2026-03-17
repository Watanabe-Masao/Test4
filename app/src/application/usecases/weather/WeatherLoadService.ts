/**
 * 天気データ取得オーケストレーション
 *
 * 気象庁 AMEDAS の実測データを取得し、HourlyWeatherRecord に変換する。
 *
 * 責務: 観測所解決・日付範囲計算・API 呼び出し。
 * 計算ロジック（集約等）は domain/calculations に委譲。
 */
import type { StoreLocation, HourlyWeatherRecord } from '@/domain/models'
import { findNearestStation, fetchAmedasWeather } from '@/infrastructure/weather'

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
 * 指定した店舗群・日付範囲の天気データを取得する。
 *
 * 1. 各店舗の緯度経度から最寄り AMEDAS 観測所を解決する
 * 2. 観測所の過去データを日付範囲で取得する
 *
 * @param storeLocations storeId → StoreLocation のマップ
 * @param startDate 開始日（YYYY-MM-DD）
 * @param endDate 終了日（YYYY-MM-DD）
 * @param onProgress 進捗コールバック
 * @returns 店舗ごとの天気データ（storeId → HourlyWeatherRecord[]）
 */
export async function loadWeatherData(
  storeLocations: Readonly<Record<string, StoreLocation>>,
  startDate: string,
  endDate: string,
  onProgress?: (progress: WeatherLoadProgress) => void,
): Promise<ReadonlyMap<string, readonly HourlyWeatherRecord[]>> {
  const result = new Map<string, readonly HourlyWeatherRecord[]>()

  for (const [storeId, location] of Object.entries(storeLocations)) {
    try {
      // 1. 観測所解決（キャッシュ済みなら即利用）
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
          continue
        }
        stationId = station.stationId
        stationName = station.kjName
      }

      onProgress?.({
        storeId,
        status: 'loading',
        recordCount: 0,
        stationName,
      })

      // 2. AMEDAS データ取得
      const records = await fetchAmedasWeather(stationId, startDate, endDate)

      result.set(storeId, records)
      onProgress?.({
        storeId,
        status: 'done',
        recordCount: records.length,
        stationName,
      })
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
