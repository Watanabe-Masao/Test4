/**
 * CTS 時間帯系クエリ
 *
 * 時間帯別集約・時間帯×曜日マトリクス・カテゴリ×時間帯集約を提供する。
 * time_slots テーブルを主に使用するクエリ群。
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import { queryToObjects } from '../queryRunner'
import type { CtsFilterParams } from './categoryTimeSales'
import { tsWhereClause } from './categoryTimeSales'

// ── 時間帯別集約 ──

export interface HourlyAggregationRow {
  readonly hour: number
  readonly totalAmount: number
  readonly totalQuantity: number
}

/**
 * 時間帯別集約（aggregateHourly 相当）
 */
export async function queryHourlyAggregation(
  conn: AsyncDuckDBConnection,
  params: CtsFilterParams,
): Promise<readonly HourlyAggregationRow[]> {
  const where = tsWhereClause(params)
  const sql = `
    SELECT
      ts.hour,
      SUM(ts.amount) AS total_amount,
      SUM(ts.quantity) AS total_quantity
    FROM time_slots ts
    ${where}
    GROUP BY ts.hour
    ORDER BY ts.hour`
  return queryToObjects<HourlyAggregationRow>(conn, sql)
}

// ── 店舗別時間帯集約 ──

export interface StoreAggregationRow {
  readonly storeId: string
  readonly hour: number
  readonly amount: number
}

/**
 * 店舗別×時間帯集約（aggregateByStore 相当）
 */
export async function queryStoreAggregation(
  conn: AsyncDuckDBConnection,
  params: CtsFilterParams,
): Promise<readonly StoreAggregationRow[]> {
  const where = tsWhereClause(params)
  const sql = `
    SELECT
      ts.store_id,
      ts.hour,
      SUM(ts.amount) AS amount
    FROM time_slots ts
    ${where}
    GROUP BY ts.store_id, ts.hour
    ORDER BY ts.store_id, ts.hour`
  return queryToObjects<StoreAggregationRow>(conn, sql)
}

// ── 時間帯×曜日マトリクス ──

export interface HourDowMatrixRow {
  readonly hour: number
  readonly dow: number
  readonly amount: number
  readonly dayCount: number
}

/**
 * 時間帯×曜日マトリクス（aggregateHourDow 相当）
 */
export async function queryHourDowMatrix(
  conn: AsyncDuckDBConnection,
  params: CtsFilterParams,
): Promise<readonly HourDowMatrixRow[]> {
  const where = tsWhereClause(params)
  // dow は category_time_sales テーブルにあるが time_slots にはないので、
  // make_date で算出する
  const sql = `
    SELECT
      ts.hour,
      EXTRACT(dow FROM make_date(ts.year, ts.month, ts.day))::INTEGER AS dow,
      SUM(ts.amount) AS amount,
      COUNT(DISTINCT ts.date_key) AS day_count
    FROM time_slots ts
    ${where}
    GROUP BY ts.hour, dow
    ORDER BY ts.hour, dow`
  return queryToObjects<HourDowMatrixRow>(conn, sql)
}

// ── カテゴリ×時間帯集約 ──

export interface CategoryHourlyRow {
  readonly code: string
  readonly name: string
  readonly hour: number
  readonly amount: number
  readonly quantity: number
}

/**
 * カテゴリ別×時間帯集約
 *
 * 指定した階層レベルで時間帯別売上を集約する。
 * time_slots テーブルを使い、名前は category_time_sales から取得。
 */
export async function queryCategoryHourly(
  conn: AsyncDuckDBConnection,
  params: CtsFilterParams & { readonly level: 'department' | 'line' | 'klass' },
): Promise<readonly CategoryHourlyRow[]> {
  const where = tsWhereClause(params)

  let codeCol: string
  let nameCol: string

  switch (params.level) {
    case 'department':
      codeCol = 'ts.dept_code'
      nameCol = 'n.dept_name'
      break
    case 'line':
      codeCol = 'ts.line_code'
      nameCol = 'n.line_name'
      break
    case 'klass':
      codeCol = 'ts.klass_code'
      nameCol = 'n.klass_name'
      break
  }

  const sql = `
    WITH agg AS (
      SELECT
        ${codeCol} AS code,
        ts.hour,
        SUM(ts.amount) AS amount,
        SUM(ts.quantity) AS quantity
      FROM time_slots ts
      ${where}
      GROUP BY ${codeCol}, ts.hour
    ),
    names AS (
      SELECT DISTINCT ${codeCol.replace('ts.', '')} AS code_key,
        ${nameCol.replace('n.', '')} AS name_val
      FROM category_time_sales n
    )
    SELECT agg.code, names.name_val AS name, agg.hour, agg.amount, agg.quantity
    FROM agg
    LEFT JOIN names ON agg.code = names.code_key
    ORDER BY agg.amount DESC, agg.hour`
  return queryToObjects<CategoryHourlyRow>(conn, sql)
}
