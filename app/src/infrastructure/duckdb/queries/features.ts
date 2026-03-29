/**
 * 特徴量生成クエリモジュール
 *
 * DuckDB のウィンドウ関数・統計関数を使い、
 * 売上データから分析用の特徴量ベクトルを生成する。
 *
 * - 移動平均（3日・7日・28日）
 * - 前日比・前週同曜日比
 * - 変動係数（CV）
 * - Zスコア（異常検知）
 * - 時間帯別構成比・ピーク検出
 * - 曜日パターン（季節性）
 * - 部門別トレンド
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import { queryToObjects, buildTypedWhere } from '../queryRunner'
import type { WhereCondition } from '../queryRunner'
import { validateCode } from '../queryParams'

// ── 結果型（domain/calculations/rawAggregation から re-export）──

import type {
  DailyFeatureRow,
  HourlyProfileRow,
  DowPatternRow,
} from '@/application/query-bridge/rawAggregation'

export type { DailyFeatureRow, HourlyProfileRow, DowPatternRow }

export interface DeptDailyTrendRow {
  readonly storeId: string
  readonly deptCode: string
  readonly deptName: string | null
  readonly dateKey: string
  readonly dailyAmount: number
  readonly deptMa7day: number | null
}

// ── 共通フィルタ ──

interface FeatureFilterParams {
  readonly dateFrom: string
  readonly dateTo: string
  readonly storeIds?: readonly string[]
}

function featureWhereClause(params: FeatureFilterParams): string {
  const conditions: WhereCondition[] = [
    { type: 'dateRange', column: 'date_key', from: params.dateFrom, to: params.dateTo },
    { type: 'boolean', column: 'is_prev_year', value: false },
    { type: 'storeIds', storeIds: params.storeIds },
  ]
  return buildTypedWhere(conditions)
}

// ── クエリ関数 ──

/**
 * 日別売上特徴量ベクトル
 *
 * 移動平均・前日比・Zスコア・変動係数・スパイク比率を算出。
 * date_key 順なので月跨ぎデータでも連続して計算される。
 */
export async function queryDailyFeatures(
  conn: AsyncDuckDBConnection,
  params: FeatureFilterParams,
): Promise<readonly DailyFeatureRow[]> {
  const where = featureWhereClause(params)
  const sql = `
    SELECT
      store_id,
      date_key,
      sales,
      AVG(sales) OVER w3 AS sales_ma_3,
      AVG(sales) OVER w7 AS sales_ma_7,
      AVG(sales) OVER w28 AS sales_ma_28,
      sales - LAG(sales, 1) OVER w AS sales_diff_1d,
      sales - LAG(sales, 7) OVER w AS sales_diff_7d,
      SUM(sales) OVER (
        PARTITION BY store_id ORDER BY date_key
        ROWS UNBOUNDED PRECEDING
      ) AS cumulative_sales,
      CASE WHEN AVG(sales) OVER w7 > 0
        THEN STDDEV_POP(sales) OVER w7 / AVG(sales) OVER w7
        ELSE NULL END AS cv_7day,
      CASE WHEN AVG(sales) OVER w28 > 0
        THEN STDDEV_POP(sales) OVER w28 / AVG(sales) OVER w28
        ELSE NULL END AS cv_28day,
      CASE WHEN STDDEV_POP(sales) OVER w28 > 0
        THEN (sales - AVG(sales) OVER w28) / STDDEV_POP(sales) OVER w28
        ELSE NULL END AS z_score,
      CASE WHEN AVG(sales) OVER w7 > 0
        THEN sales / AVG(sales) OVER w7
        ELSE NULL END AS spike_ratio
    FROM store_day_summary
    ${where}
    WINDOW
      w   AS (PARTITION BY store_id ORDER BY date_key),
      w3  AS (PARTITION BY store_id ORDER BY date_key ROWS BETWEEN 2 PRECEDING AND CURRENT ROW),
      w7  AS (PARTITION BY store_id ORDER BY date_key ROWS BETWEEN 6 PRECEDING AND CURRENT ROW),
      w28 AS (PARTITION BY store_id ORDER BY date_key ROWS BETWEEN 27 PRECEDING AND CURRENT ROW)
    ORDER BY store_id, date_key`
  return queryToObjects<DailyFeatureRow>(conn, sql)
}

