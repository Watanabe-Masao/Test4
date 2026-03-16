/**
 * 天気データ取得オーケストレーション
 *
 * データインポート完了後に、対象期間の天気データを
 * Open-Meteo API から取得し、IndexedDB → DuckDB に格納する。
 *
 * 責務: 取得計画の決定・API呼び出し・永続化。
 * 計算ロジック（集約等）は domain/calculations に委譲。
 */
import type { StoreLocation, HourlyWeatherRecord } from '@/domain/models'
import { fetchHistoricalWeather } from '@/infrastructure/weather'

/** 天気データ取得の進捗状態 */
export interface WeatherLoadProgress {
  readonly storeId: string
  readonly status: 'loading' | 'done' | 'error'
  readonly recordCount: number
  readonly error?: string
}

/**
 * 指定した店舗群・日付範囲の天気データを取得する。
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
      onProgress?.({ storeId, status: 'loading', recordCount: 0 })

      const records = await fetchHistoricalWeather(
        location.latitude,
        location.longitude,
        startDate,
        endDate,
      )

      result.set(storeId, records)
      onProgress?.({ storeId, status: 'done', recordCount: records.length })
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
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { startDate, endDate }
}
