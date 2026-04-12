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

const DAILY_SQL = (where: string) => `
  SELECT
    cs.store_id AS "storeId",
    cs.date_key AS "dateKey",
    cs.day,
    EXTRACT(DOW FROM cs.date_key::DATE)::INT AS "dow",
    SUM(cs.sales_amount) AS "sales",
    SUM(cs.customers) AS "customers",
    COALESCE(p.cost, 0) AS "purchaseCost",
    COALESCE(p.price, 0) AS "purchasePrice",
    SUM(cs.discount_71 + cs.discount_72 + cs.discount_73 + cs.discount_74) AS "discount",
    cs.is_prev_year AS "isPrevYear"
  FROM classified_sales cs
  LEFT JOIN (
    SELECT store_id, date_key, SUM(cost) AS cost, SUM(price) AS price
    FROM purchase
    GROUP BY store_id, date_key
  ) p ON cs.store_id = p.store_id AND cs.date_key = p.date_key
  ${where}
  GROUP BY cs.store_id, cs.date_key, cs.day, cs.is_prev_year, p.cost, p.price
  ORDER BY cs.date_key, cs.store_id
`

// ── Query 関数 ──

/**
 * 自由期間分析の日次明細クエリ。
 *
 * @risk FRAGILE
 * @depends-on loadMonth-replace-semantics
 *
 * `purchase` 側は subquery で事前集約してから LEFT JOIN しているため安全だが、
 * `classified_sales cs` 側は事前集約せず直接 SUM を取っている。`cs` の明細行が
 * 重複した場合、SUM(sales) / SUM(customers) / SUM(discount_*) が倍化する。
 * `dataLoader.ts::loadMonth` の replace セマンティクス契約と一体で動作している
 * 前提。
 *
 * @see references/03-guides/read-path-duplicate-audit.md §FRAGILE/6
 * @see references/03-guides/data-load-idempotency-plan.md §8 Done 定義
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
