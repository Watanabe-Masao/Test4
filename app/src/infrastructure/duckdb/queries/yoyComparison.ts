/**
 * 前年比較 (YoY) クエリモジュール
 *
 * 当年と前年のデータを JOIN で比較する。
 * store_day_summary VIEW と category_time_sales テーブルを使用。
 *
 * 自由日付範囲: 当年・前年それぞれ独立した date_key 範囲で指定。
 *
 * @responsibility R:unclassified
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import { z } from 'zod'
import { queryToObjects, storeIdFilter } from '../queryRunner'
import { validateDateKey } from '../queryParams'

// ── 結果型 + Zod スキーマ ──

export interface YoyDailyRow {
  readonly curDateKey: string | null
  readonly prevDateKey: string | null
  readonly storeId: string
  readonly curSales: number
  readonly prevSales: number | null
  readonly salesDiff: number
  readonly curCustomers: number
  readonly prevCustomers: number | null
}

export const YoyDailyRowSchema = z.object({
  curDateKey: z.string().nullable(),
  prevDateKey: z.string().nullable(),
  storeId: z.string(),
  curSales: z.number(),
  prevSales: z.number().nullable(),
  salesDiff: z.number(),
  curCustomers: z.number(),
  prevCustomers: z.number().nullable(),
})

export interface YoyCategoryRow {
  readonly code: string
  readonly name: string
  readonly curAmount: number
  readonly prevAmount: number | null
  readonly amountDiff: number
  readonly curQuantity: number
  readonly prevQuantity: number | null
}

export const YoyCategoryRowSchema = z.object({
  code: z.string(),
  name: z.string(),
  curAmount: z.number(),
  prevAmount: z.number().nullable(),
  amountDiff: z.number(),
  curQuantity: z.number(),
  prevQuantity: z.number().nullable(),
})

// ── クエリ関数 ──

/**
 * 日別前年比較
 *
 * 当年の各日と前年の対応する日を FULL OUTER JOIN で比較する。
 * 前年データは is_prev_year=TRUE でタグ付けされている前提。
 */
export async function queryYoyDailyComparison(
  conn: AsyncDuckDBConnection,
  params: {
    readonly curDateFrom: string
    readonly curDateTo: string
    readonly prevDateFrom: string
    readonly prevDateTo: string
    readonly storeIds?: readonly string[]
  },
): Promise<readonly YoyDailyRow[]> {
  const curDateFrom = validateDateKey(params.curDateFrom)
  const curDateTo = validateDateKey(params.curDateTo)
  const prevDateFrom = validateDateKey(params.prevDateFrom)
  const prevDateTo = validateDateKey(params.prevDateTo)

  // CTE 内では store_id にエイリアスなし
  const storeWhere = storeIdFilter(params.storeIds)
  const storeAndClause = storeWhere ? `AND ${storeWhere}` : ''

  const sql = `
    WITH current_data AS (
      SELECT
        date_key,
        store_id,
        month,
        day,
        SUM(sales) AS sales,
        SUM(customers) AS customers
      FROM store_day_summary
      WHERE is_prev_year = FALSE
        AND date_key BETWEEN '${curDateFrom}' AND '${curDateTo}'
        ${storeAndClause}
      GROUP BY date_key, store_id, month, day
    ),
    prev_data AS (
      SELECT
        date_key,
        store_id,
        month,
        day,
        SUM(sales) AS sales,
        SUM(customers) AS customers
      FROM store_day_summary
      WHERE is_prev_year = TRUE
        AND date_key BETWEEN '${prevDateFrom}' AND '${prevDateTo}'
        ${storeAndClause}
      GROUP BY date_key, store_id, month, day
    )
    SELECT
      c.date_key AS cur_date_key,
      p.date_key AS prev_date_key,
      COALESCE(c.store_id, p.store_id) AS store_id,
      COALESCE(c.sales, 0) AS cur_sales,
      p.sales AS prev_sales,
      COALESCE(c.sales, 0) - COALESCE(p.sales, 0) AS sales_diff,
      COALESCE(c.customers, 0) AS cur_customers,
      p.customers AS prev_customers
    FROM current_data c
    FULL OUTER JOIN prev_data p
      ON c.store_id = p.store_id AND c.month = p.month AND c.day = p.day
    ORDER BY COALESCE(c.store_id, p.store_id), COALESCE(c.date_key, p.date_key)`
  return queryToObjects<YoyDailyRow>(conn, sql, YoyDailyRowSchema)
}

/**
 * カテゴリ別前年比較
 *
 * 当年/前年の category_time_sales を階層レベルで GROUP BY し JOIN。
 */
export async function queryYoyCategoryComparison(
  conn: AsyncDuckDBConnection,
  params: {
    readonly curDateFrom: string
    readonly curDateTo: string
    readonly prevDateFrom: string
    readonly prevDateTo: string
    readonly storeIds?: readonly string[]
    readonly level: 'department' | 'line' | 'klass'
  },
): Promise<readonly YoyCategoryRow[]> {
  const curDateFrom = validateDateKey(params.curDateFrom)
  const curDateTo = validateDateKey(params.curDateTo)
  const prevDateFrom = validateDateKey(params.prevDateFrom)
  const prevDateTo = validateDateKey(params.prevDateTo)

  let codeCol: string
  let nameCol: string

  switch (params.level) {
    case 'department':
      codeCol = 'dept_code'
      nameCol = 'dept_name'
      break
    case 'line':
      codeCol = 'line_code'
      nameCol = 'line_name'
      break
    case 'klass':
      codeCol = 'klass_code'
      nameCol = 'klass_name'
      break
  }

  const storeCondition = storeIdFilter(params.storeIds) ?? '1=1'

  const sql = `
    WITH current_agg AS (
      SELECT
        ${codeCol} AS code,
        ${nameCol} AS name,
        SUM(total_amount) AS amount,
        SUM(total_quantity) AS quantity
      FROM category_time_sales
      WHERE is_prev_year = FALSE
        AND date_key BETWEEN '${curDateFrom}' AND '${curDateTo}'
        AND ${storeCondition}
      GROUP BY ${codeCol}, ${nameCol}
    ),
    prev_agg AS (
      SELECT
        ${codeCol} AS code,
        SUM(total_amount) AS amount,
        SUM(total_quantity) AS quantity
      FROM category_time_sales
      WHERE is_prev_year = TRUE
        AND date_key BETWEEN '${prevDateFrom}' AND '${prevDateTo}'
        AND ${storeCondition}
      GROUP BY ${codeCol}
    )
    SELECT
      COALESCE(c.code, p.code) AS code,
      COALESCE(c.name, '') AS name,
      COALESCE(c.amount, 0) AS cur_amount,
      p.amount AS prev_amount,
      COALESCE(c.amount, 0) - COALESCE(p.amount, 0) AS amount_diff,
      COALESCE(c.quantity, 0) AS cur_quantity,
      p.quantity AS prev_quantity
    FROM current_agg c
    FULL OUTER JOIN prev_agg p ON c.code = p.code
    ORDER BY COALESCE(c.amount, 0) DESC`
  return queryToObjects<YoyCategoryRow>(conn, sql, YoyCategoryRowSchema)
}
