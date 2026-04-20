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
import { queryScalar } from './queryRunner'

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
  // store_day_summary は状況により VIEW にも BASE TABLE にもなるため、
  // information_schema で実際の型を先に確認してから正しい DROP を発行する
  // (DuckDB は `DROP VIEW IF EXISTS` でも対象が TABLE だと Catalog Error を
  // 投げるため、blind な try-catch は警告ノイズを出し続けてしまう)
  await dropStoreDaySummaryByActualType(conn)

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
 * `store_day_summary` の実際の型 (VIEW or BASE TABLE) を
 * `information_schema` から判定し、正しい DROP 文を発行する。
 *
 * 存在しなければ何もしない。型判定に失敗した場合のみ、fallback として
 * 両方の DROP を try-catch で実行する (保険)。
 */
async function dropStoreDaySummaryByActualType(conn: AsyncDuckDBConnection): Promise<void> {
  const tableType = await queryScalar<string>(
    conn,
    "SELECT table_type FROM information_schema.tables WHERE table_name = 'store_day_summary'",
  )
  if (tableType === 'VIEW') {
    await conn.query('DROP VIEW IF EXISTS store_day_summary')
  } else if (tableType === 'BASE TABLE') {
    await conn.query('DROP TABLE IF EXISTS store_day_summary')
  }
  // tableType == null: 存在しない → DROP 不要
}

/**
 * 指定年月のデータを全テーブルから削除する。
 *
 * **用途:** 「月データを DB から明示的に取り除く」operation。`loadMonth` の
 * 前処理として呼ぶべきではない — `loadMonth` は replace セマンティクスで
 * 内部削除を完結するため、前処理 delete は冗長・二重実行になる。
 * 呼び出し側は「不要になった月を消す」ときだけこの API を使う。
 * 詳細は `dataLoader.ts::loadMonth` の JSDoc を参照。
 */
export async function deleteMonth(
  conn: AsyncDuckDBConnection,
  year: number,
  month: number,
): Promise<void> {
  for (const name of TABLES_WITH_YEAR_MONTH) {
    if (TABLES_WITH_PREV_YEAR_FLAG.has(name)) {
      // is_prev_year 列を持つテーブルは当年行のみ削除（前年行を保護）
      await conn.query(
        `DELETE FROM ${name} WHERE year = ${year} AND month = ${month} AND is_prev_year = false`,
      )
    } else {
      await conn.query(`DELETE FROM ${name} WHERE year = ${year} AND month = ${month}`)
    }
  }
}

/**
 * 指定 (year, month) 位置の **前年スコープ行のみ** を削除する（year-shift しない）。
 *
 * TABLES_WITH_PREV_YEAR_FLAG のテーブルでは `is_prev_year=true` 行のみ削除し、
 * PREV_YEAR_INSERT_TABLES のテーブルでは (year, month) の全行を削除する
 * （これらは is_prev_year 列を持たず、前年ロード時に (year, month) 位置に
 * そのまま INSERT される）。
 *
 * **用途:** `loadMonth(..., isPrevYear=true)` の内部 purge が呼ぶ。
 * `year` は前年ロードの対象月そのもの（例: 2024 年 4 月を前年データとして
 * 再ロードしたいなら `year=2024, month=4`）で、year-shift は行わない。
 *
 * 【テーブル別の削除戦略】
 * - classified_sales / category_time_sales / time_slots: is_prev_year=true 行のみ削除
 *   → 同一 (year, month) に当年データ (is_prev_year=false) が共存しうるため
 * - purchase / special_sales / transfers: is_prev_year 列なし → (year, month) 全行削除
 */
export async function deletePrevYearRowsAt(
  conn: AsyncDuckDBConnection,
  year: number,
  month: number,
): Promise<void> {
  for (const name of TABLES_WITH_YEAR_MONTH) {
    if (TABLES_WITH_PREV_YEAR_FLAG.has(name)) {
      await conn.query(
        `DELETE FROM ${name} WHERE year = ${year} AND month = ${month} AND is_prev_year = true`,
      )
    }
  }
  for (const name of PREV_YEAR_INSERT_TABLES) {
    await conn.query(`DELETE FROM ${name} WHERE year = ${year} AND month = ${month}`)
  }
}

/**
 * 当年 (year, month) に対応する **前年スロット** (year-1, month) の行を削除する。
 *
 * **用途:** 月データの explicit remove。`deleteMonth` とペアで呼ぶことで、
 * 当年スコープと前年スコープの両方を DB から取り除く（`workerHandlers.executeDeleteMonth`
 * を参照）。`loadMonth` の前処理として呼ぶ必要はない — `loadMonth(..., isPrevYear=true)`
 * は内部で `deletePrevYearRowsAt` を呼んで前年スコープを直接 purge する。
 *
 * 【背景: なぜ deleteMonth だけでは不十分か】
 * `loadMonth` は前年データを (year-1, month) の year/month で INSERT する。
 * しかし `deleteMonth(year, month)` は当年の (year, month) 行のみを削除するため、
 * 前年レコードは残ってしまう。再ロードが重なると store_day_summary VIEW で
 * 行倍増が発生する（#前年点数 2 倍バグ — special_sales の前年データが 2 重に）。
 *
 * @defense year-shift 設計
 *   この関数は引数として **当年** を受け取り、内部で `year - 1` してから削除する
 *   設計（「当年文脈の explicit remove」として `deleteMonth` とペアで使うため）。
 *   「指定 (year, month) 位置の前年行を消す」と誤解すると 1 年ズレる。Phase 2
 *   初版でこれを踏んで回帰を出した経緯がある。
 *   絶対位置で前年行を消したい場合は必ず {@link deletePrevYearRowsAt} を直接呼ぶ。
 *   詳細: references/03-guides/data-load-idempotency-handoff.md §3.1
 */
export async function deletePrevYearMonth(
  conn: AsyncDuckDBConnection,
  year: number,
  month: number,
): Promise<void> {
  await deletePrevYearRowsAt(conn, year - 1, month)
}
