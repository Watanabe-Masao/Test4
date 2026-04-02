/**
 * 値引き（売変） — DuckDB クエリ実装
 *
 * application/readModels/discountFact からの SQL / queryRunner 依存を
 * infrastructure 層に閉じ込める。
 *
 * @see references/01-principles/discount-definition.md
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import { queryToObjects, buildTypedWhere } from '../queryRunner'
import type { WhereCondition } from '../queryRunner'

// ── Row 型（plain interface — Zod は application 側で検証） ──

export interface RawDiscountFactRow {
  readonly storeId: string
  readonly day: number
  readonly deptCode: string
  readonly deptName: string
  readonly lineCode: string
  readonly lineName: string
  readonly klassCode: string
  readonly klassName: string
  readonly discount71: number
  readonly discount72: number
  readonly discount73: number
  readonly discount74: number
  readonly discountTotal: number
}

// ── Query 関数 ──

export async function queryDiscountFact(
  conn: AsyncDuckDBConnection,
  dateFrom: string,
  dateTo: string,
  storeIds?: readonly string[],
  isPrevYear = false,
): Promise<readonly RawDiscountFactRow[]> {
  const conditions: WhereCondition[] = [
    { type: 'dateRange', column: 'date_key', from: dateFrom, to: dateTo, alias: 'cs' },
    { type: 'boolean', column: 'is_prev_year', value: isPrevYear, alias: 'cs' },
    { type: 'storeIds', storeIds: storeIds ? [...storeIds] : undefined, alias: 'cs' },
  ]
  const where = buildTypedWhere(conditions)

  const sql = `
    SELECT
      cs.store_id,
      cs.day,
      cs.dept_code, COALESCE(cs.dept_name, cs.dept_code) AS dept_name,
      cs.line_code, COALESCE(cs.line_name, cs.line_code) AS line_name,
      cs.klass_code, COALESCE(cs.klass_name, cs.klass_code) AS klass_name,
      COALESCE(SUM(cs.discount_71), 0) AS discount_71,
      COALESCE(SUM(cs.discount_72), 0) AS discount_72,
      COALESCE(SUM(cs.discount_73), 0) AS discount_73,
      COALESCE(SUM(cs.discount_74), 0) AS discount_74,
      COALESCE(SUM(cs.discount_71 + cs.discount_72 + cs.discount_73 + cs.discount_74), 0) AS discount_total
    FROM classified_sales cs
    ${where}
    GROUP BY cs.store_id, cs.day, cs.dept_code, cs.dept_name,
             cs.line_code, cs.line_name, cs.klass_code, cs.klass_name
    ORDER BY cs.store_id, cs.day, cs.dept_code, cs.line_code, cs.klass_code`

  return queryToObjects<RawDiscountFactRow>(conn, sql)
}
