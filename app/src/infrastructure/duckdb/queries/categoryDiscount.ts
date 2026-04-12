/**
 * カテゴリ別売変クエリ
 *
 * classified_sales テーブルから部門/ライン/クラス別の売変内訳を集計。
 * 日別 or 期間合計のどちらにも対応。
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import { z } from 'zod'
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

export const CategoryDiscountRowSchema = z.object({
  code: z.string(),
  name: z.string(),
  salesAmount: z.number(),
  discount71: z.number(),
  discount72: z.number(),
  discount73: z.number(),
  discount74: z.number(),
  discountTotal: z.number(),
})

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

export const CategoryDiscountDailyRowSchema = z.object({
  dateKey: z.string(),
  code: z.string(),
  name: z.string(),
  salesAmount: z.number(),
  discount71: z.number(),
  discount72: z.number(),
  discount73: z.number(),
  discount74: z.number(),
  discountTotal: z.number(),
})

interface CategoryDiscountParams {
  readonly dateFrom: string
  readonly dateTo: string
  readonly storeIds?: readonly string[]
  readonly level: 'department' | 'line' | 'klass'
  readonly isPrevYear?: boolean
  /** 親カテゴリでフィルタ（ドリルダウン用） */
  readonly parentFilter?: { readonly column: string; readonly value: string }
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

/**
 * カテゴリ別売変集計（期間合計）
 *
 * @risk PARTIAL
 * @depends-on loadMonth-replace-semantics
 *
 * `is_prev_year` フィルタで前年混線は防がれており、GROUP BY が category 粒度で
 * 集約するため明細行の自然な多重度は吸収できる。ただし同じ category 内で
 * `classified_sales` 行が重複した場合（ロードバグ時）、SUM は倍化する。
 *
 * @see references/03-guides/read-path-duplicate-audit.md §PARTIAL/7
 */
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
  const parentWhere = params.parentFilter
    ? ` AND ${params.parentFilter.column} = '${params.parentFilter.value.replace(/'/g, "''")}'`
    : ''
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
    ${where}${parentWhere}
    GROUP BY ${col.code}, ${col.name}
    ORDER BY discount_total DESC`
  return queryToObjects<CategoryDiscountRow>(conn, sql, CategoryDiscountRowSchema)
}

/**
 * カテゴリ別売変日別推移
 *
 * @risk PARTIAL
 * @depends-on loadMonth-replace-semantics
 *
 * `queryCategoryDiscount` の daily 版。リスクプロファイルは同じ。
 *
 * @see references/03-guides/read-path-duplicate-audit.md §PARTIAL/8
 */
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
  return queryToObjects<CategoryDiscountDailyRow>(conn, sql, CategoryDiscountDailyRowSchema)
}
