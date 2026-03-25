/**
 * DuckDB テーブル削除ポリシー
 *
 * テーブルの DROP/CREATE（リセット）、月別削除、前年データ削除の戦略を管理する。
 * テーブルの分類（永続テーブル、is_prev_year 列の有無等）に基づく削除判断をここに集約する。
 *
 * 【設計背景】
 * テーブルごとに削除戦略が異なる理由:
 * - weather_hourly: 外部 API キャッシュのため DROP 対象外
 * - classified_sales / category_time_sales / time_slots: is_prev_year 列があり、
 *   同一 (year, month) に当年+前年データが共存しうる
 * - purchase / special_sales / transfers: is_prev_year 列なし。
 *   前年データは (year-1, month) で INSERT されるため、行全体で削除する
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import { ALL_TABLE_DDLS, STORE_DAY_SUMMARY_VIEW_DDL, TABLE_NAMES } from './schemas'

// ── テーブル分類定数 ──

/** ImportedData 再ロード時に DROP しないテーブル（外部 API キャッシュ） */
export const PERSISTENT_TABLES: ReadonlySet<string> = new Set(['weather_hourly'])

/** year/month 列を持つテーブル（deleteMonth 対象） */
export const TABLES_WITH_YEAR_MONTH = TABLE_NAMES.filter(
  (n) => n !== 'app_settings' && !PERSISTENT_TABLES.has(n),
)

/** is_prev_year 列を持つテーブル（前年フラグで絞り込み可能） */
export const TABLES_WITH_PREV_YEAR_FLAG: ReadonlySet<string> = new Set([
  'classified_sales',
  'category_time_sales',
  'time_slots',
])

/** loadMonth が前年データを INSERT するテーブル（is_prev_year 列なし） */
export const PREV_YEAR_INSERT_TABLES: readonly string[] = ['purchase', 'special_sales', 'transfers']

// ── 公開API ──

/**
 * 全テーブルを DROP + CREATE し、VIEW を再作成する。
 *
 * weather_hourly は外部 API キャッシュのため DROP 対象から除外する。
 */
export async function resetTables(conn: AsyncDuckDBConnection): Promise<void> {
  // DROP all tables (including materialized summary if exists)
  // DuckDB は DROP VIEW/TABLE IF EXISTS でも型不一致でエラーになるため try-catch で吸収
  for (const type of ['VIEW', 'TABLE'] as const) {
    try {
      await conn.query(`DROP ${type} IF EXISTS store_day_summary`)
    } catch {
      // 型不一致（VIEW vs TABLE）の場合は無視
    }
  }
  for (const name of TABLE_NAMES) {
    if (PERSISTENT_TABLES.has(name)) continue
    await conn.query(`DROP TABLE IF EXISTS ${name}`)
  }

  // CREATE all tables
  for (const { ddl } of ALL_TABLE_DDLS) {
    await conn.query(ddl)
  }

  // CREATE VIEW
  await conn.query(STORE_DAY_SUMMARY_VIEW_DDL)
}

/**
 * 指定年月のデータを全テーブルから削除する。
 * 増分ロード時に使用: deleteMonth → loadMonth で特定月のみ差し替え。
 */
export async function deleteMonth(
  conn: AsyncDuckDBConnection,
  year: number,
  month: number,
): Promise<void> {
  for (const name of TABLES_WITH_YEAR_MONTH) {
    await conn.query(`DELETE FROM ${name} WHERE year = ${year} AND month = ${month}`)
  }
}

/**
 * loadMonth が前年データとして INSERT する (year-1, month) のデータも削除する。
 *
 * 【背景: なぜ deleteMonth だけでは不十分か】
 * loadMonth は前年データを (year-1, month) の year/month で INSERT する。
 * しかし deleteMonth(year, month) は当年の year/month のみ削除するため、
 * 再ロード時に前年データが蓄積し、store_day_summary VIEW で行倍増が発生する。
 * （実際に発生: #前年点数2倍バグ — special_sales の前年データが2重に）
 *
 * 【テーブル別の削除戦略】
 * - classified_sales / category_time_sales / time_slots: is_prev_year=true のみ削除
 *   → 同一 (year, month) に当年データ (is_prev_year=false) が共存しうるため
 * - purchase / special_sales / transfers: is_prev_year 列なし → (prevYear, month) 全行削除
 *   → これらのテーブルは is_prev_year 列を持たない設計上の制約
 */
export async function deletePrevYearMonth(
  conn: AsyncDuckDBConnection,
  year: number,
  month: number,
): Promise<void> {
  const prevYear = year - 1
  // is_prev_year 列ありテーブル: 前年フラグ行のみ削除（当年として読み込んだデータは残す）
  for (const name of TABLES_WITH_YEAR_MONTH) {
    if (TABLES_WITH_PREV_YEAR_FLAG.has(name)) {
      await conn.query(
        `DELETE FROM ${name} WHERE year = ${prevYear} AND month = ${month} AND is_prev_year = true`,
      )
    }
  }
  // is_prev_year 列なしテーブル: (prevYear, month) の行を全削除
  for (const name of PREV_YEAR_INSERT_TABLES) {
    await conn.query(`DELETE FROM ${name} WHERE year = ${prevYear} AND month = ${month}`)
  }
}
