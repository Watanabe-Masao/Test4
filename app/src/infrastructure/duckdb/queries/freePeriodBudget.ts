/**
 * 自由期間予算 — DuckDB クエリ実装
 *
 * application/readModels からの SQL / queryRunner 依存を
 * infrastructure 層に閉じ込める。
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import { queryToObjects, buildTypedWhere } from '../queryRunner'
import type { WhereCondition } from '../queryRunner'

export interface RawBudgetRow {
  storeId: string
  year: number
  month: number
  monthlyTotal: number
}

const BUDGET_SQL = (where: string) => `
  SELECT
    b.store_id AS "storeId",
    b.year,
    b.month,
    b.total AS "monthlyTotal"
  FROM budget b
  ${where}
  ORDER BY b.store_id, b.year, b.month
`

export async function queryFreePeriodBudget(
  conn: AsyncDuckDBConnection,
  storeIds?: readonly string[],
): Promise<readonly RawBudgetRow[]> {
  const conditions: WhereCondition[] = [
    { type: 'storeIds', storeIds: storeIds ? [...storeIds] : undefined, alias: 'b' },
  ]
  const where = buildTypedWhere(conditions)
  return queryToObjects<RawBudgetRow>(conn, BUDGET_SQL(where))
}
