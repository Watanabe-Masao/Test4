/**
 * 値引き（売変） — DuckDB クエリ実装
 *
 * application/readModels/discountFact からの SQL / queryRunner 依存を
 * infrastructure 層に閉じ込める。
 *
 * @see references/01-foundation/discount-definition.md
 *
 * @responsibility R:unclassified
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

/**
 * 値引きファクト（明細粒度）の取得。
 *
 * @risk PARTIAL
 * @depends-on loadMonth-replace-semantics
 *
 * GROUP BY 粒度が `(store, day, dept, line, class)` と最も細かく、通常の明細
 * 構造ではここが一意になるため SUM は事実上 1:1。同じキーが 2 行存在する
 * ロードバグ時にのみ倍化する（FRAGILE 群より発火条件は狭い）。
 *
 * @see references/03-implementation/read-path-duplicate-audit.md §PARTIAL/9
 */
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
      cs.department_name AS dept_code,
      COALESCE(cs.department_name, '') AS dept_name,
      COALESCE(cs.line_name, '') AS line_name,
      COALESCE(cs.class_name, '') AS klass_name,
      cs.line_name AS line_code,
      cs.class_name AS klass_code,
      COALESCE(SUM(cs.discount_71), 0) AS discount_71,
      COALESCE(SUM(cs.discount_72), 0) AS discount_72,
      COALESCE(SUM(cs.discount_73), 0) AS discount_73,
      COALESCE(SUM(cs.discount_74), 0) AS discount_74,
      COALESCE(SUM(cs.discount_71 + cs.discount_72 + cs.discount_73 + cs.discount_74), 0) AS discount_total
    FROM classified_sales cs
    ${where}
    GROUP BY cs.store_id, cs.day, cs.department_name,
             cs.line_name, cs.class_name
    ORDER BY cs.store_id, cs.day, cs.department_name, cs.line_name, cs.class_name`

  return queryToObjects<RawDiscountFactRow>(conn, sql)
}
