/**
 * 予算分析クエリモジュール
 *
 * store_day_summary と budget テーブルを結合し、
 * 日別累積売上・予算の推移および予算達成率等の指標を SQL で算出する。
 *
 * 呼び出し側はドメイン型（DateRange, ReadonlySet<string>）を渡すだけでよい。
 * SQL パラメータへの変換は本モジュール内部で行う。
 *
 * @see budgetAnalysis.ts — このクエリが置き換える JS 計算
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models/calendar'
import { dateRangeToKeys } from '@/domain/models/CalendarDate'
import { queryToObjects, buildTypedWhere } from '../queryRunner'
import type { WhereCondition } from '../queryRunner'

// ── 結果型 ──

/** 日別累積売上・予算 */
export interface DailyCumulativeBudgetRow {
  readonly storeId: string
  readonly dateKey: string
  readonly day: number
  readonly dailySales: number
  readonly dailyBudget: number
  readonly cumulativeSales: number
  readonly cumulativeBudget: number
}

/** 店舗別予算分析サマリー */
export interface BudgetAnalysisSummaryRow {
  readonly storeId: string
  readonly totalSales: number
  readonly totalBudget: number
  readonly budgetAchievementRate: number
  readonly averageDailySales: number
  readonly salesDays: number
  readonly totalDays: number
}

// ── 内部ヘルパー ──

/** ドメイン型 → SQL WHERE 句変換（モジュール内部のみ） */
function toWhereClause(dateRange: DateRange, storeIds?: ReadonlySet<string>): string {
  const { fromKey, toKey } = dateRangeToKeys(dateRange)
  const storeIdArr = storeIds && storeIds.size > 0 ? [...storeIds] : undefined
  const conditions: WhereCondition[] = [
    { type: 'dateRange', column: 'date_key', from: fromKey, to: toKey, alias: 's' },
    { type: 'boolean', column: 'is_prev_year', value: false, alias: 's' },
    { type: 'storeIds', storeIds: storeIdArr, alias: 's' },
  ]
  return buildTypedWhere(conditions)
}

// ── クエリ関数 ──

/**
 * 日別累積売上・予算を取得する
 *
 * store_day_summary と budget を LEFT JOIN し、
 * ウィンドウ関数で日別累積を算出する。
 */
export async function queryDailyCumulativeBudget(
  conn: AsyncDuckDBConnection,
  dateRange: DateRange,
  storeIds?: ReadonlySet<string>,
): Promise<readonly DailyCumulativeBudgetRow[]> {
  const sWhere = toWhereClause(dateRange, storeIds)

  const sql = `
    WITH daily AS (
      SELECT
        s.store_id,
        s.date_key,
        s.day,
        SUM(s.sales) AS daily_sales,
        COALESCE(b.amount, 0) AS daily_budget
      FROM store_day_summary s
      LEFT JOIN budget b
        ON s.store_id = b.store_id
        AND s.year = b.year AND s.month = b.month AND s.day = b.day
      ${sWhere}
      GROUP BY s.store_id, s.date_key, s.day, b.amount
    )
    SELECT
      store_id,
      date_key,
      day,
      daily_sales,
      daily_budget,
      SUM(daily_sales) OVER (
        PARTITION BY store_id ORDER BY date_key
      ) AS cumulative_sales,
      SUM(daily_budget) OVER (
        PARTITION BY store_id ORDER BY date_key
      ) AS cumulative_budget
    FROM daily
    ORDER BY store_id, date_key`

  return queryToObjects<DailyCumulativeBudgetRow>(conn, sql)
}

/**
 * 店舗別予算分析サマリーを取得する
 *
 * 予算達成率・日平均売上等を SQL で算出する。
 * projectedSales 等はフック側で elapsedDays/daysInMonth を使って計算する
 * （これらはカレンダー情報であり SQL テーブルに含まれないため）。
 */
export async function queryBudgetAnalysisSummary(
  conn: AsyncDuckDBConnection,
  dateRange: DateRange,
  storeIds?: ReadonlySet<string>,
): Promise<readonly BudgetAnalysisSummaryRow[]> {
  const sWhere = toWhereClause(dateRange, storeIds)

  const sql = `
    SELECT
      s.store_id,
      COALESCE(SUM(s.sales), 0) AS total_sales,
      COALESCE(SUM(b.amount), 0) AS total_budget,
      CASE WHEN COALESCE(SUM(b.amount), 0) > 0
        THEN COALESCE(SUM(s.sales), 0) / SUM(b.amount)
        ELSE 0 END AS budget_achievement_rate,
      CASE WHEN COUNT(DISTINCT CASE WHEN s.sales > 0 THEN s.date_key END) > 0
        THEN COALESCE(SUM(s.sales), 0) * 1.0
             / COUNT(DISTINCT CASE WHEN s.sales > 0 THEN s.date_key END)
        ELSE 0 END AS average_daily_sales,
      COUNT(DISTINCT CASE WHEN s.sales > 0 THEN s.date_key END) AS sales_days,
      COUNT(DISTINCT s.date_key) AS total_days
    FROM store_day_summary s
    LEFT JOIN budget b
      ON s.store_id = b.store_id
      AND s.year = b.year AND s.month = b.month AND s.day = b.day
    ${sWhere}
    GROUP BY s.store_id
    ORDER BY s.store_id`

  return queryToObjects<BudgetAnalysisSummaryRow>(conn, sql)
}
