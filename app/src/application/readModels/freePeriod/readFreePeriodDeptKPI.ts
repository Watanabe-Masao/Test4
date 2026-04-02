/**
 * readFreePeriodDeptKPI — 自由期間部門KPIの唯一の read 関数
 *
 * department_kpi テーブルから対象年月の部門別 KPI を取得し、
 * 複数月分を部門ごとに集約して FreePeriodDeptKPIReadModel を返す。
 *
 * 集約規則:
 * - salesBudget / salesActual: 月次値の合計
 * - gpRateBudget / gpRateActual / markupRate / discountRate: 売上加重平均
 * - salesAchievement: salesActual / salesBudget
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import { queryToObjects } from '@/infrastructure/duckdb/queryRunner'
import {
  FreePeriodDeptKPIReadModel,
  FreePeriodDeptKPIRow,
  type FreePeriodDeptKPIReadModel as FreePeriodDeptKPIReadModelType,
  type FreePeriodDeptKPIQueryInput as FreePeriodDeptKPIQueryInputType,
} from './FreePeriodDeptKPITypes'

interface RawRow {
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

/**
 * 自由期間部門KPIの唯一の read 関数。
 */
export async function readFreePeriodDeptKPI(
  conn: AsyncDuckDBConnection,
  input: FreePeriodDeptKPIQueryInputType,
): Promise<FreePeriodDeptKPIReadModelType> {
  const filter = buildYearMonthFilter(input.yearMonths)
  const rawRows = await queryToObjects<RawRow>(conn, DEPT_KPI_SQL(filter))

  const rows = rawRows.map((r) =>
    FreePeriodDeptKPIRow.parse({
      ...r,
      salesAchievement: r.salesBudget > 0 ? r.salesActual / r.salesBudget : null,
    }),
  )

  return FreePeriodDeptKPIReadModel.parse({
    rows,
    monthCount: input.yearMonths.length,
  })
}

// ── 純粋関数（テスト用） ──

/**
 * DateRange から対象年月リストを生成する。
 */
export function dateRangeToYearMonths(
  dateFrom: string,
  dateTo: string,
): readonly { year: number; month: number }[] {
  const from = new Date(dateFrom)
  const to = new Date(dateTo)
  const result: { year: number; month: number }[] = []

  let y = from.getFullYear()
  let m = from.getMonth() + 1
  const endY = to.getFullYear()
  const endM = to.getMonth() + 1

  while (y < endY || (y === endY && m <= endM)) {
    result.push({ year: y, month: m })
    m++
    if (m > 12) {
      m = 1
      y++
    }
  }

  return result
}
