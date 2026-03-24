/**
 * DuckDB データローダー
 *
 * ImportedData の各データソースを DuckDB テーブルに投入する。
 * StoreDayIndex系は year/month を外部パラメータで受け取り付与する。
 *
 * INSERT戦略: db.registerFileText() + read_json_auto() によるバルクロード。
 * 数万行規模のデータで prepared statement より高速。
 */
import type { AsyncDuckDB, AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { ImportedData } from '@/domain/models/storeTypes'
import { ALL_TABLE_DDLS, STORE_DAY_SUMMARY_VIEW_DDL, TABLE_NAMES } from './schemas'
import type { TableName } from './schemas'
import {
  insertClassifiedSales,
  insertCategoryTimeSales,
  insertPurchase,
  insertSpecialSales,
  insertTransfers,
  insertCostInclusions,
  insertDepartmentKpi,
  insertBudget,
  insertInventoryConfig,
} from './dataConversions'

export interface LoadResult {
  readonly rowCounts: Readonly<Record<TableName, number>>
  readonly durationMs: number
}

// ── 公開API ──

/**
 * 全テーブルを DROP + CREATE し、VIEW を再作成する。
 *
 * weather_hourly は外部 API キャッシュのため DROP 対象から除外する。
 * ImportedData の再ロードで天気キャッシュを消す必要はない。
 */
/** ImportedData 再ロード時に DROP しないテーブル（外部 API キャッシュ） */
const PERSISTENT_TABLES: ReadonlySet<string> = new Set(['weather_hourly'])

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
/** app_settings は year/month を持たない、weather_hourly は外部キャッシュのため deleteMonth 対象外 */
const TABLES_WITH_YEAR_MONTH = TABLE_NAMES.filter(
  (n) => n !== 'app_settings' && !PERSISTENT_TABLES.has(n),
)

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
 * classified_sales / category_time_sales は is_prev_year=true のみ、
 * purchase / special_sales / transfers は is_prev_year 列がないため全行削除する。
 *
 * loadMonth 前に deleteMonth + deletePrevYearMonth の両方を呼ぶことで、
 * 再ロード時に前年データが蓄積する問題を防止する。
 */
/** is_prev_year 列を持つテーブル（前年フラグで絞り込み可能） */
const TABLES_WITH_PREV_YEAR_FLAG: ReadonlySet<string> = new Set([
  'classified_sales',
  'category_time_sales',
  'time_slots',
])
/** loadMonth が前年データを INSERT するテーブル（is_prev_year 列なし） */
const PREV_YEAR_INSERT_TABLES: readonly string[] = ['purchase', 'special_sales', 'transfers']
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

/**
 * 1ヶ月分の ImportedData を DuckDB に投入する。
 * 追記モード — テーブルが存在する前提で INSERT のみ行う。
 * 初回呼び出し前に resetTables() を呼ぶこと。
 */
export async function loadMonth(
  conn: AsyncDuckDBConnection,
  db: AsyncDuckDB,
  data: ImportedData,
  year: number,
  month: number,
): Promise<LoadResult> {
  const start = performance.now()
  const rowCounts = {} as Record<TableName, number>

  try {
    // classified_sales (当年)
    rowCounts.classified_sales = await insertClassifiedSales(
      conn,
      db,
      data.classifiedSales.records,
      false,
    )

    // classified_sales (前年) — 追記
    const prevCsCount = await insertClassifiedSales(
      conn,
      db,
      data.prevYearClassifiedSales.records,
      true,
    )
    rowCounts.classified_sales += prevCsCount

    // category_time_sales + time_slots (当年)
    const { ctsCount, tsCount } = await insertCategoryTimeSales(
      conn,
      db,
      data.categoryTimeSales.records,
      false,
    )
    rowCounts.category_time_sales = ctsCount
    rowCounts.time_slots = tsCount

    // category_time_sales + time_slots (前年) — 追記
    const prevCts = await insertCategoryTimeSales(
      conn,
      db,
      data.prevYearCategoryTimeSales.records,
      true,
    )
    rowCounts.category_time_sales += prevCts.ctsCount
    rowCounts.time_slots += prevCts.tsCount

    // purchase (当年)
    rowCounts.purchase = await insertPurchase(conn, db, data.purchase, year, month)

    // purchase (前年) — 追記。date_key で区別（is_prev_year 不要）
    if (data.prevYearPurchase.records.length > 0) {
      const prevPurchaseYear = data.prevYearPurchase.records[0].year
      const prevPurchaseMonth = data.prevYearPurchase.records[0].month
      rowCounts.purchase += await insertPurchase(
        conn,
        db,
        data.prevYearPurchase,
        prevPurchaseYear,
        prevPurchaseMonth,
      )
    }

    // special_sales (flowers + directProduce 当年)
    const flowersCount = await insertSpecialSales(conn, db, data.flowers, year, month, 'flowers')
    const dpCount = await insertSpecialSales(
      conn,
      db,
      data.directProduce,
      year,
      month,
      'directProduce',
    )
    rowCounts.special_sales = flowersCount + dpCount

    // special_sales (前年 directProduce) — 追記
    if (data.prevYearDirectProduce.records.length > 0) {
      const prevDpYear = data.prevYearDirectProduce.records[0].year
      const prevDpMonth = data.prevYearDirectProduce.records[0].month
      rowCounts.special_sales += await insertSpecialSales(
        conn,
        db,
        data.prevYearDirectProduce,
        prevDpYear,
        prevDpMonth,
        'directProduce',
      )
    }
    // prevYearFlowers は既に special_sales にロード済み（comparison module 経由）

    // transfers (interStoreIn + interStoreOut 当年)
    const inCount = await insertTransfers(conn, db, data.interStoreIn, year, month, 'in')
    const outCount = await insertTransfers(conn, db, data.interStoreOut, year, month, 'out')
    rowCounts.transfers = inCount + outCount

    // transfers (前年) — 追記
    if (data.prevYearInterStoreIn.records.length > 0) {
      const prevInYear = data.prevYearInterStoreIn.records[0].year
      const prevInMonth = data.prevYearInterStoreIn.records[0].month
      rowCounts.transfers += await insertTransfers(
        conn,
        db,
        data.prevYearInterStoreIn,
        prevInYear,
        prevInMonth,
        'in',
      )
    }
    if (data.prevYearInterStoreOut.records.length > 0) {
      const prevOutYear = data.prevYearInterStoreOut.records[0].year
      const prevOutMonth = data.prevYearInterStoreOut.records[0].month
      rowCounts.transfers += await insertTransfers(
        conn,
        db,
        data.prevYearInterStoreOut,
        prevOutYear,
        prevOutMonth,
        'out',
      )
    }

    // consumables
    rowCounts.consumables = await insertCostInclusions(conn, db, data.consumables, year, month)

    // department_kpi
    rowCounts.department_kpi = await insertDepartmentKpi(
      conn,
      db,
      data.departmentKpi.records,
      year,
      month,
    )

    // budget
    rowCounts.budget = await insertBudget(conn, db, data.budget, year, month)

    // inventory_config
    rowCounts.inventory_config = await insertInventoryConfig(conn, db, data.settings, year, month)

    // app_settings は loadMonth ではなく loadAppSettings() で別途投入
    rowCounts.app_settings = 0

    // weather_hourly は外部 API キャッシュのため loadMonth では投入しない
    // WeatherLoadService が DuckDB に直接投入する
    rowCounts.weather_hourly = 0
  } catch (err) {
    // INSERT失敗時は該当月のデータのみ削除して部分データの残存を防ぐ。
    // resetTables() は全テーブルを DROP → CREATE するため、他の月のデータも消失し、
    // 並行実行時に SQL インターリーブで「Table does not exist」エラーを誘発する。
    console.error(`DuckDB loadMonth failed for ${year}-${month}:`, err)
    try {
      await deleteMonth(conn, year, month)
    } catch (deleteErr) {
      console.error('DuckDB deleteMonth after load failure also failed:', deleteErr)
    }
    throw err
  }

  return {
    rowCounts,
    durationMs: performance.now() - start,
  }
}

/**
 * アプリ設定を app_settings テーブルに投入する。
 * INSERT OR REPLACE で冪等に動作する。
 */
export async function loadAppSettings(
  conn: AsyncDuckDBConnection,
  settings: {
    readonly defaultMarkupRate: number
    readonly defaultBudget: number
    readonly targetGrossProfitRate: number
    readonly warningThreshold: number
  },
): Promise<void> {
  await conn.query('DELETE FROM app_settings')
  const entries = [
    { key: 'defaultMarkupRate', value: settings.defaultMarkupRate },
    { key: 'defaultBudget', value: settings.defaultBudget },
    { key: 'targetGrossProfitRate', value: settings.targetGrossProfitRate },
    { key: 'warningThreshold', value: settings.warningThreshold },
  ]
  for (const { key, value } of entries) {
    await conn.query(`INSERT INTO app_settings VALUES ('${key}', ${value})`)
  }
}