/**
 * 時間帯別売上構成比 + ピーク検出
 */
export async function queryHourlyProfile(
  conn: AsyncDuckDBConnection,
  params: FeatureFilterParams,
): Promise<readonly HourlyProfileRow[]> {
  const where = buildTypedWhere([
    { type: 'dateRange', column: 'date_key', from: params.dateFrom, to: params.dateTo },
    { type: 'boolean', column: 'is_prev_year', value: false },
    { type: 'storeIds', storeIds: params.storeIds },
  ])

  const sql = `
    SELECT
      store_id,
      hour,
      SUM(amount) AS total_amount,
      SUM(amount) * 1.0
        / NULLIF(SUM(SUM(amount)) OVER (PARTITION BY store_id), 0) AS hour_share,
      RANK() OVER (PARTITION BY store_id ORDER BY SUM(amount) DESC) AS hour_rank
    FROM time_slots
    ${where}
    GROUP BY store_id, hour
    ORDER BY store_id, hour`
  return queryToObjects<HourlyProfileRow>(conn, sql)
}

/**
 * 曜日パターン（季節性分析）
 *
 * 非営業日（daily_sales = 0）は平均・標準偏差の計算から除外する。
 * 非営業日を含めると曜日別平均が実態より低くなるため。
 */
export async function queryDowPattern(
  conn: AsyncDuckDBConnection,
  params: FeatureFilterParams,
): Promise<readonly DowPatternRow[]> {
  const where = featureWhereClause(params)
  const sql = `
    WITH daily AS (
      SELECT
        store_id,
        date_key,
        EXTRACT(dow FROM make_date(year, month, day))::INTEGER AS dow,
        SUM(sales) AS daily_sales
      FROM store_day_summary
      ${where}
      GROUP BY store_id, date_key, year, month, day
      HAVING SUM(sales) > 0
    )
    SELECT
      store_id,
      dow,
      AVG(daily_sales) AS avg_sales,
      COUNT(*) AS day_count,
      STDDEV_POP(daily_sales) AS sales_stddev
    FROM daily
    GROUP BY store_id, dow
    ORDER BY store_id, dow`
  return queryToObjects<DowPatternRow>(conn, sql)
}

/**
 * 部門×日の売上トレンド
 *
 * 非取扱日（日次売上合計 = 0）は除外する。
 * 移動平均の窓に 0 が混入すると MA が実態より低くなるため。
 */
export async function queryDeptDailyTrend(
  conn: AsyncDuckDBConnection,
  params: FeatureFilterParams & { readonly deptCode?: string },
): Promise<readonly DeptDailyTrendRow[]> {
  const deptFilter = params.deptCode ? `AND dept_code = '${validateCode(params.deptCode)}'` : ''

  const where = buildTypedWhere([
    { type: 'dateRange', column: 'date_key', from: params.dateFrom, to: params.dateTo },
    { type: 'boolean', column: 'is_prev_year', value: false },
    { type: 'storeIds', storeIds: params.storeIds },
  ])

  const sql = `
    SELECT
      store_id,
      dept_code,
      dept_name,
      date_key,
      SUM(total_amount) AS daily_amount,
      AVG(SUM(total_amount)) OVER (
        PARTITION BY store_id, dept_code
        ORDER BY date_key
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
      ) AS dept_ma_7day
    FROM category_time_sales
    ${where}
    ${deptFilter}
    GROUP BY store_id, dept_code, dept_name, date_key
    HAVING SUM(total_amount) > 0
    ORDER BY store_id, dept_code, date_key`
  return queryToObjects<DeptDailyTrendRow>(conn, sql)
}
