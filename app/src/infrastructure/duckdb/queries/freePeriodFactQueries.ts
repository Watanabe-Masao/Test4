/**
 * 自由期間分析 — DuckDB クエリ実装
 *
 * application/readModels/freePeriod からの SQL / queryRunner 依存を
 * infrastructure 層に閉じ込める。
 *
 * @see references/01-principles/free-period-analysis-definition.md
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import { queryToObjects, buildTypedWhere } from '../queryRunner'
import type { WhereCondition } from '../queryRunner'

// ── Row 型（plain interface — Zod は application 側で検証） ──

export interface RawFreePeriodDailyRow {
  readonly storeId: string
  readonly dateKey: string
  readonly day: number
  readonly dow: number
  readonly sales: number
  readonly customers: number
  readonly purchaseCost: number
  readonly purchasePrice: number
  readonly discount: number
  readonly isPrevYear: boolean
}

// ── WHERE builder ──

function buildWhere(
  dateFrom: string,
  dateTo: string,
  storeIds?: readonly string[],
  isPrevYear = false,
): string {
  const conditions: WhereCondition[] = [
    { type: 'dateRange', column: 'date_key', from: dateFrom, to: dateTo },
    { type: 'boolean', column: 'is_prev_year', value: isPrevYear },
    { type: 'storeIds', storeIds: storeIds ? [...storeIds] : undefined },
  ]
  return buildTypedWhere(conditions)
}

// ── SQL テンプレート ──

// 重複耐性: classified_sales (cs) 側を subquery で `(store_id, date_key, day, is_prev_year)`
// 粒度に事前集約してから LEFT JOIN する。purchase (p) 側は従来から事前集約済み。
// これにより JOIN 後の SUM が source 行重複に対して構造的に防御される
// (schemas.ts の day-summary VIEW と同じ pre-aggregate パターン)。
const DAILY_SQL = (where: string) => `
  SELECT
    cs.store_id AS "storeId",
    cs.date_key AS "dateKey",
    cs.day,
    EXTRACT(DOW FROM cs.date_key::DATE)::INT AS "dow",
    cs.sales AS "sales",
    cs.customers AS "customers",
    COALESCE(p.cost, 0) AS "purchaseCost",
    COALESCE(p.price, 0) AS "purchasePrice",
    cs.discount AS "discount",
    cs.is_prev_year AS "isPrevYear"
  FROM (
    SELECT
      store_id, date_key, day, is_prev_year,
      SUM(sales_amount) AS sales,
      SUM(customers) AS customers,
      SUM(discount_71 + discount_72 + discount_73 + discount_74) AS discount
    FROM classified_sales
    ${where}
    GROUP BY store_id, date_key, day, is_prev_year
  ) cs
  LEFT JOIN (
    SELECT store_id, date_key, SUM(cost) AS cost, SUM(price) AS price
    FROM purchase
    GROUP BY store_id, date_key
  ) p ON cs.store_id = p.store_id AND cs.date_key = p.date_key
  ORDER BY cs.date_key, cs.store_id
`

// ── Query 関数 ──

/**
 * 自由期間分析の日次明細クエリ。
 *
 * **重複耐性:** `classified_sales` (cs) 側 / `purchase` (p) 側ともに subquery で
 * 事前集約してから LEFT JOIN する（schemas.ts の day-summary VIEW と同じ pre-aggregate パターン）。
 * 詳細: references/03-guides/read-path-duplicate-audit.md §FRAGILE/6
 */
export async function queryFreePeriodDaily(
  conn: AsyncDuckDBConnection,
  dateFrom: string,
  dateTo: string,
  storeIds?: readonly string[],
  isPrevYear = false,
): Promise<readonly RawFreePeriodDailyRow[]> {
  const where = buildWhere(dateFrom, dateTo, storeIds, isPrevYear)
  return queryToObjects<RawFreePeriodDailyRow>(conn, DAILY_SQL(where))
}
