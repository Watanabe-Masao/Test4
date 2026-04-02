/**
 * 売上・販売点数 — DuckDB クエリ実装
 *
 * application/readModels/salesFact からの SQL / queryRunner 依存を
 * infrastructure 層に閉じ込める。
 *
 * @see references/01-principles/sales-definition.md
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import { queryToObjects, buildTypedWhere } from '../queryRunner'
import type { WhereCondition } from '../queryRunner'

// ── Row 型（plain interface — Zod は application 側で検証） ──

export interface RawSalesFactDailyRow {
  readonly storeId: string
  readonly day: number
  readonly dow: number
  readonly deptCode: string
  readonly deptName: string
  readonly lineCode: string
  readonly lineName: string
  readonly klassCode: string
  readonly klassName: string
  readonly totalAmount: number
  readonly totalQuantity: number
}

export interface RawSalesFactHourlyRow {
  readonly storeId: string
  readonly day: number
  readonly deptCode: string
  readonly lineCode: string
  readonly klassCode: string
  readonly hour: number
  readonly amount: number
  readonly quantity: number
}

// ── WHERE builder ──

function buildWhere(
  dateFrom: string,
  dateTo: string,
  storeIds?: readonly string[],
  isPrevYear = false,
  alias = 'cts',
): string {
  const conditions: WhereCondition[] = [
    { type: 'dateRange', column: 'date_key', from: dateFrom, to: dateTo, alias },
    { type: 'boolean', column: 'is_prev_year', value: isPrevYear, alias },
    { type: 'storeIds', storeIds: storeIds ? [...storeIds] : undefined, alias },
  ]
  return buildTypedWhere(conditions)
}

// ── Query 関数 ──

export async function querySalesFactDaily(
  conn: AsyncDuckDBConnection,
  dateFrom: string,
  dateTo: string,
  storeIds?: readonly string[],
  isPrevYear = false,
): Promise<readonly RawSalesFactDailyRow[]> {
  const where = buildWhere(dateFrom, dateTo, storeIds, isPrevYear)
  const sql = `
    SELECT
      cts.store_id,
      cts.day,
      cts.dow,
      cts.dept_code, COALESCE(cts.dept_name, cts.dept_code) AS dept_name,
      cts.line_code, COALESCE(cts.line_name, cts.line_code) AS line_name,
      cts.klass_code, COALESCE(cts.klass_name, cts.klass_code) AS klass_name,
      COALESCE(SUM(cts.total_amount), 0) AS total_amount,
      COALESCE(SUM(cts.total_quantity), 0) AS total_quantity
    FROM category_time_sales cts
    ${where}
    GROUP BY cts.store_id, cts.day, cts.dow,
             cts.dept_code, cts.dept_name, cts.line_code, cts.line_name,
             cts.klass_code, cts.klass_name
    ORDER BY cts.store_id, cts.day, cts.dept_code, cts.line_code, cts.klass_code`
  return queryToObjects<RawSalesFactDailyRow>(conn, sql)
}

export async function querySalesFactHourly(
  conn: AsyncDuckDBConnection,
  dateFrom: string,
  dateTo: string,
  storeIds?: readonly string[],
  isPrevYear = false,
): Promise<readonly RawSalesFactHourlyRow[]> {
  const where = buildWhere(dateFrom, dateTo, storeIds, isPrevYear, 'ts')
  const sql = `
    SELECT
      ts.store_id,
      ts.day,
      ts.dept_code, ts.line_code, ts.klass_code,
      ts.hour,
      COALESCE(SUM(ts.amount), 0) AS amount,
      COALESCE(SUM(ts.quantity), 0) AS quantity
    FROM time_slots ts
    ${where}
    GROUP BY ts.store_id, ts.day, ts.dept_code, ts.line_code, ts.klass_code, ts.hour
    ORDER BY ts.store_id, ts.day, ts.hour`
  return queryToObjects<RawSalesFactHourlyRow>(conn, sql)
}
