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
import type {
  ImportedData,
  ClassifiedSalesRecord,
  CategoryTimeSalesRecord,
  PurchaseData,
  SpecialSalesData,
  TransferData,
  CostInclusionData,
  DepartmentKpiRecord,
  BudgetData,
  InventoryConfig,
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
  // DuckDB は DROP TABLE IF EXISTS でも名前が VIEW として存在するとエラーになるため、
  // VIEW → TABLE の順で DROP する（マテリアライズ前は VIEW、後は TABLE）。
  await conn.query('DROP VIEW IF EXISTS store_day_summary')
  await conn.query('DROP TABLE IF EXISTS store_day_summary')
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
 * 指定年月のデータを全テーブルから削除する。
 * 増分ロード時に使用: deleteMonth → loadMonth で特定月のみ差し替え。
 */
/** app_settings は year/month を持たないため deleteMonth 対象外 */
const TABLES_WITH_YEAR_MONTH = TABLE_NAMES.filter((n) => n !== 'app_settings')

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
  } catch (err) {
    // INSERT失敗時はテーブルをリセットして部分データの残存を防ぐ
    console.error(`DuckDB loadMonth failed for ${year}-${month}:`, err)
    try {
      await resetTables(conn)
    } catch (resetErr) {
      console.error('DuckDB resetTables after load failure also failed:', resetErr)
    }
    throw err
  }

  return {
    rowCounts,
    durationMs: performance.now() - start,
  }
}

// ── 内部変換・INSERT関数 ──

/**
 * テーブルごとのカラム型定義
 *
 * read_json_auto はサンプリング不足で大量データ（数万行超）の型推論に失敗する。
 * columns パラメータで型を明示し、確実にロードする。
 */
const TABLE_COLUMNS: Record<string, Record<string, string>> = {
  classified_sales: {
    year: 'INTEGER',
    month: 'INTEGER',
    day: 'INTEGER',
    date_key: 'VARCHAR',
    store_id: 'VARCHAR',
    store_name: 'VARCHAR',
    group_name: 'VARCHAR',
    department_name: 'VARCHAR',
    line_name: 'VARCHAR',
    class_name: 'VARCHAR',
    sales_amount: 'DOUBLE',
    discount_71: 'DOUBLE',
    discount_72: 'DOUBLE',
    discount_73: 'DOUBLE',
    discount_74: 'DOUBLE',
    is_prev_year: 'BOOLEAN',
  },
  category_time_sales: {
    year: 'INTEGER',
    month: 'INTEGER',
    day: 'INTEGER',
    date_key: 'VARCHAR',
    store_id: 'VARCHAR',
    dept_code: 'VARCHAR',
    dept_name: 'VARCHAR',
    line_code: 'VARCHAR',
    line_name: 'VARCHAR',
    klass_code: 'VARCHAR',
    klass_name: 'VARCHAR',
    total_quantity: 'DOUBLE',
    total_amount: 'DOUBLE',
    dow: 'INTEGER',
    is_prev_year: 'BOOLEAN',
  },
  time_slots: {
    year: 'INTEGER',
    month: 'INTEGER',
    day: 'INTEGER',
    date_key: 'VARCHAR',
    store_id: 'VARCHAR',
    dept_code: 'VARCHAR',
    line_code: 'VARCHAR',
    klass_code: 'VARCHAR',
    hour: 'INTEGER',
    quantity: 'DOUBLE',
    amount: 'DOUBLE',
    is_prev_year: 'BOOLEAN',
  },
  purchase: {
    year: 'INTEGER',
    month: 'INTEGER',
    store_id: 'VARCHAR',
    day: 'INTEGER',
    date_key: 'VARCHAR',
    supplier_code: 'VARCHAR',
    supplier_name: 'VARCHAR',
    cost: 'DOUBLE',
    price: 'DOUBLE',
  },
  special_sales: {
    year: 'INTEGER',
    month: 'INTEGER',
    store_id: 'VARCHAR',
    day: 'INTEGER',
    date_key: 'VARCHAR',
    type: 'VARCHAR',
    cost: 'DOUBLE',
    price: 'DOUBLE',
    customers: 'INTEGER',
  },
  transfers: {
    year: 'INTEGER',
    month: 'INTEGER',
    store_id: 'VARCHAR',
    day: 'INTEGER',
    date_key: 'VARCHAR',
    direction: 'VARCHAR',
    cost: 'DOUBLE',
    price: 'DOUBLE',
  },
  consumables: {
    year: 'INTEGER',
    month: 'INTEGER',
    store_id: 'VARCHAR',
    day: 'INTEGER',
    date_key: 'VARCHAR',
    cost: 'DOUBLE',
  },
  department_kpi: {
    year: 'INTEGER',
    month: 'INTEGER',
    dept_code: 'VARCHAR',
    dept_name: 'VARCHAR',
    gp_rate_budget: 'DOUBLE',
    gp_rate_actual: 'DOUBLE',
    gp_rate_variance: 'DOUBLE',
    markup_rate: 'DOUBLE',
    discount_rate: 'DOUBLE',
    sales_budget: 'DOUBLE',
    sales_actual: 'DOUBLE',
    sales_variance: 'DOUBLE',
    sales_achievement: 'DOUBLE',
    opening_inventory: 'DOUBLE',
    closing_inventory: 'DOUBLE',
    gp_rate_landing: 'DOUBLE',
    sales_landing: 'DOUBLE',
  },
  budget: {
    year: 'INTEGER',
    month: 'INTEGER',
    store_id: 'VARCHAR',
    day: 'INTEGER',
    date_key: 'VARCHAR',
    amount: 'DOUBLE',
  },
  inventory_config: {
    year: 'INTEGER',
    month: 'INTEGER',
    store_id: 'VARCHAR',
    opening_inventory: 'DOUBLE',
    closing_inventory: 'DOUBLE',
    gross_profit_budget: 'DOUBLE',
  },
}

