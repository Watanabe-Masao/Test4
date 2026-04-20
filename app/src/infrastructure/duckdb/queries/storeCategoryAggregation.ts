/**
 * storeCategoryAggregation — 店舗×カテゴリの集約クエリ
 *
 * category_time_sales から店舗×部門/ライン/クラスの売上・点数を集約。
 * store_day_summary から店舗別客数を取得し、店舗別カテゴリPI値の算出に使う。
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import { z } from 'zod'
import { queryToObjects, buildTypedWhere } from '../queryRunner'
import type { WhereCondition } from '../queryRunner'

export interface StoreCategoryRow {
  readonly storeId: string
  readonly code: string
  readonly name: string
  readonly amount: number
  readonly quantity: number
}

export const StoreCategoryRowSchema = z.object({
  storeId: z.string(),
  code: z.string(),
  name: z.string(),
  amount: z.number(),
  quantity: z.number(),
})

export interface StoreCustomerRow {
  readonly storeId: string
  readonly totalCustomers: number
}

export const StoreCustomerRowSchema = z.object({
  storeId: z.string(),
  totalCustomers: z.number(),
})

interface StoreCategoryParams {
  readonly dateFrom: string
  readonly dateTo: string
  readonly storeIds?: readonly string[]
  readonly level: 'department' | 'line' | 'klass'
  readonly isPrevYear?: boolean
}

function levelColumns(level: 'department' | 'line' | 'klass') {
  switch (level) {
    case 'department':
      return { code: 'dept_code', name: 'dept_name' }
    case 'line':
      return { code: 'line_code', name: 'line_name' }
    case 'klass':
      return { code: 'klass_code', name: 'klass_name' }
  }
}

/** 店舗×カテゴリ別の売上・点数集約 */
export async function queryStoreCategoryAggregation(
  conn: AsyncDuckDBConnection,
  params: StoreCategoryParams,
): Promise<readonly StoreCategoryRow[]> {
  const col = levelColumns(params.level)
  const conditions: WhereCondition[] = [
    { type: 'dateRange', column: 'date_key', from: params.dateFrom, to: params.dateTo },
    { type: 'boolean', column: 'is_prev_year', value: params.isPrevYear ?? false },
    { type: 'storeIds', storeIds: params.storeIds },
  ]
  const where = buildTypedWhere(conditions)
  const sql = `
    SELECT
      store_id,
      ${col.code} AS code,
      ${col.name} AS name,
      COALESCE(SUM(total_amount), 0) AS amount,
      COALESCE(SUM(total_quantity), 0) AS quantity
    FROM category_time_sales
    ${where}
    GROUP BY store_id, ${col.code}, ${col.name}
    ORDER BY store_id, amount DESC`
  return queryToObjects<StoreCategoryRow>(conn, sql, StoreCategoryRowSchema)
}

/** 店舗別の客数合計 */
export async function queryStoreCustomers(
  conn: AsyncDuckDBConnection,
  params: Omit<StoreCategoryParams, 'level'>,
): Promise<readonly StoreCustomerRow[]> {
  const conditions: WhereCondition[] = [
    { type: 'dateRange', column: 'date_key', from: params.dateFrom, to: params.dateTo },
    { type: 'boolean', column: 'is_prev_year', value: params.isPrevYear ?? false },
    { type: 'storeIds', storeIds: params.storeIds },
  ]
  const where = buildTypedWhere(conditions)
  // CAST で BIGINT に明示変換する。SUM(INTEGER) は DuckDB では HUGEINT を返すため、
  // Arrow 経由で Uint32Array / Decimal として渡る場合があり Zod z.number() が落ちる。
  const sql = `
    SELECT
      store_id,
      CAST(COALESCE(SUM(customers), 0) AS BIGINT) AS "totalCustomers"
    FROM store_day_summary
    ${where}
    GROUP BY store_id`
  return queryToObjects<StoreCustomerRow>(conn, sql, StoreCustomerRowSchema)
}
