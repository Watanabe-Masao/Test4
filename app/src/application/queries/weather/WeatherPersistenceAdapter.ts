/**
 * WeatherPersistenceAdapter — 天気データの DuckDB 永続化
 *
 * ETRN フォールバックで取得した天気データを DuckDB に書き戻す。
 * infrastructure の insertWeatherHourly をラップし、
 * application/hooks が infrastructure を直接参照しないようにする。
 */
import type { AsyncDuckDBConnection, AsyncDuckDB } from '@duckdb/duckdb-wasm'
import type { HourlyWeatherRecord } from '@/domain/models/record'
import { insertWeatherHourly } from '@/infrastructure/duckdb/dataConversions'

/**
 * 天気データ永続化コールバック型。
 *
 * presentation/ が raw DuckDB 型に依存しないように、
 * conn/db をクロージャで閉じた関数として渡す。
 */
export type WeatherPersister = (
  records: readonly HourlyWeatherRecord[],
  storeId: string,
) => Promise<number>

/**
 * WeatherPersister ファクトリ。conn/db をクロージャで閉じる。
 * conn/db が null の場合は null を返す。
 */
export function createWeatherPersister(
  conn: AsyncDuckDBConnection | null,
  db: AsyncDuckDB | null,
): WeatherPersister | null {
  if (!conn || !db) return null
  return (records, storeId) => insertWeatherHourly(conn, db, records, storeId)
}

/**
 * 天気時間帯データを DuckDB に永続化する。
 *
 * @returns 挿入行数。失敗時は 0 を返す（例外を投げない）。
 */
export async function persistWeatherHourly(
  conn: AsyncDuckDBConnection,
  db: AsyncDuckDB,
  records: readonly HourlyWeatherRecord[],
  storeId: string,
): Promise<number> {
  return insertWeatherHourly(conn, db, records, storeId)
}
