/**
 * 店舗別売上集約クエリ（DuckDB SQL 版）
 *
 * ## 責務
 * store_day_summary VIEW から店舗別に売上・仕入・売変・客数を GROUP BY 集約する。
 *
 * ## 権威性
 * - 役割: aggregate-source（集約素材の提供）
 * - 実装責務: SQL（DuckDB）
 * - 権威性: exploratory — 正式値の最終判定は TS 側が担う
 *
 * ## 入力スキーマ
 * store_day_summary VIEW（store_id, sales, purchase_cost, discount_absolute, customers 等）
 * フィルタ: date_key BETWEEN, is_prev_year, store_id IN
 *
 * ## 出力スキーマ
 * StoreAggregationRow {
 *   storeId, totalSales, totalCoreSales, totalPurchaseCost,
 *   totalDiscountAbsolute, discountRate, totalFlowersCost,
 *   totalDirectProduceCost, totalCostInclusionCost, totalCustomers,
 *   salesDays
 * }
 *
 * ## TS 側の責務
 * SQL 結果を受け取り、以下の意味づけのみ担当:
 * - StoreAggregationRow → StoreResult への合成
 * - weightedAverageBySales 等の最終採用ルール適用
 * - warning / status 判定
 *
 * @responsibility R:unclassified
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import { z } from 'zod'
import { queryToObjects, buildTypedWhere } from '../../queryRunner'
import type { WhereCondition } from '../../queryRunner'

// ── 結果型 ──

/** 店舗別集約行 */
export interface StoreAggregationRow {
  readonly storeId: string
  readonly totalSales: number
  readonly totalCoreSales: number
  readonly totalPurchaseCost: number
  readonly totalDiscountAbsolute: number
  readonly discountRate: number
  readonly totalFlowersCost: number
  readonly totalDirectProduceCost: number
  readonly totalCostInclusionCost: number
  readonly totalCustomers: number
  readonly salesDays: number
}

export const StoreAggregationRowSchema = z.object({
  storeId: z.string(),
  totalSales: z.number(),
  totalCoreSales: z.number(),
  totalPurchaseCost: z.number(),
  totalDiscountAbsolute: z.number(),
  discountRate: z.number(),
  totalFlowersCost: z.number(),
  totalDirectProduceCost: z.number(),
  totalCostInclusionCost: z.number(),
  totalCustomers: z.number(),
  salesDays: z.number(),
})

// ── フィルタ条件 ──

export interface StoreAggregationParams {
  readonly dateFrom: string
  readonly dateTo: string
  readonly storeIds?: readonly string[]
  readonly isPrevYear?: boolean
}

// ── クエリ関数 ──

/**
 * 店舗別売上集約を SQL で実行する
 *
 * SQL:
 *   SELECT store_id,
 *          SUM(sales) AS total_sales,
 *          SUM(core_sales) AS total_core_sales,
 *          SUM(purchase_cost) AS total_purchase_cost,
 *          SUM(discount_absolute) AS total_discount_absolute,
 *          CASE WHEN SUM(sales) > 0
 *            THEN SUM(discount_absolute) / SUM(sales)
 *            ELSE 0 END AS discount_rate,
 *          SUM(flowers_cost) AS total_flowers_cost,
 *          SUM(direct_produce_cost) AS total_direct_produce_cost,
 *          SUM(cost_inclusion_cost) AS total_cost_inclusion_cost,
 *          SUM(customers) AS total_customers,
 *          COUNT(DISTINCT date_key) AS sales_days
 *   FROM store_day_summary
 *   WHERE ...
 *   GROUP BY store_id
 *   ORDER BY store_id
 *
 * 以前は TS の aggregatePeriodRates() で行っていた店舗別集約を
 * DuckDB の GROUP BY に移管。
 */
export async function queryStoreAggregation(
  conn: AsyncDuckDBConnection,
  params: StoreAggregationParams,
): Promise<readonly StoreAggregationRow[]> {
  const conditions: WhereCondition[] = [
    { type: 'dateRange', column: 'date_key', from: params.dateFrom, to: params.dateTo },
    { type: 'boolean', column: 'is_prev_year', value: params.isPrevYear ?? false },
    { type: 'storeIds', storeIds: params.storeIds },
  ]

  const where = buildTypedWhere(conditions)

  const sql = `
    SELECT
      store_id,
      COALESCE(SUM(sales), 0) AS total_sales,
      COALESCE(SUM(core_sales), 0) AS total_core_sales,
      COALESCE(SUM(purchase_cost), 0) AS total_purchase_cost,
      COALESCE(SUM(discount_absolute), 0) AS total_discount_absolute,
      CASE WHEN SUM(sales) > 0
        THEN SUM(discount_absolute) / SUM(sales)
        ELSE 0 END AS discount_rate,
      COALESCE(SUM(flowers_cost), 0) AS total_flowers_cost,
      COALESCE(SUM(direct_produce_cost), 0) AS total_direct_produce_cost,
      COALESCE(SUM(cost_inclusion_cost), 0) AS total_cost_inclusion_cost,
      COALESCE(SUM(customers), 0) AS total_customers,
      COUNT(DISTINCT date_key) AS sales_days
    FROM store_day_summary
    ${where}
    GROUP BY store_id
    ORDER BY store_id`

  return queryToObjects<StoreAggregationRow>(conn, sql, StoreAggregationRowSchema)
}

/**
 * 全店集約サマリーを SQL で実行する
 *
 * 店舗別ではなく全体の集約結果を返す。
 * queryAggregatedRates() の SQL 版として機能する。
 */
export async function queryStoreAggregationSummary(
  conn: AsyncDuckDBConnection,
  params: StoreAggregationParams,
): Promise<StoreAggregationRow | null> {
  const where = buildTypedWhere([
    { type: 'dateRange', column: 'date_key', from: params.dateFrom, to: params.dateTo },
    { type: 'boolean', column: 'is_prev_year', value: params.isPrevYear ?? false },
    { type: 'storeIds', storeIds: params.storeIds },
  ])

  const sql = `
    SELECT
      'all' AS store_id,
      COALESCE(SUM(sales), 0) AS total_sales,
      COALESCE(SUM(core_sales), 0) AS total_core_sales,
      COALESCE(SUM(purchase_cost), 0) AS total_purchase_cost,
      COALESCE(SUM(discount_absolute), 0) AS total_discount_absolute,
      CASE WHEN SUM(sales) > 0
        THEN SUM(discount_absolute) / SUM(sales)
        ELSE 0 END AS discount_rate,
      COALESCE(SUM(flowers_cost), 0) AS total_flowers_cost,
      COALESCE(SUM(direct_produce_cost), 0) AS total_direct_produce_cost,
      COALESCE(SUM(cost_inclusion_cost), 0) AS total_cost_inclusion_cost,
      COALESCE(SUM(customers), 0) AS total_customers,
      COUNT(DISTINCT date_key) AS sales_days
    FROM store_day_summary
    ${where}`

  const rows = await queryToObjects<StoreAggregationRow>(conn, sql, StoreAggregationRowSchema)
  return rows.length > 0 ? rows[0] : null
}
