/**
 * 自由期間部門KPI — DuckDB クエリ実装
 *
 * application/readModels からの SQL / queryToObjects 依存を
 * infrastructure 層に閉じ込める。
 *
 * ## unify-period-analysis Phase 4 — 率計算の剥離
 *
 * 本 SQL は **額のみを返す**。各率 (gpRate / markupRate / discountRate) は
 * 「額 × 売上の加重和」として transport し、`buildFreePeriodDeptKPIReadModel`
 * が pure JS で `weightedSum / salesActual` を計算する。
 *
 * - SQL 側: `SUM(rate * sales_actual)` — 加重和のみ（除算しない）
 * - JS 側: `weightedSum / totalWeight` — 率への変換（null 伝播つき）
 *
 * `data-pipeline-integrity.md`: 「額で持ち回し、率は使用直前に domain 側で算出」
 *  を遵守する。SQL 内で NULLIF 除算による率計算を行うと同原則に反する。
 *
 * ガード: `noRateInFreePeriodSqlGuard.test.ts` が本ファイルを含む
 * `freePeriod*` SQL ファイルに対する rate 計算パターンを禁止する。
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import { queryToObjects } from '../queryRunner'

/**
 * 自由期間部門 KPI の raw row。
 *
 * `*Weighted` フィールドは「売上加重和」であり、**率ではない**。率へは
 * `buildFreePeriodDeptKPIReadModel` で `weightedSum / salesActual` を計算する
 * ことで変換される。
 */
export interface RawDeptKPIRow {
  deptCode: string
  deptName: string | null
  salesBudget: number
  salesActual: number
  /** Σ(gp_rate_budget × sales_actual) — 率ではなく加重和 */
  gpRateBudgetWeighted: number | null
  /** Σ(gp_rate_actual × sales_actual) — 率ではなく加重和 */
  gpRateActualWeighted: number | null
  /** Σ(markup_rate × sales_actual) — 率ではなく加重和 */
  markupRateWeighted: number | null
  /** Σ(discount_rate × sales_actual) — 率ではなく加重和 */
  discountRateWeighted: number | null
}

function buildYearMonthFilter(yearMonths: readonly { year: number; month: number }[]): string {
  if (yearMonths.length === 0) return 'FALSE'
  return yearMonths.map(({ year, month }) => `(year = ${year} AND month = ${month})`).join(' OR ')
}

const DEPT_KPI_SQL = (filter: string) => `
  SELECT
    dept_code AS "deptCode",
    dept_name AS "deptName",
    SUM(sales_budget) AS "salesBudget",
    SUM(sales_actual) AS "salesActual",
    SUM(gp_rate_budget * sales_actual) AS "gpRateBudgetWeighted",
    SUM(gp_rate_actual * sales_actual) AS "gpRateActualWeighted",
    SUM(markup_rate * sales_actual) AS "markupRateWeighted",
    SUM(discount_rate * sales_actual) AS "discountRateWeighted"
  FROM department_kpi
  WHERE (${filter})
  GROUP BY dept_code, dept_name
  ORDER BY dept_code
`

export async function queryFreePeriodDeptKPI(
  conn: AsyncDuckDBConnection,
  yearMonths: readonly { year: number; month: number }[],
): Promise<readonly RawDeptKPIRow[]> {
  const filter = buildYearMonthFilter(yearMonths)
  return queryToObjects<RawDeptKPIRow>(conn, DEPT_KPI_SQL(filter))
}
