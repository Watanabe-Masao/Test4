/**
 * 自由期間部門KPI — DuckDB クエリ実装
 *
 * application/readModels からの SQL / queryToObjects 依存を
 * infrastructure 層に閉じ込める。
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import { queryToObjects } from '../queryRunner'

export interface RawDeptKPIRow {
  deptCode: string
  deptName: string | null
  salesBudget: number
  salesActual: number
  gpRateBudget: number | null
  gpRateActual: number | null
  markupRate: number | null
  discountRate: number | null
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
    SUM(gp_rate_budget * sales_actual) / NULLIF(SUM(sales_actual), 0) AS "gpRateBudget",
    SUM(gp_rate_actual * sales_actual) / NULLIF(SUM(sales_actual), 0) AS "gpRateActual",
    SUM(markup_rate * sales_actual) / NULLIF(SUM(sales_actual), 0) AS "markupRate",
    SUM(discount_rate * sales_actual) / NULLIF(SUM(sales_actual), 0) AS "discountRate"
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
