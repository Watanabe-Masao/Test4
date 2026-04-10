/**
 * DuckDB データローダー（月次データ投入）
 *
 * MonthlyData の各データソースを DuckDB テーブルに投入する。
 * StoreDayIndex系は year/month を外部パラメータで受け取り付与する。
 *
 * INSERT戦略: db.registerFileText() + read_json_auto() によるバルクロード。
 * 数万行規模のデータで prepared statement より高速。
 *
 * 削除ポリシー（resetTables, deleteMonth, deletePrevYearMonth）は
 * deletePolicy.ts に分離されている。
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
import { deleteMonth, deletePrevYearMonth } from './deletePolicy'

// ── 後方互換 re-export（deletePolicy.ts から） ──
export { resetTables, deleteMonth, deletePrevYearMonth } from './deletePolicy'

export interface LoadResult {
  readonly rowCounts: Readonly<Record<TableName, number>>
  readonly durationMs: number
}

// ── 公開API ──

/**
 * 1ヶ月分の MonthlyData を DuckDB に投入する。
 * 追記モード — テーブルが存在する前提で INSERT のみ行う。
 * 初回呼び出し前に resetTables() を呼ぶこと。
 *
 * isPrevYear=true の場合、classified_sales / category_time_sales に
 * is_prev_year フラグを付与して投入する。
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
      if (isPrevYear) {
        await deletePrevYearMonth(conn, year, month)
      } else {
        await deleteMonth(conn, year, month)
      }
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
