/**
 * 高度分析クエリモジュール
 *
 * DuckDB のウィンドウ関数を活用した高度な分析:
 * - カテゴリ構成比の週次推移（構成シフト検出）
 * - 店舗ベンチマーク（週次ランキング推移）
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import { queryToObjects, buildWhereClause, storeIdFilter } from '../queryRunner'

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

  const where = buildWhereClause([
    `cts.date_key BETWEEN '${params.dateFrom}' AND '${params.dateTo}'`,
    `cts.is_prev_year = ${params.isPrevYear ?? false}`,
    storeIdFilter(params.storeIds)
      ? storeIdFilter(params.storeIds)!.replace('store_id', 'cts.store_id')
      : null,
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

// ── 店舗ベンチマーク ──

export interface StoreBenchmarkRow {
  readonly storeId: string
  readonly weekStart: string
  readonly weekSales: number
  readonly avgDailySales: number
  readonly salesRank: number
  readonly salesPercentile: number
}

export interface StoreBenchmarkParams {
  readonly dateFrom: string
  readonly dateTo: string
  readonly storeIds?: readonly string[]
}

/**
 * 店舗ベンチマーク — 週次ランキング推移
 *
 * store_day_summary から店舗×週で集約し、RANK() + PERCENT_RANK() で
 * 各週における相対的な店舗順位を算出する。
 * バンプチャートで店舗の浮沈を可視化するウィジェット向け。
 */
export async function queryStoreBenchmark(
  conn: AsyncDuckDBConnection,
  params: StoreBenchmarkParams,
): Promise<readonly StoreBenchmarkRow[]> {
  const where = buildWhereClause([
    `sds.date_key BETWEEN '${params.dateFrom}' AND '${params.dateTo}'`,
    'sds.is_prev_year = FALSE',
    storeIdFilter(params.storeIds)
      ? storeIdFilter(params.storeIds)!.replace('store_id', 'sds.store_id')
      : null,
  ])

  const sql = `
    WITH store_weekly AS (
      SELECT
        sds.store_id,
        DATE_TRUNC('week', make_date(sds.year, sds.month, sds.day))::VARCHAR AS week_start,
        SUM(sds.sales) AS week_sales,
        COUNT(DISTINCT sds.date_key) AS days
      FROM store_day_summary sds
      ${where}
      GROUP BY sds.store_id, week_start
    )
    SELECT
      store_id,
      week_start,
      week_sales,
      ROUND(week_sales * 1.0 / NULLIF(days, 0), 0) AS avg_daily_sales,
      RANK() OVER (PARTITION BY week_start ORDER BY week_sales DESC)::INTEGER AS sales_rank,
      ROUND(PERCENT_RANK() OVER (PARTITION BY week_start ORDER BY week_sales) * 100, 1) AS sales_percentile
    FROM store_weekly
    ORDER BY week_start, sales_rank`
  return queryToObjects<StoreBenchmarkRow>(conn, sql)
}
