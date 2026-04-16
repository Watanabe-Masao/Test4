/**
 * store_day_summary VIEW クエリモジュール
 *
 * classified_sales を基準に6テーブル LEFT JOIN した VIEW 経由で
 * store×day の結合済みサマリーデータを取得する。
 *
 * 自由日付範囲: date_key BETWEEN で月跨ぎに対応。
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import { z } from 'zod'
import { queryToObjects, queryScalar, buildTypedWhere } from '../queryRunner'
import type { WhereCondition } from '../queryRunner'
import type { DailyCumulativeRow } from './aggregates/dailyAggregation'
import { STORE_DAY_SUMMARY_VIEW_DDL } from '../schemas'

// ── 結果型 + Zod スキーマ ──

/** StoreDaySummaryRow の Zod スキーマ（DEV 行検証用） */
export const StoreDaySummaryRowSchema = z.object({
  year: z.number(),
  month: z.number(),
  day: z.number(),
  dateKey: z.string(),
  storeId: z.string(),
  sales: z.number(),
  coreSales: z.number(),
  grossSales: z.number(),
  discount71: z.number(),
  discount72: z.number(),
  discount73: z.number(),
  discount74: z.number(),
  discountAmount: z.number(),
  discountAbsolute: z.number(),
  purchaseCost: z.number(),
  purchasePrice: z.number(),
  interStoreInCost: z.number(),
  interStoreInPrice: z.number(),
  interStoreOutCost: z.number(),
  interStoreOutPrice: z.number(),
  interDeptInCost: z.number(),
  interDeptInPrice: z.number(),
  interDeptOutCost: z.number(),
  interDeptOutPrice: z.number(),
  flowersCost: z.number(),
  flowersPrice: z.number(),
  directProduceCost: z.number(),
  directProducePrice: z.number(),
  costInclusionCost: z.number(),
  customers: z.number(),
  totalQuantity: z.number(),
  isPrevYear: z.boolean(),
})

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
  const conditions: WhereCondition[] = [
    { type: 'dateRange', column: 'date_key', from: params.dateFrom, to: params.dateTo },
    { type: 'boolean', column: 'is_prev_year', value: params.isPrevYear ?? false },
    { type: 'storeIds', storeIds: params.storeIds },
  ]
  return buildTypedWhere(conditions)
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
  return queryToObjects<StoreDaySummaryRow>(conn, sql, StoreDaySummaryRowSchema)
}

// ── 客数クエリ（CustomerFact 用） ──

export const CustomerDailyRowSchema = z.object({
  storeId: z.string(),
  day: z.number(),
  customers: z.number(),
})

export interface CustomerDailyRow {
  readonly storeId: string
  readonly day: number
  readonly customers: number
}

/**
 * 店舗×日の客数を取得する（CustomerFact readModel 用）
 *
 * store_day_summary.customers は flowers JOIN 済みの値。
 * customers > 0 の行のみ返す（0 は導出側で補完）。
 *
 * @see references/01-principles/customer-definition.md
 */
