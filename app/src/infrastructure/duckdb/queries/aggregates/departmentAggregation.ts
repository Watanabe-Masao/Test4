/**
 * 部門別集約クエリ（DuckDB SQL 版）
 *
 * ## 責務
 * department_kpi テーブルから部門別に売上・粗利率・値入率・売変率を
 * 集約し、売上加重平均を算出する。
 *
 * ## 権威性
 * - 役割: aggregate-source（集約素材の提供）
 * - 実装責務: SQL（DuckDB）
 * - 権威性: exploratory — 正式値の最終判定は TS 側が担う
 *
 * ## 入力スキーマ
 * department_kpi テーブル（dept_code, dept_name, sales_actual, gp_rate_actual 等）
 * フィルタ: year, month
 *
 * ## 出力スキーマ
 * DepartmentAggregationRow {
 *   deptCode, deptName, salesBudget, salesActual, salesAchievement,
 *   gpRateBudget, gpRateActual, gpRateVariance,
 *   markupRate, discountRate
 * }
 * DepartmentAggregationSummaryRow {
 *   deptCount, totalSalesBudget, totalSalesActual, overallSalesAchievement,
 *   weightedGpRateBudget, weightedGpRateActual,
 *   weightedDiscountRate, weightedMarkupRate
 * }
 *
 * ## TS 側の責務
 * SQL 結果を受け取り、以下の意味づけのみ担当:
 * - DepartmentAggregationRow → DepartmentKpiIndex への変換
 * - ランキング構築（gpRateRanking, salesAchievementRanking）
 * - warning / status 判定
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import { z } from 'zod'
import { queryToObjects } from '../../queryRunner'
import { validateYearMonth } from '../../queryParams'

// ── 結果型 ──

/** 部門別集約行 */
export interface DepartmentAggregationRow {
  readonly deptCode: string
  readonly deptName: string
  readonly salesBudget: number
  readonly salesActual: number
  readonly salesAchievement: number
  readonly gpRateBudget: number
  readonly gpRateActual: number
  readonly gpRateVariance: number
  readonly markupRate: number
  readonly discountRate: number
  readonly openingInventory: number
  readonly closingInventory: number
  readonly gpRateLanding: number
  readonly salesLanding: number
}

export const DepartmentAggregationRowSchema = z.object({
  deptCode: z.string(),
  deptName: z.string(),
  salesBudget: z.number(),
  salesActual: z.number(),
  salesAchievement: z.number(),
  gpRateBudget: z.number(),
  gpRateActual: z.number(),
  gpRateVariance: z.number(),
  markupRate: z.number(),
  discountRate: z.number(),
  openingInventory: z.number(),
  closingInventory: z.number(),
  gpRateLanding: z.number(),
  salesLanding: z.number(),
})

/**
 * 部門別集約サマリー行
 *
 * 率の加重平均は SQL 内で完結させず、加重合計（numerator）のみ返す。
 * 最終的な率の算出は TS 側で domain/calculations を経由する（@guard B3）。
 */
export interface DepartmentAggregationSummaryRow {
  readonly deptCount: number
  readonly totalSalesBudget: number
  readonly totalSalesActual: number
  readonly overallSalesAchievement: number
  /** SUM(gp_rate_budget × sales_actual) — 率算出は TS 側で行う */
  readonly gpBudgetWeightedSum: number
  /** SUM(gp_rate_actual × sales_actual) — 率算出は TS 側で行う */
  readonly gpActualWeightedSum: number
  /** SUM(discount_rate × sales_actual) — 率算出は TS 側で行う */
  readonly discountWeightedSum: number
  /** SUM(markup_rate × sales_actual) — 率算出は TS 側で行う */
  readonly markupWeightedSum: number
}

export const DepartmentAggregationSummaryRowSchema = z.object({
  deptCount: z.number(),
  totalSalesBudget: z.number(),
  totalSalesActual: z.number(),
  overallSalesAchievement: z.number(),
  gpBudgetWeightedSum: z.number(),
  gpActualWeightedSum: z.number(),
  discountWeightedSum: z.number(),
  markupWeightedSum: z.number(),
})

// ── フィルタ条件 ──

export interface DepartmentAggregationParams {
  readonly year: number
  readonly month: number
}

// ── クエリ関数 ──

/**
 * 部門別集約を SQL で実行する
 *
 * department_kpi テーブルから指定年月の部門別データを取得する。
 * ランキングは TS 側で構築する（DeptKpiRankedRow は departmentKpi.ts が担当）。
 *
 * 以前は TS の buildDepartmentKpiIndex() 内の loop 集計で行っていた
 * 部門別データ取得を SQL に移管。
 */
export async function queryDepartmentAggregation(
  conn: AsyncDuckDBConnection,
  params: DepartmentAggregationParams,
): Promise<readonly DepartmentAggregationRow[]> {
  validateYearMonth(params.year, params.month)

  const sql = `
    SELECT
      dept_code,
      dept_name,
      COALESCE(sales_budget, 0) AS sales_budget,
      COALESCE(sales_actual, 0) AS sales_actual,
      CASE WHEN sales_budget > 0
        THEN sales_actual / sales_budget
        ELSE 0 END AS sales_achievement,
      COALESCE(gp_rate_budget, 0) AS gp_rate_budget,
      COALESCE(gp_rate_actual, 0) AS gp_rate_actual,
      COALESCE(gp_rate_variance, 0) AS gp_rate_variance,
      COALESCE(markup_rate, 0) AS markup_rate,
      COALESCE(discount_rate, 0) AS discount_rate,
      COALESCE(opening_inventory, 0) AS opening_inventory,
      COALESCE(closing_inventory, 0) AS closing_inventory,
      COALESCE(gp_rate_landing, 0) AS gp_rate_landing,
      COALESCE(sales_landing, 0) AS sales_landing
    FROM department_kpi
    WHERE year = ${params.year} AND month = ${params.month}
    ORDER BY dept_code`

  return queryToObjects<DepartmentAggregationRow>(conn, sql, DepartmentAggregationRowSchema)
}

/**
 * 部門別集約サマリー（売上加重平均）を SQL で実行する
 *
 * 以前は TS の buildDepartmentKpiIndex() 内の weighted average ループで
 * 行っていた集約を DuckDB に移管。
 */
export async function queryDepartmentAggregationSummary(
  conn: AsyncDuckDBConnection,
  params: DepartmentAggregationParams,
): Promise<DepartmentAggregationSummaryRow | null> {
  validateYearMonth(params.year, params.month)

  const sql = `
    SELECT
      COUNT(*) AS dept_count,
      COALESCE(SUM(sales_budget), 0) AS total_sales_budget,
      COALESCE(SUM(sales_actual), 0) AS total_sales_actual,
      CASE WHEN SUM(sales_budget) > 0
        THEN SUM(sales_actual) / SUM(sales_budget)
        ELSE 0 END AS overall_sales_achievement,
      COALESCE(SUM(gp_rate_budget * sales_actual), 0) AS gp_budget_weighted_sum,
      COALESCE(SUM(gp_rate_actual * sales_actual), 0) AS gp_actual_weighted_sum,
      COALESCE(SUM(discount_rate * sales_actual), 0) AS discount_weighted_sum,
      COALESCE(SUM(markup_rate * sales_actual), 0) AS markup_weighted_sum
    FROM department_kpi
    WHERE year = ${params.year} AND month = ${params.month}`

  const rows = await queryToObjects<DepartmentAggregationSummaryRow>(
    conn,
    sql,
    DepartmentAggregationSummaryRowSchema,
  )
  return rows.length > 0 ? rows[0] : null
}
