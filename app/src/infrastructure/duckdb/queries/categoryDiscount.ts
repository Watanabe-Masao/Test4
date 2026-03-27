/**
 * カテゴリ別売変クエリ
 *
 * classified_sales テーブルから部門/ライン/クラス別の売変内訳を集計。
 * 日別 or 期間合計のどちらにも対応。
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import { queryToObjects, buildTypedWhere } from '../queryRunner'
import type { WhereCondition } from '../queryRunner'

export interface CategoryDiscountRow {
  readonly code: string
  readonly name: string
  readonly salesAmount: number
  readonly discount71: number
  readonly discount72: number
  readonly discount73: number
  readonly discount74: number
  readonly discountTotal: number
}

export interface CategoryDiscountDailyRow {
  readonly dateKey: string
  readonly code: string
  readonly name: string
  readonly salesAmount: number
  readonly discount71: number
  readonly discount72: number
  readonly discount73: number
  readonly discount74: number
  readonly discountTotal: number
}

interface CategoryDiscountParams {
  readonly dateFrom: string
  readonly dateTo: string
  readonly storeIds?: readonly string[]
  readonly level: 'department' | 'line' | 'klass'
  readonly isPrevYear?: boolean
}

function levelColumns(level: 'department' | 'line' | 'klass'): {
  code: string
  name: string
} {
  switch (level) {
    case 'department':
      return { code: 'department_name', name: 'department_name' }
    case 'line':
      return { code: 'line_name', name: 'line_name' }
    case 'klass':
      return { code: 'class_name', name: 'class_name' }
  }
}

/** カテゴリ別売変集計（期間合計） */
export async function queryCategoryDiscount(
  conn: AsyncDuckDBConnection,
  params: CategoryDiscountParams,
): Promise<readonly CategoryDiscountRow[]> {
  const col = levelColumns(params.level)
  const conditions: WhereCondition[] = [
    { type: 'dateRange', column: 'date_key', from: params.dateFrom, to: params.dateTo },
    { type: 'boolean', column: 'is_prev_year', value: params.isPrevYear ?? false },
    { type: 'storeIds', storeIds: params.storeIds },
  ]
  const where = buildTypedWhere(conditions)
  const sql = `
    SELECT
      ${col.code} AS code,
      ${col.name} AS name,
      COALESCE(SUM(sales_amount), 0) AS sales_amount,
      COALESCE(SUM(discount_71), 0) AS discount_71,
      COALESCE(SUM(discount_72), 0) AS discount_72,
      COALESCE(SUM(discount_73), 0) AS discount_73,
      COALESCE(SUM(discount_74), 0) AS discount_74,
      COALESCE(SUM(discount_71) + SUM(discount_72) + SUM(discount_73) + SUM(discount_74), 0) AS discount_total
    FROM classified_sales
    ${where}
    GROUP BY ${col.code}, ${col.name}
    ORDER BY discount_total DESC`
  return queryToObjects<CategoryDiscountRow>(conn, sql)
}

/** カテゴリ別売変日別推移 */
export async function queryCategoryDiscountDaily(
  conn: AsyncDuckDBConnection,
  params: CategoryDiscountParams,
): Promise<readonly CategoryDiscountDailyRow[]> {
  const col = levelColumns(params.level)
  const conditions: WhereCondition[] = [
    { type: 'dateRange', column: 'date_key', from: params.dateFrom, to: params.dateTo },
    { type: 'boolean', column: 'is_prev_year', value: params.isPrevYear ?? false },
    { type: 'storeIds', storeIds: params.storeIds },
  ]
  const where = buildTypedWhere(conditions)
  const sql = `
    SELECT
      date_key,
      ${col.code} AS code,
      ${col.name} AS name,
      COALESCE(SUM(sales_amount), 0) AS sales_amount,
      COALESCE(SUM(discount_71), 0) AS discount_71,
      COALESCE(SUM(discount_72), 0) AS discount_72,
      COALESCE(SUM(discount_73), 0) AS discount_73,
      COALESCE(SUM(discount_74), 0) AS discount_74,
      COALESCE(SUM(discount_71) + SUM(discount_72) + SUM(discount_73) + SUM(discount_74), 0) AS discount_total
    FROM classified_sales
    ${where}
    GROUP BY date_key, ${col.code}, ${col.name}
    ORDER BY date_key, discount_total DESC`
  return queryToObjects<CategoryDiscountDailyRow>(conn, sql)
}