/**
 * columns パラメータ用の DuckDB struct リテラルを生成する。
 * 例: {'year': 'INTEGER', 'month': 'INTEGER', ...}
 */
function buildColumnsParam(tableName: string): string {
  const cols = TABLE_COLUMNS[tableName]
  if (!cols) return ''
  const entries = Object.entries(cols)
    .map(([k, v]) => `'${k}': '${v}'`)
    .join(', ')
  return `{${entries}}`
}

/**
 * バルクINSERT: JS配列 → JSON → registerFileText → read_json (明示的カラム型)
 *
 * read_json_auto ではなく read_json + columns を使用する。
 * read_json_auto のサンプリングベース型推論は大量データ（数万行超）で
 * 型不一致エラーを起こすため。
 */
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
    const columnsParam = buildColumnsParam(tableName)
    if (columnsParam) {
      await conn.query(
        `INSERT INTO ${tableName} SELECT * FROM read_json('${fileName}', columns=${columnsParam}, format='array')`,
      )
    } else {
      // フォールバック（未定義テーブル用）
      await conn.query(`INSERT INTO ${tableName} SELECT * FROM read_json_auto('${fileName}')`)
    }
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

  for (const entry of data.records) {
    const dateKey = toDateKeyFromParts(year, month, entry.day)
    for (const [supplierCode, supplier] of Object.entries(entry.suppliers)) {
      rows.push({
        year,
        month,
        store_id: entry.storeId,
        day: entry.day,
        date_key: dateKey,
        supplier_code: supplierCode,
        supplier_name: supplier.name,
        cost: supplier.cost,
        price: supplier.price,
      })
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

  for (const entry of data.records) {
    rows.push({
      year,
      month,
      store_id: entry.storeId,
      day: entry.day,
      date_key: toDateKeyFromParts(year, month, entry.day),
      type,
      cost: entry.cost,
      price: entry.price,
      customers: entry.customers ?? 0,
    })
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

  for (const entry of data.records) {
    const dateKey = toDateKeyFromParts(year, month, entry.day)

    const storeRecords = inOrOut === 'in' ? entry.interStoreIn : entry.interStoreOut
    const deptRecords = inOrOut === 'in' ? entry.interDepartmentIn : entry.interDepartmentOut

    const storeDirection = inOrOut === 'in' ? 'interStoreIn' : 'interStoreOut'
    const deptDirection = inOrOut === 'in' ? 'interDeptIn' : 'interDeptOut'

    for (const r of storeRecords) {
      rows.push({
        year,
        month,
        store_id: entry.storeId,
        day: entry.day,
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
        store_id: entry.storeId,
        day: entry.day,
        date_key: dateKey,
        direction: deptDirection,
        cost: r.cost,
        price: r.price,
      })
    }
  }

  return bulkInsert(conn, db, 'transfers', rows)
}

/** CostInclusionData → consumables テーブル */
async function insertCostInclusions(
  conn: AsyncDuckDBConnection,
  db: AsyncDuckDB,
  data: CostInclusionData,
  year: number,
  month: number,
): Promise<number> {
  const rows: Record<string, unknown>[] = []

  for (const entry of data.records) {
    rows.push({
      year,
      month,
      store_id: entry.storeId,
      day: entry.day,
      date_key: toDateKeyFromParts(year, month, entry.day),
      cost: entry.cost,
    })
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

/** BudgetData Map → budget テーブル */
async function insertBudget(
  conn: AsyncDuckDBConnection,
  db: AsyncDuckDB,
  budgetMap: ReadonlyMap<string, BudgetData>,
  year: number,
  month: number,
): Promise<number> {
  const rows: Record<string, unknown>[] = []

  for (const [storeId, budgetData] of budgetMap) {
    for (const [day, amount] of budgetData.daily) {
      rows.push({
        year,
        month,
        store_id: storeId,
        day,
        date_key: toDateKeyFromParts(year, month, day),
        amount,
      })
    }
  }

  return bulkInsert(conn, db, 'budget', rows)
}

/** InventoryConfig Map → inventory_config テーブル */
async function insertInventoryConfig(
  conn: AsyncDuckDBConnection,
  db: AsyncDuckDB,
  configMap: ReadonlyMap<string, InventoryConfig>,
  year: number,
  month: number,
): Promise<number> {
  const rows: Record<string, unknown>[] = []

  for (const [storeId, config] of configMap) {
    rows.push({
      year,
      month,
      store_id: storeId,
      opening_inventory: config.openingInventory,
      closing_inventory: config.closingInventory,
      gross_profit_budget: config.grossProfitBudget ?? 0,
    })
  }

  return bulkInsert(conn, db, 'inventory_config', rows)
}
