/**
 * 天気データクエリモジュール
 *
 * weather_hourly テーブルから天気データを取得する。
 * API から取得したデータは DuckDB にキャッシュされるため、
 * 2回目以降のアクセスは DuckDB から直接読み出す。
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { HourlyWeatherRecord } from '@/domain/models'
import { queryToObjects, buildWhereClause, storeIdFilter } from '../queryRunner'
import { queryScalar } from '../queryRunner'

// ── 結果型（DuckDB → domain 変換用） ──

/** DuckDB 行から camelCase 変換された中間型 */
interface WeatherHourlyRow {
  readonly dateKey: string
  readonly year: number
  readonly month: number
  readonly day: number
  readonly hour: number
  readonly storeId: string
  readonly temperature: number
  readonly humidity: number
  readonly precipitation: number
  readonly windSpeed: number
  readonly weatherCode: number
  readonly sunshineDuration: number
}

/**
 * 指定店舗・日付範囲の時間別天気データを取得する。
 *
 * @param conn DuckDB コネクション
 * @param storeId 店舗ID
 * @param startDate 開始日 (YYYY-MM-DD)
 * @param endDate 終了日 (YYYY-MM-DD)
 * @returns HourlyWeatherRecord 配列（domain 型）
 */
export async function queryWeatherHourly(
  conn: AsyncDuckDBConnection,
  storeId: string,
  startDate: string,
  endDate: string,
): Promise<readonly HourlyWeatherRecord[]> {
  const where = buildWhereClause([
    storeIdFilter([storeId]),
    `date_key >= '${startDate}'`,
    `date_key <= '${endDate}'`,
  ])

  const sql = `
    SELECT
      date_key, year, month, day, hour, store_id,
      temperature, humidity, precipitation,
      wind_speed, weather_code, sunshine_duration
    FROM weather_hourly
    ${where}
    ORDER BY date_key, hour`

  const rows = await queryToObjects<WeatherHourlyRow>(conn, sql)

  // DuckDB 行 → domain 型に変換
  return rows.map((row) => ({
    dateKey: row.dateKey,
    hour: row.hour,
    temperature: row.temperature,
    humidity: row.humidity,
    precipitation: row.precipitation,
    windSpeed: row.windSpeed,
    weatherCode: row.weatherCode,
    sunshineDuration: row.sunshineDuration,
  }))
}

/** 時間帯別天気平均の1行 */
export interface HourlyWeatherAvgRow {
  readonly hour: number
  readonly avgTemperature: number
  readonly avgHumidity: number
  readonly totalPrecipitation: number
  readonly avgSunshineDuration: number
  readonly dayCount: number
}

/**
 * 指定店舗・日付範囲の時間帯別天気平均を取得する（月間プロファイル用）。
 */
export async function queryWeatherHourlyAvg(
  conn: AsyncDuckDBConnection,
  storeId: string,
  startDate: string,
  endDate: string,
): Promise<readonly HourlyWeatherAvgRow[]> {
  const where = buildWhereClause([
    storeIdFilter([storeId]),
    `date_key >= '${startDate}'`,
    `date_key <= '${endDate}'`,
  ])

  const sql = `
    SELECT
      hour,
      AVG(temperature) AS avg_temperature,
      AVG(humidity) AS avg_humidity,
      SUM(precipitation) AS total_precipitation,
      AVG(sunshine_duration) AS avg_sunshine_duration,
      COUNT(DISTINCT date_key) AS day_count
    FROM weather_hourly
    ${where}
    GROUP BY hour
    ORDER BY hour`

  return queryToObjects<HourlyWeatherAvgRow>(conn, sql)
}

/**
 * 指定店舗・日付範囲のキャッシュ済みレコード数を返す。
 * 0 ならキャッシュなし → API フェッチが必要。
 */
export async function queryWeatherCacheCount(
  conn: AsyncDuckDBConnection,
  storeId: string,
  startDate: string,
  endDate: string,
): Promise<number> {
  const where = buildWhereClause([
    storeIdFilter([storeId]),
    `date_key >= '${startDate}'`,
    `date_key <= '${endDate}'`,
  ])

  const sql = `SELECT COUNT(*) AS cnt FROM weather_hourly ${where}`
  return (await queryScalar<number>(conn, sql)) ?? 0
}

/**
 * 指定店舗・日付範囲の天気キャッシュを削除する。
 * 再取得前のキャッシュ無効化に使用。
 */
export async function deleteWeatherCache(
  conn: AsyncDuckDBConnection,
  storeId: string,
  startDate: string,
  endDate: string,
): Promise<void> {
  const where = buildWhereClause([
    storeIdFilter([storeId]),
    `date_key >= '${startDate}'`,
    `date_key <= '${endDate}'`,
  ])

  await conn.query(`DELETE FROM weather_hourly ${where}`)
}
