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
