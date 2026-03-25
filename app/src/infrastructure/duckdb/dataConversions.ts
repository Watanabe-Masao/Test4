/**
 * DuckDB データ変換基盤
 *
 * テーブルごとのカラム型定義とバルクINSERTの共通基盤。
 * テーブル別の INSERT 関数は tableInserts.ts に分離されている。
 */
import type { AsyncDuckDB, AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'

// ── 後方互換 re-export（tableInserts.ts から） ──
export {
  insertClassifiedSales,
  insertCategoryTimeSales,
  insertPurchase,
  insertSpecialSales,
  insertTransfers,
  insertCostInclusions,
  insertDepartmentKpi,
  insertBudget,
  insertInventoryConfig,
  insertWeatherHourly,
} from './tableInserts'

// ── カラム型定義 ──

/**
 * テーブルごとのカラム型定義
 *
 * read_json_auto はサンプリング不足で大量データ（数万行超）の型推論に失敗する。
 * columns パラメータで型を明示し、確実にロードする。
 */
export const TABLE_COLUMNS: Record<string, Record<string, string>> = {
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
  weather_hourly: {
    date_key: 'VARCHAR',
    year: 'INTEGER',
    month: 'INTEGER',
    day: 'INTEGER',
    hour: 'INTEGER',
    store_id: 'VARCHAR',
    temperature: 'DOUBLE',
    humidity: 'DOUBLE',
    precipitation: 'DOUBLE',
    wind_speed: 'DOUBLE',
    weather_code: 'INTEGER',
    sunshine_duration: 'DOUBLE',
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

// ── バルクINSERT ──

/**
 * バルクINSERT: JS配列 → JSON → registerFileText → read_json (明示的カラム型)
 *
 * read_json_auto ではなく read_json + columns を使用する。
 * read_json_auto のサンプリングベース型推論は大量データ（数万行超）で
 * 型不一致エラーを起こすため。
 */
export async function bulkInsert(
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
