/**
 * DuckDB データローダー（月次データ投入）
 *
 * ImportedData の各データソースを DuckDB テーブルに投入する。
 * StoreDayIndex系は year/month を外部パラメータで受け取り付与する。
 *
 * INSERT戦略: db.registerFileText() + read_json_auto() によるバルクロード。
 * 数万行規模のデータで prepared statement より高速。
 *
 * 削除ポリシー（resetTables, deleteMonth, deletePrevYearMonth）は
 * deletePolicy.ts に分離されている。
 */
import type { AsyncDuckDB, AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { ImportedData } from '@/domain/models/storeTypes'
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
import { deleteMonth } from './deletePolicy'

// ── 後方互換 re-export（deletePolicy.ts から） ──
export { resetTables, deleteMonth, deletePrevYearMonth } from './deletePolicy'

export interface LoadResult {
  readonly rowCounts: Readonly<Record<TableName, number>>
  readonly durationMs: number
}

// ── 内部ヘルパー ──

/**
 * 前年データの年月をレコードの先頭行から取得する。
 * レコードが空の場合は null を返す（前年データなし）。
 */
function extractPrevYearPeriod(
  records: readonly { year: number; month: number }[],
): { year: number; month: number } | null {
  return records.length > 0 ? { year: records[0].year, month: records[0].month } : null
}

// ── 公開API ──

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
    // ── classified_sales ──
    rowCounts.classified_sales = await insertClassifiedSales(
      conn,
      db,
      data.classifiedSales.records,
      false,
    )
    // 前年追記
    rowCounts.classified_sales += await insertClassifiedSales(
      conn,
      db,
      data.prevYearClassifiedSales.records,
      true,
    )

    // ── category_time_sales + time_slots ──
    const { ctsCount, tsCount } = await insertCategoryTimeSales(
      conn,
      db,
      data.categoryTimeSales.records,
      false,
    )
    rowCounts.category_time_sales = ctsCount
    rowCounts.time_slots = tsCount
    // 前年追記
    const prevCts = await insertCategoryTimeSales(
      conn,
      db,
      data.prevYearCategoryTimeSales.records,
      true,
    )
    rowCounts.category_time_sales += prevCts.ctsCount
    rowCounts.time_slots += prevCts.tsCount

    // ── purchase ──
    rowCounts.purchase = await insertPurchase(conn, db, data.purchase, year, month)
    // 前年追記（is_prev_year 列なし — レコードの year/month を使用）
    const prevPurchase = extractPrevYearPeriod(data.prevYearPurchase.records)
    if (prevPurchase) {
      rowCounts.purchase += await insertPurchase(
        conn,
        db,
        data.prevYearPurchase,
        prevPurchase.year,
        prevPurchase.month,
      )
    }

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
    // 前年 directProduce 追記
    const prevDp = extractPrevYearPeriod(data.prevYearDirectProduce.records)
    if (prevDp) {
      rowCounts.special_sales += await insertSpecialSales(
        conn,
        db,
        data.prevYearDirectProduce,
        prevDp.year,
        prevDp.month,
        'directProduce',
      )
    }
    // prevYearFlowers は既に special_sales にロード済み（comparison module 経由）

    // ── transfers (interStoreIn + interStoreOut) ──
    const inCount = await insertTransfers(conn, db, data.interStoreIn, year, month, 'in')
    const outCount = await insertTransfers(conn, db, data.interStoreOut, year, month, 'out')
    rowCounts.transfers = inCount + outCount
    // 前年追記
    const prevIn = extractPrevYearPeriod(data.prevYearInterStoreIn.records)
    if (prevIn) {
      rowCounts.transfers += await insertTransfers(
        conn,
        db,
        data.prevYearInterStoreIn,
        prevIn.year,
        prevIn.month,
        'in',
      )
    }
    const prevOut = extractPrevYearPeriod(data.prevYearInterStoreOut.records)
    if (prevOut) {
      rowCounts.transfers += await insertTransfers(
        conn,
        db,
        data.prevYearInterStoreOut,
        prevOut.year,
        prevOut.month,
        'out',
      )
    }

    // ── 当年のみのテーブル ──
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

    // app_settings は loadMonth ではなく loadAppSettings() で別途投入
    rowCounts.app_settings = 0
    // weather_hourly は外部 API キャッシュのため loadMonth では投入しない
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