export async function queryCustomerDaily(
  conn: AsyncDuckDBConnection,
  params: SummaryFilterParams,
): Promise<readonly CustomerDailyRow[]> {
  const where = summaryWhereClause(params)
  const sql = `
    SELECT store_id, day, customers
    FROM store_day_summary
    ${where}
    ORDER BY store_id, day`
  return queryToObjects<CustomerDailyRow>(conn, sql, CustomerDailyRowSchema)
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

/** materializeSummary の実行結果 */
export interface MaterializeResult {
  /** マテリアライズされた行数 */
  readonly rowCount: number
  /** CREATE TABLE AS SELECT の実行時間 (ms) */
  readonly createMs: number
  /** 全体の実行時間 (ms) */
  readonly totalMs: number
  /** スキップした場合 true（既にテーブルとして存在） */
  readonly skipped: boolean
}

/**
 * VIEW を実テーブルにマテリアライズする（パフォーマンス最適化用）。
 * VIEW へのクエリが遅い場合に呼ぶ。
 *
 * force=false（既定）: 既に TABLE として存在する場合はスキップ（OPFS リストア後等）。
 * force=true: 差分ロード後など、基底テーブル更新を反映するために再マテリアライズする。
 *   既存 TABLE を DROP → VIEW を再作成 → VIEW から新 TABLE を作成。
 *
 * DuckDB は DROP VIEW IF EXISTS でも対象が TABLE だとエラーになるため、
 * VIEW / TABLE の両方を try-catch で DROP してから RENAME する。
 */
export async function materializeSummary(
  conn: AsyncDuckDBConnection,
  force = false,
): Promise<MaterializeResult> {
  // 既に TABLE として存在するかチェック（OPFS 復元後など）
  const existingCount = await queryScalar<number>(
    conn,
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'store_day_summary' AND table_type = 'BASE TABLE'",
  )
  if (existingCount && existingCount > 0) {
    if (!force) {
      // 既にマテリアライズ済みかつ強制再構築不要 — スキップ
      const rowCount =
        (await queryScalar<number>(conn, 'SELECT COUNT(*) FROM store_day_summary')) ?? 0
      return { rowCount, createMs: 0, totalMs: 0, skipped: true }
    }
    // force=true: 既存 TABLE を DROP して VIEW を再作成し、再マテリアライズする
    await safeDropObject(conn, 'store_day_summary', 'TABLE')
    await conn.query(STORE_DAY_SUMMARY_VIEW_DDL)
  }

  const start = performance.now()
  // DEBUG: VIEW の行数を確認（マテリアライズ前）
  const viewCount = await queryScalar<number>(conn, 'SELECT COUNT(*) FROM store_day_summary')
  const prevYearCount = await queryScalar<number>(
    conn,
    'SELECT COUNT(*) FROM store_day_summary WHERE is_prev_year = TRUE',
  )
  console.info('[materializeSummary] pre-materialize view count:', {
    total: viewCount,
    prevYear: prevYearCount,
    csTotal: await queryScalar<number>(conn, 'SELECT COUNT(*) FROM classified_sales'),
    csPrevYear: await queryScalar<number>(
      conn,
      'SELECT COUNT(*) FROM classified_sales WHERE is_prev_year = TRUE',
    ),
  })
  await conn.query('CREATE TABLE store_day_summary_mat AS SELECT * FROM store_day_summary')
  const createMs = performance.now() - start

  // DuckDB は型不一致で IF EXISTS でもエラーになるため両方試す
  await safeDropObject(conn, 'store_day_summary', 'VIEW')
  await safeDropObject(conn, 'store_day_summary', 'TABLE')
  await conn.query('ALTER TABLE store_day_summary_mat RENAME TO store_day_summary')

  const totalMs = performance.now() - start
  const rowCount = (await queryScalar<number>(conn, 'SELECT COUNT(*) FROM store_day_summary')) ?? 0

  if (typeof console !== 'undefined') {
    console.debug(
      `[materializeSummary] ${rowCount} rows, CREATE: ${Math.round(createMs)}ms, total: ${Math.round(totalMs)}ms${force ? ' (force)' : ''}`,
    )
  }

  return { rowCount, createMs: Math.round(createMs), totalMs: Math.round(totalMs), skipped: false }
}

/** DuckDB の DROP ... IF EXISTS が型不一致でエラーになる問題を吸収 */
async function safeDropObject(
  conn: AsyncDuckDBConnection,
  name: string,
  type: 'VIEW' | 'TABLE',
): Promise<void> {
  try {
    await conn.query(`DROP ${type} IF EXISTS ${name}`)
  } catch (err) {
    // 型不一致（VIEW vs TABLE）の場合は無視
    console.warn('[duckdb] safeDropObject failed:', err)
  }
}
