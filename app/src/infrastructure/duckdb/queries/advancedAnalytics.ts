/**
 * 高度分析クエリモジュール
 *
 * DuckDB のウィンドウ関数を活用した高度な分析:
 * - カテゴリ構成比の週次推移（構成シフト検出）
 * - カテゴリベンチマーク（指数加重ランキング）
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import { queryToObjects, buildWhereClause, storeIdFilterWithAlias } from '../queryRunner'
import { validateDateKey } from '../queryParams'

// ── カテゴリ構成比 週次推移 ──

export interface CategoryMixWeeklyRow {
  readonly weekStart: string
  readonly code: string
  readonly name: string
  readonly weekSales: number
  readonly totalWeekSales: number
  readonly sharePct: number
  readonly prevWeekShare: number | null
  readonly shareShift: number | null
}

export interface CategoryMixParams {
  readonly dateFrom: string
  readonly dateTo: string
  readonly storeIds?: readonly string[]
  readonly level: 'department' | 'line' | 'klass'
  readonly isPrevYear?: boolean
}

/**
 * カテゴリ構成比の週次推移
 *
 * 各週におけるカテゴリ別の売上構成比を算出し、
 * 前週比のシフト量（pp）を LAG で取得する。
 * 月跨ぎのカテゴリ浮沈を可視化するウィジェット向け。
 */
export async function queryCategoryMixWeekly(
  conn: AsyncDuckDBConnection,
  params: CategoryMixParams,
): Promise<readonly CategoryMixWeeklyRow[]> {
  let codeCol: string
  let nameCol: string

  switch (params.level) {
    case 'department':
      codeCol = 'cts.dept_code'
      nameCol = 'cts.dept_name'
      break
    case 'line':
      codeCol = 'cts.line_code'
      nameCol = 'cts.line_name'
      break
    case 'klass':
      codeCol = 'cts.klass_code'
      nameCol = 'cts.klass_name'
      break
  }

  const dateFrom = validateDateKey(params.dateFrom)
  const dateTo = validateDateKey(params.dateTo)
  const where = buildWhereClause([
    `cts.date_key BETWEEN '${dateFrom}' AND '${dateTo}'`,
    `cts.is_prev_year = ${params.isPrevYear ?? false}`,
    storeIdFilterWithAlias(params.storeIds, 'cts'),
  ])

  const sql = `
    WITH weekly AS (
      SELECT
        DATE_TRUNC('week', make_date(cts.year, cts.month, cts.day))::VARCHAR AS week_start,
        ${codeCol} AS code,
        ${nameCol} AS name,
        SUM(cts.total_amount) AS week_sales
      FROM category_time_sales cts
      ${where}
      GROUP BY week_start, ${codeCol}, ${nameCol}
    ),
    with_total AS (
      SELECT
        week_start, code, name, week_sales,
        SUM(week_sales) OVER (PARTITION BY week_start) AS total_week_sales,
        ROUND(100.0 * week_sales
          / NULLIF(SUM(week_sales) OVER (PARTITION BY week_start), 0), 2) AS share_pct
      FROM weekly
    )
    SELECT
      week_start, code, name, week_sales, total_week_sales, share_pct,
      LAG(share_pct) OVER (PARTITION BY code ORDER BY week_start) AS prev_week_share,
      share_pct - LAG(share_pct) OVER (PARTITION BY code ORDER BY week_start) AS share_shift
    FROM with_total
    ORDER BY week_start, week_sales DESC`
  return queryToObjects<CategoryMixWeeklyRow>(conn, sql)
}

// ── カテゴリベンチマーク（指数加重ランキング） ──

/** カテゴリベンチマーク結果行: カテゴリ×店舗の順位・スコア */
export interface CategoryBenchmarkRow {
  readonly code: string
  readonly name: string
  readonly storeId: string
  readonly totalSales: number
  readonly salesRank: number
  readonly storeCount: number
}

export interface CategoryBenchmarkParams {
  readonly dateFrom: string
  readonly dateTo: string
  readonly storeIds?: readonly string[]
  readonly level: 'department' | 'line' | 'klass'
}

/**
 * カテゴリベンチマーク — 各カテゴリにおける店舗別売上ランキング
 *
 * category_time_sales から指定階層(部門/ライン/クラス)×店舗で集約し、
 * RANK() でカテゴリ内の店舗順位を算出する。
 * 指数加重スコア s(r)=e^{-k(r-1)} の計算はアプリ層で行う。
 */
export async function queryCategoryBenchmark(
  conn: AsyncDuckDBConnection,
  params: CategoryBenchmarkParams,
): Promise<readonly CategoryBenchmarkRow[]> {
  let codeCol: string
  let nameCol: string

  switch (params.level) {
    case 'department':
      codeCol = 'cts.dept_code'
      nameCol = 'cts.dept_name'
      break
    case 'line':
      codeCol = 'cts.line_code'
      nameCol = 'cts.line_name'
      break
    case 'klass':
      codeCol = 'cts.klass_code'
      nameCol = 'cts.klass_name'
      break
  }

  const dateFrom = validateDateKey(params.dateFrom)
  const dateTo = validateDateKey(params.dateTo)
  const where = buildWhereClause([
    `cts.date_key BETWEEN '${dateFrom}' AND '${dateTo}'`,
    'cts.is_prev_year = FALSE',
    storeIdFilterWithAlias(params.storeIds, 'cts'),
  ])

  const sql = `
    WITH cat_store AS (
      SELECT
        ${codeCol} AS code,
        ${nameCol} AS name,
        cts.store_id,
        SUM(cts.total_amount) AS total_sales
      FROM category_time_sales cts
      ${where}
      GROUP BY ${codeCol}, ${nameCol}, cts.store_id
    )
    SELECT
      code,
      name,
      store_id,
      total_sales,
      RANK() OVER (PARTITION BY code ORDER BY total_sales DESC)::INTEGER AS sales_rank,
      COUNT(*) OVER (PARTITION BY code)::INTEGER AS store_count
    FROM cat_store
    ORDER BY code, sales_rank`
  return queryToObjects<CategoryBenchmarkRow>(conn, sql)
}
