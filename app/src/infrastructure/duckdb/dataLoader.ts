/**
 * DuckDB データローダー（月次データ投入）
 *
 * MonthlyData の各データソースを DuckDB テーブルに投入する。
 * StoreDayIndex系は year/month を外部パラメータで受け取り付与する。
 *
 * INSERT戦略: db.registerFileText() + read_json_auto() によるバルクロード。
 * 数万行規模のデータで prepared statement より高速。
 *
 * 削除ポリシー（resetTables, deleteMonth, deletePrevYearMonth, deletePrevYearRowsAt）は
 * deletePolicy.ts に分離されている。
 *
 * @responsibility R:unclassified
 */
import type { AsyncDuckDB, AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { MonthlyData } from '@/domain/models/MonthlyData'
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
import { deleteMonth, deletePrevYearRowsAt } from './deletePolicy'

// ── 後方互換 re-export（deletePolicy.ts から） ──
export { resetTables, deleteMonth, deletePrevYearMonth } from './deletePolicy'

export interface LoadResult {
  readonly rowCounts: Readonly<Record<TableName, number>>
  readonly durationMs: number
}

/**
 * loadMonth の対象スコープを削除する。replace セマンティクスの先頭処理と
 * 失敗時 cleanup の両方で同じ実装を共有するための private helper。
 *
 * isPrevYear によって削除範囲が変わる（`deletePolicy.ts` 参照）:
 * - false: 全テーブルの (year, month) 行（`deleteMonth`）
 * - true:  (year, month) 位置の前年スコープ行のみ（`deletePrevYearRowsAt`）。
 *          year-shift はしない — 引数 year は前年ロードの対象月そのものを指す。
 */
async function purgeLoadTarget(
  conn: AsyncDuckDBConnection,
  year: number,
  month: number,
  isPrevYear: boolean,
): Promise<void> {
  if (isPrevYear) {
    await deletePrevYearRowsAt(conn, year, month)
  } else {
    await deleteMonth(conn, year, month)
  }
}

// ── 公開API ──

/**
 * 1ヶ月分の MonthlyData を DuckDB に投入する。
 *
 * **replace セマンティクス（冪等）:** この関数は「対象月を差し替える」唯一の正本 API。
 * 呼び出し側は削除順序を気にせず、単に (year, month, isPrevYear) を渡せば、
 * 関数内部で対象スコープを削除してから INSERT する。再ロード・部分失敗後の再試行・
 * 同一データの複数回インポートのいずれでも結果は等価になる。
 *
 * **呼び出し側の責務:** 削除は担わない。`deleteMonth` / `deletePrevYearMonth` は
 * 明示的な「月データの除去」操作であり、`loadMonth` の前処理として呼ぶべきではない
 * （二重削除になるだけで無意味）。詳細は `deletePolicy.ts` を参照。
 *
 * **スコープ:**
 * - `isPrevYear = false`（既定）: 全テーブルの (year, month) 行を削除して当年として投入
 * - `isPrevYear = true`: 前年スコープ（TABLES_WITH_PREV_YEAR_FLAG の is_prev_year=true 行と
 *   PREV_YEAR_INSERT_TABLES の (year-1, month) 行）を削除して前年データとして投入
 *
 * **失敗時:** INSERT 途中で例外が発生した場合、同じ削除を再実行してから例外を再送出する。
 * これにより partial な月が残存しない。
 *
 * 関連: `references/03-guides/data-load-idempotency-plan.md`
 */
export async function loadMonth(
  conn: AsyncDuckDBConnection,
  db: AsyncDuckDB,
  data: MonthlyData,
  year: number,
  month: number,
  isPrevYear = false,
): Promise<LoadResult> {
  const start = performance.now()
  const rowCounts = {} as Record<TableName, number>

  // 冪等性保証: INSERT 前に対象スコープを削除する
  // これにより、再ロードや部分失敗後の再試行で重複が発生しない
  await purgeLoadTarget(conn, year, month, isPrevYear)

  try {
    // ── classified_sales ──
    rowCounts.classified_sales = await insertClassifiedSales(
      conn,
      db,
      data.classifiedSales.records,
      isPrevYear,
    )

    // ── category_time_sales + time_slots ──
    const { ctsCount, tsCount } = await insertCategoryTimeSales(
      conn,
      db,
      data.categoryTimeSales.records,
      isPrevYear,
    )
    rowCounts.category_time_sales = ctsCount
    rowCounts.time_slots = tsCount

    // ── purchase ──
    rowCounts.purchase = await insertPurchase(conn, db, data.purchase, year, month)

    // ── special_sales (flowers + directProduce) ──
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

    // ── transfers (interStoreIn + interStoreOut) ──
    const inCount = await insertTransfers(conn, db, data.interStoreIn, year, month, 'in')
    const outCount = await insertTransfers(conn, db, data.interStoreOut, year, month, 'out')
    rowCounts.transfers = inCount + outCount

    // ── 当年のみのテーブル（前年ロード時はスキップ） ──
    if (!isPrevYear) {
      rowCounts.consumables = await insertCostInclusions(conn, db, data.consumables, year, month)
      rowCounts.department_kpi = await insertDepartmentKpi(
        conn,
        db,
        data.departmentKpi.records,
        year,
        month,
      )
      rowCounts.budget = await insertBudget(conn, db, data.budget, year, month)
      rowCounts.inventory_config = await insertInventoryConfig(conn, db, data.settings, year, month)
    } else {
      rowCounts.consumables = 0
      rowCounts.department_kpi = 0
      rowCounts.budget = 0
      rowCounts.inventory_config = 0
    }

    // app_settings は loadMonth ではなく loadAppSettings() で別途投入
    rowCounts.app_settings = 0
    // weather_hourly は外部 API キャッシュのため loadMonth では投入しない
    rowCounts.weather_hourly = 0
  } catch (err) {
    // INSERT失敗時は該当月のデータのみ削除して部分データの残存を防ぐ。
    console.error(`DuckDB loadMonth failed for ${year}-${month}:`, err)
    try {
      await purgeLoadTarget(conn, year, month, isPrevYear)
    } catch (deleteErr) {
      console.error('DuckDB cleanup after load failure also failed:', deleteErr)
    }
    throw err
  }

  return {
    rowCounts,
    durationMs: performance.now() - start,
  }
}
