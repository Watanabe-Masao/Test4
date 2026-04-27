/**
 * 日別売上集約クエリ（DuckDB SQL 版）
 *
 * ## 責務
 * store_day_summary VIEW から日別売上を GROUP BY 集約し、
 * 累積合計をウィンドウ関数で算出する。
 *
 * ## 権威性
 * - 役割: aggregate-source（集約素材の提供）
 * - 実装責務: SQL（DuckDB）
 * - 権威性: exploratory — 正式値の最終判定は TS 側が担う
 *
 * ## 入力スキーマ
 * store_day_summary VIEW（date_key, store_id, sales 等 45 フィールド）
 * フィルタ: date_key BETWEEN, is_prev_year, store_id IN
 *
 * ## 出力スキーマ
 * DailyCumulativeRow { dateKey, dailySales, cumulativeSales }
 * - dailySales: 全店合計の日別売上（SUM(sales) GROUP BY date_key）
 * - cumulativeSales: date_key 順の累積合計（SUM OVER ORDER BY）
 *
 * ## TS 側の責務
 * SQL 結果を受け取り、以下の意味づけのみ担当:
 * - null/空結果の解釈（データ未ロード vs 売上ゼロ）
 * - DailyCumulativeRow → チャート ViewModel への変換
 *
 * @responsibility R:unclassified
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import { z } from 'zod'
import { queryToObjects, buildTypedWhere } from '../../queryRunner'
import type { WhereCondition } from '../../queryRunner'

// ── 結果型 ──

/** 日別累積売上行 */
export interface DailyCumulativeRow {
  readonly dateKey: string
  readonly dailySales: number
  readonly cumulativeSales: number
}

export const DailyCumulativeRowSchema = z.object({
  dateKey: z.string(),
  dailySales: z.number(),
  cumulativeSales: z.number(),
})

// ── フィルタ条件 ──

export interface DailyAggregationParams {
  readonly dateFrom: string
  readonly dateTo: string
  readonly storeIds?: readonly string[]
  readonly isPrevYear?: boolean
}

// ── クエリ関数 ──

/**
 * 日別累積売上を SQL で集約する
 *
 * SQL:
 *   SELECT date_key,
 *          SUM(sales) AS daily_sales,
 *          SUM(SUM(sales)) OVER (ORDER BY date_key) AS cumulative_sales
 *   FROM store_day_summary
 *   WHERE ...
 *   GROUP BY date_key
 *   ORDER BY date_key
 *
 * 以前は TS の aggregateByDay() + cumulativeSum() で行っていた集約を
 * DuckDB の GROUP BY + ウィンドウ関数に移管。
 */
export async function queryDailyCumulativeAggregation(
  conn: AsyncDuckDBConnection,
  params: DailyAggregationParams,
): Promise<readonly DailyCumulativeRow[]> {
  const conditions: WhereCondition[] = [
    { type: 'dateRange', column: 'date_key', from: params.dateFrom, to: params.dateTo },
    { type: 'boolean', column: 'is_prev_year', value: params.isPrevYear ?? false },
    { type: 'storeIds', storeIds: params.storeIds },
  ]

  const where = buildTypedWhere(conditions)

  const sql = `
    SELECT
      date_key,
      SUM(sales) AS daily_sales,
      SUM(SUM(sales)) OVER (ORDER BY date_key) AS cumulative_sales
    FROM store_day_summary
    ${where}
    GROUP BY date_key
    ORDER BY date_key`

  return queryToObjects<DailyCumulativeRow>(conn, sql, DailyCumulativeRowSchema)
}

// ── 日別点数クエリ ──

/** 日別点数行 */
export interface DailyQuantityRow {
  readonly dateKey: string
  readonly dailyQuantity: number
}

export const DailyQuantityRowSchema = z.object({
  dateKey: z.string(),
  dailyQuantity: z.number(),
})

/**
 * 日別の買上点数を SQL で集約する
 *
 * store_day_summary.total_quantity（category_time_sales 由来）を
 * date_key で GROUP BY し、全店合計の日別点数を返す。
 */
export async function queryDailyQuantity(
  conn: AsyncDuckDBConnection,
  params: DailyAggregationParams,
): Promise<readonly DailyQuantityRow[]> {
  const where = buildTypedWhere([
    { type: 'dateRange', column: 'date_key', from: params.dateFrom, to: params.dateTo },
    { type: 'boolean', column: 'is_prev_year', value: params.isPrevYear ?? false },
    { type: 'storeIds', storeIds: params.storeIds },
  ])

  const sql = `
    SELECT
      date_key,
      SUM(total_quantity) AS daily_quantity
    FROM store_day_summary
    ${where}
    GROUP BY date_key
    ORDER BY date_key`

  return queryToObjects<DailyQuantityRow>(conn, sql, DailyQuantityRowSchema)
}
