/** 高度分析クエリ — カテゴリ構成比の週次推移・カテゴリベンチマーク（指数加重ランキング） */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import { z } from 'zod'
import { queryToObjects, buildTypedWhere } from '../queryRunner'
import type { WhereCondition } from '../queryRunner'
import { validateDateKey } from '../queryParams'

// ── 共通ヘルパー ──

type CategoryLevel = 'department' | 'line' | 'klass'

/** カテゴリ階層レベルに対応する SQL カラム名を返す */
function categoryColumns(level: CategoryLevel): { code: string; name: string } {
  switch (level) {
    case 'department':
      return { code: 'cts.dept_code', name: 'cts.dept_name' }
    case 'line':
      return { code: 'cts.line_code', name: 'cts.line_name' }
    case 'klass':
      return { code: 'cts.klass_code', name: 'cts.klass_name' }
  }
}

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

export const CategoryMixWeeklyRowSchema = z.object({
  weekStart: z.string(),
  code: z.string(),
  name: z.string(),
  weekSales: z.number(),
  totalWeekSales: z.number(),
  sharePct: z.number(),
  prevWeekShare: z.number().nullable(),
  shareShift: z.number().nullable(),
})

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
  const { code: codeCol, name: nameCol } = categoryColumns(params.level)

  const where = buildTypedWhere([
    {
      type: 'dateRange',
      column: 'date_key',
      from: params.dateFrom,
      to: params.dateTo,
      alias: 'cts',
    },
    { type: 'boolean', column: 'is_prev_year', value: params.isPrevYear ?? false, alias: 'cts' },
    { type: 'storeIds', storeIds: params.storeIds, alias: 'cts' },
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
  return queryToObjects<CategoryMixWeeklyRow>(conn, sql, CategoryMixWeeklyRowSchema)
}

// ── カテゴリベンチマーク（指数加重ランキング） ──

/** カテゴリベンチマーク結果行: カテゴリ×店舗の順位・スコア */
export interface CategoryBenchmarkRow {
  readonly code: string
  readonly name: string
  readonly storeId: string
  readonly totalSales: number
  readonly totalQuantity: number
  /** 店舗の期間合計客数（花卉ファイル由来、0の場合はPI計算不可） */
  readonly storeCustomers: number
  /** 店舗内売上構成比 (0-1): 店舗規模の影響を排除したランキング基準 */
  readonly share: number
  readonly salesRank: number
  readonly storeCount: number
}

export const CategoryBenchmarkRowSchema = z.object({
  code: z.string(),
  name: z.string(),
  storeId: z.string(),
  totalSales: z.number(),
  totalQuantity: z.number(),
  storeCustomers: z.number(),
  share: z.number(),
  salesRank: z.number(),
  storeCount: z.number(),
})

export interface CategoryBenchmarkParams {
  readonly dateFrom: string
  readonly dateTo: string
  readonly storeIds?: readonly string[]
  readonly level: 'department' | 'line' | 'klass'
  /** ライン・クラス表示時の親部門コードフィルタ */
  readonly parentDeptCode?: string
  /** クラス表示時の親ラインコードフィルタ */
  readonly parentLineCode?: string
}

/** カテゴリ階層アイテム */
export interface CategoryHierarchyItem {
  readonly code: string
  readonly name: string
}

export const CategoryHierarchyItemSchema = z.object({
  code: z.string(),
  name: z.string(),
})

/**
 * 指定レベルの distinct カテゴリ一覧を取得（階層フィルタ用）
 */
export async function queryCategoryHierarchy(
  conn: AsyncDuckDBConnection,
  params: {
    readonly dateFrom: string
    readonly dateTo: string
    readonly storeIds?: readonly string[]
    readonly level: 'department' | 'line' | 'klass'
    readonly parentDeptCode?: string
  },
): Promise<readonly CategoryHierarchyItem[]> {
  const { code: codeCol, name: nameCol } = categoryColumns(params.level)

  const conditions: WhereCondition[] = [
    {
      type: 'dateRange',
      column: 'date_key',
      from: params.dateFrom,
      to: params.dateTo,
      alias: 'cts',
    },
    { type: 'boolean', column: 'is_prev_year', value: false, alias: 'cts' },
    { type: 'storeIds', storeIds: params.storeIds, alias: 'cts' },
  ]
  if (params.parentDeptCode) {
    conditions.push({
      type: 'code',
      column: 'dept_code',
      value: params.parentDeptCode,
      alias: 'cts',
    })
  }
  const where = buildTypedWhere(conditions)

  const sql = `
    SELECT DISTINCT ${codeCol} AS code, ${nameCol} AS name
    FROM category_time_sales cts
    ${where}
    ORDER BY code`
  return queryToObjects<CategoryHierarchyItem>(conn, sql, CategoryHierarchyItemSchema)
}

/**
 * カテゴリベンチマーク — 各カテゴリにおける店舗別構成比ランキング
 *
 * category_time_sales から指定階層(部門/ライン/クラス)×店舗で集約し、
 * 各店舗内の売上構成比で RANK() を算出する。
 * 構成比ベースにすることで店舗規模の影響を排除する。
 * 指数加重スコア s(r)=e^{-k(r-1)} の計算はアプリ層で行う。
 */
export async function queryCategoryBenchmark(
  conn: AsyncDuckDBConnection,
  params: CategoryBenchmarkParams,
): Promise<readonly CategoryBenchmarkRow[]> {
  const { code: codeCol, name: nameCol } = categoryColumns(params.level)

  const dateFrom = validateDateKey(params.dateFrom)
  const dateTo = validateDateKey(params.dateTo)
  const conditions: WhereCondition[] = [
    {
      type: 'dateRange',
      column: 'date_key',
      from: params.dateFrom,
      to: params.dateTo,
      alias: 'cts',
    },
    { type: 'boolean', column: 'is_prev_year', value: false, alias: 'cts' },
    { type: 'storeIds', storeIds: params.storeIds, alias: 'cts' },
  ]
  if (params.parentDeptCode) {
    conditions.push({
      type: 'code',
      column: 'dept_code',
      value: params.parentDeptCode,
      alias: 'cts',
    })
  }
  if (params.parentLineCode) {
    conditions.push({
      type: 'code',
      column: 'line_code',
      value: params.parentLineCode,
      alias: 'cts',
    })
  }
  const where = buildTypedWhere(conditions)

  const sql = `
    WITH cat_store AS (
      SELECT
        ${codeCol} AS code,
        ${nameCol} AS name,
        cts.store_id,
        SUM(cts.total_amount) AS total_sales,
        SUM(cts.total_quantity) AS total_quantity
      FROM category_time_sales cts
      ${where}
      GROUP BY ${codeCol}, ${nameCol}, cts.store_id
    ),
    store_total AS (
      SELECT store_id, SUM(total_sales) AS store_sales
      FROM cat_store
      GROUP BY store_id
    ),
    store_cust AS (
      SELECT store_id, SUM(customers) AS total_customers
      FROM store_day_summary
      WHERE date_key BETWEEN '${dateFrom}' AND '${dateTo}'
        AND is_prev_year = FALSE
      GROUP BY store_id
    ),
    cat_share AS (
      SELECT
        cs.code,
        cs.name,
        cs.store_id,
        cs.total_sales,
        cs.total_quantity,
        COALESCE(sc.total_customers, 0)::INTEGER AS store_customers,
        CASE WHEN st.store_sales > 0
          THEN cs.total_sales / st.store_sales
          ELSE 0 END AS share
      FROM cat_store cs
      JOIN store_total st ON cs.store_id = st.store_id
      LEFT JOIN store_cust sc ON cs.store_id = sc.store_id
    )
    SELECT
      code,
      name,
      store_id,
      total_sales,
      total_quantity,
      store_customers,
      share,
      RANK() OVER (PARTITION BY code ORDER BY share DESC)::INTEGER AS sales_rank,
      COUNT(*) OVER (PARTITION BY code)::INTEGER AS store_count
    FROM cat_share
    ORDER BY code, sales_rank`
  return queryToObjects<CategoryBenchmarkRow>(conn, sql, CategoryBenchmarkRowSchema)
}

// ── カテゴリベンチマーク 日別トレンド ──

/** 日別カテゴリ×店舗の構成比行 */
export interface CategoryBenchmarkTrendRow {
  readonly dateKey: string
  readonly code: string
  readonly name: string
  readonly storeId: string
  readonly totalSales: number
  readonly share: number
}

export const CategoryBenchmarkTrendRowSchema = z.object({
  dateKey: z.string(),
  code: z.string(),
  name: z.string(),
  storeId: z.string(),
  totalSales: z.number(),
  share: z.number(),
})

/**
 * カテゴリベンチマーク日別トレンド
 *
 * 日別 × カテゴリ × 店舗 の構成比を返す。
 * アプリ層で日別の Index × 安定度 を算出してトレンドを描画する。
 */
export async function queryCategoryBenchmarkTrend(
  conn: AsyncDuckDBConnection,
  params: CategoryBenchmarkParams,
): Promise<readonly CategoryBenchmarkTrendRow[]> {
  const { code: codeCol, name: nameCol } = categoryColumns(params.level)

  const conditions: WhereCondition[] = [
    {
      type: 'dateRange',
      column: 'date_key',
      from: params.dateFrom,
      to: params.dateTo,
      alias: 'cts',
    },
    { type: 'boolean', column: 'is_prev_year', value: false, alias: 'cts' },
    { type: 'storeIds', storeIds: params.storeIds, alias: 'cts' },
  ]
  if (params.parentDeptCode) {
    conditions.push({
      type: 'code',
      column: 'dept_code',
      value: params.parentDeptCode,
      alias: 'cts',
    })
  }
  if (params.parentLineCode) {
    conditions.push({
      type: 'code',
      column: 'line_code',
      value: params.parentLineCode,
      alias: 'cts',
    })
  }
  const where = buildTypedWhere(conditions)

  const sql = `
    WITH daily_cat_store AS (
      SELECT
        cts.date_key,
        ${codeCol} AS code,
        ${nameCol} AS name,
        cts.store_id,
        SUM(cts.total_amount) AS total_sales
      FROM category_time_sales cts
      ${where}
      GROUP BY cts.date_key, ${codeCol}, ${nameCol}, cts.store_id
    ),
    daily_store_total AS (
      SELECT date_key, store_id, SUM(total_sales) AS store_sales
      FROM daily_cat_store
      GROUP BY date_key, store_id
    )
    SELECT
      dcs.date_key,
      dcs.code,
      dcs.name,
      dcs.store_id,
      dcs.total_sales,
      CASE WHEN dst.store_sales > 0
        THEN dcs.total_sales / dst.store_sales
        ELSE 0 END AS share
    FROM daily_cat_store dcs
    JOIN daily_store_total dst
      ON dcs.date_key = dst.date_key AND dcs.store_id = dst.store_id
    ORDER BY dcs.date_key, dcs.code`
  return queryToObjects<CategoryBenchmarkTrendRow>(conn, sql, CategoryBenchmarkTrendRowSchema)
}
