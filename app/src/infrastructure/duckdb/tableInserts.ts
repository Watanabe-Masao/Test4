/**
 * DuckDB テーブル別 INSERT 関数
 *
 * Domain モデルから DuckDB テーブル行への変換と投入を行う。
 * dataLoader.ts のオーケストレーション関数から呼び出される。
 *
 * 共通のバルクINSERT基盤は dataConversions.ts に定義されている。
 */
import type { AsyncDuckDB, AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type {
  ClassifiedSalesRecord,
  CategoryTimeSalesRecord,
  PurchaseData,
  SpecialSalesData,
  TransferData,
  CostInclusionData,
  DepartmentKpiRecord,
  BudgetData,
  InventoryConfig,
  HourlyWeatherRecord,
} from '@/domain/models/record'
import { toDateKeyFromParts } from '@/domain/models/calendar'
import { bulkInsert } from './dataConversions'

/** ClassifiedSalesRecord[] → classified_sales テーブル */
export async function insertClassifiedSales(
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
export async function insertCategoryTimeSales(
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
export async function insertPurchase(
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
export async function insertSpecialSales(
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
export async function insertTransfers(
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
export async function insertCostInclusions(
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
export async function insertDepartmentKpi(
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

/** BudgetData Map → budget テーブル */
export async function insertBudget(
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
export async function insertInventoryConfig(
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

/**
 * HourlyWeatherRecord[] → weather_hourly テーブル
 *
 * 店舗IDごとの天気レコードをバルクINSERTする。
 * dateKey (YYYY-MM-DD) から year/month/day を分解して投入する。
 */
export async function insertWeatherHourly(
  conn: AsyncDuckDBConnection,
  db: AsyncDuckDB,
  records: readonly HourlyWeatherRecord[],
  storeId: string,
): Promise<number> {
  if (records.length === 0) return 0

  const rows = records.map((rec) => {
    const [y, m, d] = rec.dateKey.split('-').map(Number)
    return {
      date_key: rec.dateKey,
      year: y,
      month: m,
      day: d,
      hour: rec.hour,
      store_id: storeId,
      temperature: rec.temperature,
      humidity: rec.humidity,
      precipitation: rec.precipitation,
      wind_speed: rec.windSpeed,
      weather_code: rec.weatherCode,
      sunshine_duration: rec.sunshineDuration,
    }
  })

  return bulkInsert(conn, db, 'weather_hourly', rows)
}
