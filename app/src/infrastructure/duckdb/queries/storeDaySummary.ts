/**
 * store_day_summary VIEW クエリモジュール
 *
 * classified_sales を基準に6テーブル LEFT JOIN した VIEW 経由で
 * store×day の結合済みサマリーデータを取得する。
 *
 * 自由日付範囲: date_key BETWEEN で月跨ぎに対応。
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import { queryToObjects, buildWhereClause, storeIdFilter } from '../queryRunner'
import { validateDateKey } from '../queryParams'
import { MATERIALIZE_SUMMARY_DDL } from '../schemas'

// ── 結果型 ──

export interface StoreDaySummaryRow {
  readonly year: number
  readonly month: number
  readonly day: number
  readonly dateKey: string
  readonly storeId: string
  readonly sales: number
  readonly coreSales: number
  readonly grossSales: number
  readonly discount71: number
  readonly discount72: number
  readonly discount73: number
  readonly discount74: number
  readonly discountAmount: number
  readonly discountAbsolute: number
  readonly purchaseCost: number
  readonly purchasePrice: number
  readonly interStoreInCost: number
  readonly interStoreInPrice: number
  readonly interStoreOutCost: number
  readonly interStoreOutPrice: number
  readonly interDeptInCost: number
  readonly interDeptInPrice: number
  readonly interDeptOutCost: number
  readonly interDeptOutPrice: number
  readonly flowersCost: number
  readonly flowersPrice: number
  readonly directProduceCost: number
  readonly directProducePrice: number
  readonly consumableCost: number
  readonly customers: number
  readonly isPrevYear: boolean
}

export interface AggregatedRatesRow {
  readonly totalSales: number
  readonly totalPurchaseCost: number
  readonly totalDiscountAbsolute: number
  readonly discountRate: number
  readonly totalFlowersCost: number
  readonly totalDirectProduceCost: number
  readonly totalConsumableCost: number
  readonly totalCustomers: number
}

export interface DailyCumulativeRow {
  readonly dateKey: string
  readonly dailySales: number
  readonly cumulativeSales: number
}

// ── フィルタ条件 ──

interface SummaryFilterParams {
  readonly dateFrom: string
  readonly dateTo: string
  readonly storeIds?: readonly string[]
  readonly isPrevYear?: boolean
}

function summaryWhereClause(params: SummaryFilterParams): string {
  const dateFrom = validateDateKey(params.dateFrom)
  const dateTo = validateDateKey(params.dateTo)
  return buildWhereClause([
    `date_key BETWEEN '${dateFrom}' AND '${dateTo}'`,
    `is_prev_year = ${params.isPrevYear ?? false}`,
    storeIdFilter(params.storeIds),
  ])
}

// ── クエリ関数 ──

/**
 * 店舗×日サマリーの一覧取得（自由日付範囲対応）
 */
export async function queryStoreDaySummary(
  conn: AsyncDuckDBConnection,
  params: SummaryFilterParams,
): Promise<readonly StoreDaySummaryRow[]> {
  const where = summaryWhereClause(params)
  const sql = `
    SELECT * FROM store_day_summary
    ${where}
    ORDER BY store_id, date_key`
  return queryToObjects<StoreDaySummaryRow>(conn, sql)
}

/**
 * 期間集約レート（売上合計・仕入合計・売変率等）
 */
export async function queryAggregatedRates(
  conn: AsyncDuckDBConnection,
  params: SummaryFilterParams,
): Promise<AggregatedRatesRow | null> {
  const where = summaryWhereClause(params)
  const sql = `
    SELECT
      COALESCE(SUM(sales), 0) AS total_sales,
      COALESCE(SUM(purchase_cost), 0) AS total_purchase_cost,
      COALESCE(SUM(discount_absolute), 0) AS total_discount_absolute,
      CASE WHEN SUM(sales) > 0
        THEN SUM(discount_absolute) / SUM(sales)
        ELSE 0 END AS discount_rate,
      COALESCE(SUM(flowers_cost), 0) AS total_flowers_cost,
      COALESCE(SUM(direct_produce_cost), 0) AS total_direct_produce_cost,
      COALESCE(SUM(consumable_cost), 0) AS total_consumable_cost,
      COALESCE(SUM(customers), 0) AS total_customers
    FROM store_day_summary
    ${where}`
  const rows = await queryToObjects<AggregatedRatesRow>(conn, sql)
  return rows.length > 0 ? rows[0] : null
}

/**
 * 日別累積売上（月跨ぎで date_key 順に連続）
 */
export async function queryDailyCumulative(
  conn: AsyncDuckDBConnection,
  params: SummaryFilterParams,
): Promise<readonly DailyCumulativeRow[]> {
  const where = summaryWhereClause(params)
  const sql = `
    SELECT
      date_key,
      SUM(sales) AS daily_sales,
      SUM(SUM(sales)) OVER (ORDER BY date_key) AS cumulative_sales
    FROM store_day_summary
    ${where}
    GROUP BY date_key
    ORDER BY date_key`
  return queryToObjects<DailyCumulativeRow>(conn, sql)
}

/**
 * VIEW を実テーブルにマテリアライズする（パフォーマンス最適化用）。
 * VIEW へのクエリが遅い場合に呼ぶ。
 */
export async function materializeSummary(conn: AsyncDuckDBConnection): Promise<void> {
  const stmts = MATERIALIZE_SUMMARY_DDL.split(';').filter((s) => s.trim())
  for (const stmt of stmts) {
    await conn.query(stmt)
  }
}
