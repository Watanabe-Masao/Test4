/**
 * 部門別KPIクエリモジュール
 *
 * ウィンドウ関数で加重平均とランキングを一括算出する。
 * 複数月のトレンド比較にも対応。
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import { queryToObjects } from '../queryRunner'

// ── 結果型 ──

export interface DeptKpiRankedRow {
  readonly year: number
  readonly month: number
  readonly deptCode: string
  readonly deptName: string
  readonly gpRateBudget: number
  readonly gpRateActual: number
  readonly gpRateVariance: number
  readonly markupRate: number
  readonly discountRate: number
  readonly salesBudget: number
  readonly salesActual: number
  readonly salesVariance: number
  readonly salesAchievement: number
  readonly openingInventory: number
  readonly closingInventory: number
  readonly gpRateLanding: number
  readonly salesLanding: number
  readonly gpRateRank: number
  readonly salesAchievementRank: number
}

export interface DeptKpiSummaryRow {
  readonly deptCount: number
  readonly totalSalesBudget: number
  readonly totalSalesActual: number
  readonly overallSalesAchievement: number
  readonly weightedGpRateBudget: number
  readonly weightedGpRateActual: number
  readonly weightedDiscountRate: number
  readonly weightedMarkupRate: number
}

export interface DeptKpiMonthlyTrendRow {
  readonly year: number
  readonly month: number
  readonly deptCode: string
  readonly deptName: string
  readonly gpRateActual: number
  readonly salesActual: number
}

// ── クエリ関数 ──

/**
 * ランキング付き部門KPI一覧
 */
export async function queryDeptKpiRanked(
  conn: AsyncDuckDBConnection,
  params: { readonly year: number; readonly month: number },
): Promise<readonly DeptKpiRankedRow[]> {
  const sql = `
    SELECT
      year, month,
      dept_code, dept_name,
      gp_rate_budget, gp_rate_actual, gp_rate_variance,
      markup_rate, discount_rate,
      sales_budget, sales_actual, sales_variance, sales_achievement,
      opening_inventory, closing_inventory,
      gp_rate_landing, sales_landing,
      RANK() OVER (ORDER BY gp_rate_actual DESC) AS gp_rate_rank,
      RANK() OVER (ORDER BY sales_achievement DESC) AS sales_achievement_rank
    FROM department_kpi
    WHERE year = ${params.year} AND month = ${params.month}
    ORDER BY gp_rate_actual DESC`
  return queryToObjects<DeptKpiRankedRow>(conn, sql)
}

/**
 * 集約サマリー（売上加重平均）
 */
export async function queryDeptKpiSummary(
  conn: AsyncDuckDBConnection,
  params: { readonly year: number; readonly month: number },
): Promise<DeptKpiSummaryRow | null> {
  const sql = `
    SELECT
      COUNT(*) AS dept_count,
      COALESCE(SUM(sales_budget), 0) AS total_sales_budget,
      COALESCE(SUM(sales_actual), 0) AS total_sales_actual,
      CASE WHEN SUM(sales_budget) > 0
        THEN SUM(sales_actual) / SUM(sales_budget)
        ELSE 0 END AS overall_sales_achievement,
      CASE WHEN SUM(sales_actual) > 0
        THEN SUM(gp_rate_budget * sales_actual) / SUM(sales_actual)
        ELSE 0 END AS weighted_gp_rate_budget,
      CASE WHEN SUM(sales_actual) > 0
        THEN SUM(gp_rate_actual * sales_actual) / SUM(sales_actual)
        ELSE 0 END AS weighted_gp_rate_actual,
      CASE WHEN SUM(sales_actual) > 0
        THEN SUM(discount_rate * sales_actual) / SUM(sales_actual)
        ELSE 0 END AS weighted_discount_rate,
      CASE WHEN SUM(sales_actual) > 0
        THEN SUM(markup_rate * sales_actual) / SUM(sales_actual)
        ELSE 0 END AS weighted_markup_rate
    FROM department_kpi
    WHERE year = ${params.year} AND month = ${params.month}`
  const rows = await queryToObjects<DeptKpiSummaryRow>(conn, sql)
  return rows.length > 0 ? rows[0] : null
}

/**
 * 複数月トレンド比較
 */
export async function queryDeptKpiMonthlyTrend(
  conn: AsyncDuckDBConnection,
  params: {
    readonly yearMonths: readonly { readonly year: number; readonly month: number }[]
    readonly deptCode?: string
  },
): Promise<readonly DeptKpiMonthlyTrendRow[]> {
  if (params.yearMonths.length === 0) return []

  const values = params.yearMonths.map((ym) => `(${ym.year}, ${ym.month})`).join(', ')
  const deptFilter = params.deptCode
    ? `AND dept_code = '${params.deptCode}'`
    : ''

  const sql = `
    SELECT
      year, month,
      dept_code, dept_name,
      gp_rate_actual, sales_actual
    FROM department_kpi
    WHERE (year, month) IN (VALUES ${values})
    ${deptFilter}
    ORDER BY year, month, dept_code`
  return queryToObjects<DeptKpiMonthlyTrendRow>(conn, sql)
}
