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
import type { DailyCumulativeRow } from './aggregates/dailyAggregation'

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
  readonly costInclusionCost: number
  readonly customers: number
  readonly totalQuantity: number
  readonly isPrevYear: boolean
}

export interface AggregatedRatesRow {
  readonly totalSales: number
  readonly totalPurchaseCost: number
  readonly totalDiscountAbsolute: number
  readonly discountRate: number
  readonly totalFlowersCost: number
  readonly totalDirectProduceCost: number
  readonly totalCostInclusionAmount: number
  readonly totalCustomers: number
  readonly totalQuantity: number
}

// DailyCumulativeRow は aggregates/dailyAggregation.ts に移管。後方互換 re-export。
export type { DailyCumulativeRow } from './aggregates/dailyAggregation'

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
      COALESCE(SUM(cost_inclusion_cost), 0) AS total_cost_inclusion_cost,
      COALESCE(SUM(customers), 0) AS total_customers,
      COALESCE(SUM(total_quantity), 0) AS total_quantity
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
 *
 * DuckDB は DROP VIEW IF EXISTS でも対象が TABLE だとエラーになるため、
 * VIEW / TABLE の両方を try-catch で DROP してから RENAME する。
 */
export async function materializeSummary(conn: AsyncDuckDBConnection): Promise<void> {
  await conn.query('CREATE TABLE store_day_summary_mat AS SELECT * FROM store_day_summary')
  // DuckDB は型不一致で IF EXISTS でもエラーになるため両方試す
  await safeDropObject(conn, 'store_day_summary', 'VIEW')
  await safeDropObject(conn, 'store_day_summary', 'TABLE')
  await conn.query('ALTER TABLE store_day_summary_mat RENAME TO store_day_summary')
}

/** DuckDB の DROP ... IF EXISTS が型不一致でエラーになる問題を吸収 */
async function safeDropObject(
  conn: AsyncDuckDBConnection,
  name: string,
  type: 'VIEW' | 'TABLE',
): Promise<void> {
  try {
    await conn.query(`DROP ${type} IF EXISTS ${name}`)
  } catch {
    // 型不一致（VIEW vs TABLE）の場合は無視
  }
}
