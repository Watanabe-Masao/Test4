/**
 * DuckDB データローダー
 *
 * ImportedData の各データソースを DuckDB テーブルに投入する。
 * StoreDayRecord系は year/month を外部パラメータで受け取り付与する。
 *
 * INSERT戦略: db.registerFileText() + read_json_auto() によるバルクロード。
 * 数万行規模のデータで prepared statement より高速。
 */
import type { AsyncDuckDB, AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type {
  ImportedData,
  ClassifiedSalesRecord,
  CategoryTimeSalesRecord,
  PurchaseData,
  SpecialSalesData,
  TransferData,
  ConsumableData,
  DepartmentKpiRecord,
} from '@/domain/models'
import { toDateKeyFromParts } from '@/domain/models'
import { ALL_TABLE_DDLS, STORE_DAY_SUMMARY_VIEW_DDL, TABLE_NAMES } from './schemas'
import type { TableName } from './schemas'

export interface LoadResult {
  readonly rowCounts: Readonly<Record<TableName, number>>
  readonly durationMs: number
}

// ── 公開API ──

/**
 * 全テーブルを DROP + CREATE し、VIEW を再作成する。
 */
export async function resetTables(conn: AsyncDuckDBConnection): Promise<void> {
  // DROP all tables (including materialized summary if exists)
  await conn.query('DROP VIEW IF EXISTS store_day_summary')
  await conn.query('DROP TABLE IF EXISTS store_day_summary_mat')
  for (const name of TABLE_NAMES) {
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

  // purchase
  rowCounts.purchase = await insertPurchase(conn, db, data.purchase, year, month)

  // special_sales (flowers + directProduce)
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

  // transfers (interStoreIn + interStoreOut)
  const inCount = await insertTransfers(conn, db, data.interStoreIn, year, month, 'in')
  const outCount = await insertTransfers(conn, db, data.interStoreOut, year, month, 'out')
  rowCounts.transfers = inCount + outCount

  // consumables
  rowCounts.consumables = await insertConsumables(conn, db, data.consumables, year, month)

  // department_kpi
  rowCounts.department_kpi = await insertDepartmentKpi(
    conn,
    db,
    data.departmentKpi.records,
    year,
    month,
  )

  return {
    rowCounts,
    durationMs: performance.now() - start,
  }
}

// ── 内部変換・INSERT関数 ──

/** バルクINSERT: JS配列 → JSON → registerFileText → read_json_auto */
async function bulkInsert(
  conn: AsyncDuckDBConnection,
  db: AsyncDuckDB,
  tableName: string,
  rows: readonly Record<string, unknown>[],
): Promise<number> {
  if (rows.length === 0) return 0

  const fileName = `${tableName}_${Date.now()}.json`
  const json = JSON.stringify(rows)

  await db.registerFileText(fileName, json)
  try {
    await conn.query(`INSERT INTO ${tableName} SELECT * FROM read_json_auto('${fileName}')`)
  } finally {
    await db.dropFile(fileName)
  }

  return rows.length
}

/** ClassifiedSalesRecord[] → classified_sales テーブル */
async function insertClassifiedSales(
  conn: AsyncDuckDBConnection,
  db: AsyncDuckDB,
  records: readonly ClassifiedSalesRecord[],
  isPrevYear: boolean,
): Promise<number> {
  if (records.length === 0) return 0

  const rows = records.map((rec) => ({
    year: rec.year,
    month: rec.month,
    day: rec.day,
    date_key: toDateKeyFromParts(rec.year, rec.month, rec.day),
    store_id: rec.storeId,
    store_name: rec.storeName,
    group_name: rec.groupName,
    department_name: rec.departmentName,
    line_name: rec.lineName,
    class_name: rec.className,
    sales_amount: rec.salesAmount,
    discount_71: rec.discount71,
    discount_72: rec.discount72,
    discount_73: rec.discount73,
    discount_74: rec.discount74,
    is_prev_year: isPrevYear,
  }))

  return bulkInsert(conn, db, 'classified_sales', rows)
}

/** CategoryTimeSalesRecord[] → category_time_sales + time_slots テーブル */
async function insertCategoryTimeSales(
  conn: AsyncDuckDBConnection,
  db: AsyncDuckDB,
  records: readonly CategoryTimeSalesRecord[],
  isPrevYear: boolean,
): Promise<{ ctsCount: number; tsCount: number }> {
  if (records.length === 0) return { ctsCount: 0, tsCount: 0 }

  const ctsRows: Record<string, unknown>[] = []
  const tsRows: Record<string, unknown>[] = []

  for (const rec of records) {
    const dateKey = toDateKeyFromParts(rec.year, rec.month, rec.day)
    const dow = new Date(rec.year, rec.month - 1, rec.day).getDay()

    ctsRows.push({
      year: rec.year,
      month: rec.month,
      day: rec.day,
      date_key: dateKey,
      store_id: rec.storeId,
      dept_code: rec.department.code,
      dept_name: rec.department.name,
      line_code: rec.line.code,
      line_name: rec.line.name,
      klass_code: rec.klass.code,
      klass_name: rec.klass.name,
      total_quantity: rec.totalQuantity,
      total_amount: rec.totalAmount,
      dow,
      is_prev_year: isPrevYear,
    })

    for (const slot of rec.timeSlots) {
      tsRows.push({
        year: rec.year,
        month: rec.month,
        day: rec.day,
        date_key: dateKey,
        store_id: rec.storeId,
        dept_code: rec.department.code,
        line_code: rec.line.code,
        klass_code: rec.klass.code,
        hour: slot.hour,
        quantity: slot.quantity,
        amount: slot.amount,
        is_prev_year: isPrevYear,
      })
    }
  }

  const ctsCount = await bulkInsert(conn, db, 'category_time_sales', ctsRows)
  const tsCount = await bulkInsert(conn, db, 'time_slots', tsRows)
  return { ctsCount, tsCount }
}

/** PurchaseData → purchase テーブル */
async function insertPurchase(
  conn: AsyncDuckDBConnection,
  db: AsyncDuckDB,
  data: PurchaseData,
  year: number,
  month: number,
): Promise<number> {
  const rows: Record<string, unknown>[] = []

  for (const [storeId, days] of Object.entries(data)) {
    for (const [dayStr, entry] of Object.entries(days)) {
      const day = Number(dayStr)
      const dateKey = toDateKeyFromParts(year, month, day)
      for (const [supplierCode, supplier] of Object.entries(entry.suppliers)) {
        rows.push({
          year,
          month,
          store_id: storeId,
          day,
          date_key: dateKey,
          supplier_code: supplierCode,
          supplier_name: supplier.name,
          cost: supplier.cost,
          price: supplier.price,
        })
      }
    }
  }

  return bulkInsert(conn, db, 'purchase', rows)
}

/** SpecialSalesData → special_sales テーブル */
async function insertSpecialSales(
  conn: AsyncDuckDBConnection,
  db: AsyncDuckDB,
  data: SpecialSalesData,
  year: number,
  month: number,
  type: 'flowers' | 'directProduce',
): Promise<number> {
  const rows: Record<string, unknown>[] = []

  for (const [storeId, days] of Object.entries(data)) {
    for (const [dayStr, entry] of Object.entries(days)) {
      const day = Number(dayStr)
      rows.push({
        year,
        month,
        store_id: storeId,
        day,
        date_key: toDateKeyFromParts(year, month, day),
        type,
        cost: entry.cost,
        price: entry.price,
        customers: entry.customers ?? 0,
      })
    }
  }

  return bulkInsert(conn, db, 'special_sales', rows)
}

/** TransferData → transfers テーブル */
async function insertTransfers(
  conn: AsyncDuckDBConnection,
  db: AsyncDuckDB,
  data: TransferData,
  year: number,
  month: number,
  inOrOut: 'in' | 'out',
): Promise<number> {
  const rows: Record<string, unknown>[] = []

  for (const [storeId, days] of Object.entries(data)) {
    for (const [dayStr, entry] of Object.entries(days)) {
      const day = Number(dayStr)
      const dateKey = toDateKeyFromParts(year, month, day)

      const storeRecords = inOrOut === 'in' ? entry.interStoreIn : entry.interStoreOut
      const deptRecords = inOrOut === 'in' ? entry.interDepartmentIn : entry.interDepartmentOut

      const storeDirection = inOrOut === 'in' ? 'interStoreIn' : 'interStoreOut'
      const deptDirection = inOrOut === 'in' ? 'interDeptIn' : 'interDeptOut'

      for (const r of storeRecords) {
        rows.push({
          year,
          month,
          store_id: storeId,
          day,
          date_key: dateKey,
          direction: storeDirection,
          cost: r.cost,
          price: r.price,
        })
      }
      for (const r of deptRecords) {
        rows.push({
          year,
          month,
          store_id: storeId,
          day,
          date_key: dateKey,
          direction: deptDirection,
          cost: r.cost,
          price: r.price,
        })
      }
    }
  }

  return bulkInsert(conn, db, 'transfers', rows)
}

/** ConsumableData → consumables テーブル */
async function insertConsumables(
  conn: AsyncDuckDBConnection,
  db: AsyncDuckDB,
  data: ConsumableData,
  year: number,
  month: number,
): Promise<number> {
  const rows: Record<string, unknown>[] = []

  for (const [storeId, days] of Object.entries(data)) {
    for (const [dayStr, entry] of Object.entries(days)) {
      const day = Number(dayStr)
      rows.push({
        year,
        month,
        store_id: storeId,
        day,
        date_key: toDateKeyFromParts(year, month, day),
        cost: entry.cost,
      })
    }
  }

  return bulkInsert(conn, db, 'consumables', rows)
}

/** DepartmentKpiRecord[] → department_kpi テーブル */
async function insertDepartmentKpi(
  conn: AsyncDuckDBConnection,
  db: AsyncDuckDB,
  records: readonly DepartmentKpiRecord[],
  year: number,
  month: number,
): Promise<number> {
  if (records.length === 0) return 0

  const rows = records.map((rec) => ({
    year,
    month,
    dept_code: rec.deptCode,
    dept_name: rec.deptName,
    gp_rate_budget: rec.gpRateBudget,
    gp_rate_actual: rec.gpRateActual,
    gp_rate_variance: rec.gpRateVariance,
    markup_rate: rec.markupRate,
    discount_rate: rec.discountRate,
    sales_budget: rec.salesBudget,
    sales_actual: rec.salesActual,
    sales_variance: rec.salesVariance,
    sales_achievement: rec.salesAchievement,
    opening_inventory: rec.openingInventory,
    closing_inventory: rec.closingInventory,
    gp_rate_landing: rec.gpRateLanding,
    sales_landing: rec.salesLanding,
  }))

  return bulkInsert(conn, db, 'department_kpi', rows)
}
