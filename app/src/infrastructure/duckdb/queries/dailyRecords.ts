/**
 * dailyRecords クエリモジュール
 *
 * store_day_summary VIEW から日別明細を取得する。
 * DailyRecord (JS) の代替として、全チャートの日別データソースを提供する。
 *
 * 取得フィールド: 売上、原価、売変、移動、消耗品、客数（store_day_summary の全列）。
 * 予算データは budget テーブルから LEFT JOIN で取得。
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import { z } from 'zod'
import type { DateRange } from '@/domain/models/calendar'
import { dateRangeToKeys } from '@/domain/models/CalendarDate'
import { queryToObjects, buildTypedWhere } from '../queryRunner'
import type { WhereCondition } from '../queryRunner'

// ── 結果型 + Zod スキーマ ──

/** 日別明細行（store_day_summary の 1 行に予算を付加） */
export interface DailyRecordRow {
  readonly storeId: string
  readonly dateKey: string
  readonly year: number
  readonly month: number
  readonly day: number

  // ── 売上 ──
  readonly sales: number
  readonly coreSales: number
  readonly grossSales: number

  // ── 売変（個別 71-74 + 合計） ──
  readonly discount71: number
  readonly discount72: number
  readonly discount73: number
  readonly discount74: number
  readonly discountAmount: number
  readonly discountAbsolute: number

  // ── 仕入 ──
  readonly purchaseCost: number
  readonly purchasePrice: number

  // ── 移動 ──
  readonly interStoreInCost: number
  readonly interStoreInPrice: number
  readonly interStoreOutCost: number
  readonly interStoreOutPrice: number
  readonly interDeptInCost: number
  readonly interDeptInPrice: number
  readonly interDeptOutCost: number
  readonly interDeptOutPrice: number

  // ── 花・産直 ──
  readonly flowersCost: number
  readonly flowersPrice: number
  readonly directProduceCost: number
  readonly directProducePrice: number

  // ── 消耗品 ──
  readonly costInclusionCost: number

  // ── 客数 ──
  readonly customers: number

  // ── 予算 ──
  readonly budgetAmount: number
}

/** DailyRecordRow の Zod スキーマ（DEV 行検証用） */
export const DailyRecordRowSchema = z.object({
  storeId: z.string(),
  dateKey: z.string(),
  year: z.number(),
  month: z.number(),
  day: z.number(),
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
  budgetAmount: z.number(),
})

// ── 内部ヘルパー ──

function toWhereClause(
  dateRange: DateRange,
  storeIds?: ReadonlySet<string>,
  isPrevYear = false,
): string {
  const { fromKey, toKey } = dateRangeToKeys(dateRange)
  const storeIdArr = storeIds ? [...storeIds] : undefined
  const conditions: WhereCondition[] = [
    { type: 'dateRange', column: 'date_key', from: fromKey, to: toKey, alias: 's' },
    { type: 'boolean', column: 'is_prev_year', value: isPrevYear, alias: 's' },
    { type: 'storeIds', storeIds: storeIdArr, alias: 's' },
  ]
  return buildTypedWhere(conditions)
}

// ── クエリ関数 ──

/**
 * 日別明細を取得する。
 *
 * store_day_summary の全カラム + budget テーブルの日別予算を返す。
 * date_key ORDER BY でソート済み。
 */
export async function queryDailyRecords(
  conn: AsyncDuckDBConnection,
  dateRange: DateRange,
  storeIds?: ReadonlySet<string>,
): Promise<readonly DailyRecordRow[]> {
  const where = toWhereClause(dateRange, storeIds)

  const sql = `
    SELECT
      s.store_id,
      s.date_key,
      s.year,
      s.month,
      s.day,
      s.sales,
      s.core_sales,
      s.gross_sales,
      s.discount_71,
      s.discount_72,
      s.discount_73,
      s.discount_74,
      s.discount_amount,
      s.discount_absolute,
      s.purchase_cost,
      s.purchase_price,
      s.inter_store_in_cost,
      s.inter_store_in_price,
      s.inter_store_out_cost,
      s.inter_store_out_price,
      s.inter_dept_in_cost,
      s.inter_dept_in_price,
      s.inter_dept_out_cost,
      s.inter_dept_out_price,
      s.flowers_cost,
      s.flowers_price,
      s.direct_produce_cost,
      s.direct_produce_price,
      s.cost_inclusion_cost,
      s.customers,
      COALESCE(b.amount, 0) AS budget_amount
    FROM store_day_summary s
    LEFT JOIN budget b
      ON s.store_id = b.store_id
      AND s.year = b.year AND s.month = b.month AND s.day = b.day
    ${where}
    ORDER BY s.store_id, s.date_key
  `
  return queryToObjects<DailyRecordRow>(conn, sql, DailyRecordRowSchema)
}

/**
 * 前年日別明細を取得する。
 *
 * is_prev_year = TRUE のレコードを返す。
 * 前年比較チャート（DailySalesChart, YoYVarianceChart 等）で使用。
 */
export async function queryPrevYearDailyRecords(
  conn: AsyncDuckDBConnection,
  dateRange: DateRange,
  storeIds?: ReadonlySet<string>,
): Promise<readonly DailyRecordRow[]> {
  const where = toWhereClause(dateRange, storeIds, true)

  const sql = `
    SELECT
      s.store_id,
      s.date_key,
      s.year,
      s.month,
      s.day,
      s.sales,
      s.core_sales,
      s.gross_sales,
      s.discount_71,
      s.discount_72,
      s.discount_73,
      s.discount_74,
      s.discount_amount,
      s.discount_absolute,
      s.purchase_cost,
      s.purchase_price,
      s.inter_store_in_cost,
      s.inter_store_in_price,
      s.inter_store_out_cost,
      s.inter_store_out_price,
      s.inter_dept_in_cost,
      s.inter_dept_in_price,
      s.inter_dept_out_cost,
      s.inter_dept_out_price,
      s.flowers_cost,
      s.flowers_price,
      s.direct_produce_cost,
      s.direct_produce_price,
      s.cost_inclusion_cost,
      s.customers,
      0 AS budget_amount
    FROM store_day_summary s
    ${where}
    ORDER BY s.store_id, s.date_key
  `
  return queryToObjects<DailyRecordRow>(conn, sql, DailyRecordRowSchema)
}

/**
 * 日別集約明細（全店舗合算）を取得する。
 *
 * 複数店舗選択時に店舗をまたいで日別合算したデータを返す。
 * KPI 日別チャート（DailySalesChart 等）で使用。
 */
export async function queryAggregatedDailyRecords(
  conn: AsyncDuckDBConnection,
  dateRange: DateRange,
  storeIds?: ReadonlySet<string>,
): Promise<readonly DailyRecordRow[]> {
  const { fromKey, toKey } = dateRangeToKeys(dateRange)
  const storeIdArr = storeIds && storeIds.size > 0 ? [...storeIds] : undefined
  const where = buildTypedWhere([
    { type: 'dateRange', column: 'date_key', from: fromKey, to: toKey, alias: 's' },
    { type: 'boolean', column: 'is_prev_year', value: false, alias: 's' },
    { type: 'storeIds', storeIds: storeIdArr, alias: 's' },
  ])

  const sql = `
    SELECT
      'ALL' AS store_id,
      s.date_key,
      s.year,
      s.month,
      s.day,
      SUM(s.sales) AS sales,
      SUM(s.core_sales) AS core_sales,
      SUM(s.gross_sales) AS gross_sales,
      SUM(s.discount_71) AS discount_71,
      SUM(s.discount_72) AS discount_72,
      SUM(s.discount_73) AS discount_73,
      SUM(s.discount_74) AS discount_74,
      SUM(s.discount_amount) AS discount_amount,
      SUM(s.discount_absolute) AS discount_absolute,
      SUM(s.purchase_cost) AS purchase_cost,
      SUM(s.purchase_price) AS purchase_price,
      SUM(s.inter_store_in_cost) AS inter_store_in_cost,
      SUM(s.inter_store_in_price) AS inter_store_in_price,
      SUM(s.inter_store_out_cost) AS inter_store_out_cost,
      SUM(s.inter_store_out_price) AS inter_store_out_price,
      SUM(s.inter_dept_in_cost) AS inter_dept_in_cost,
      SUM(s.inter_dept_in_price) AS inter_dept_in_price,
      SUM(s.inter_dept_out_cost) AS inter_dept_out_cost,
      SUM(s.inter_dept_out_price) AS inter_dept_out_price,
      SUM(s.flowers_cost) AS flowers_cost,
      SUM(s.flowers_price) AS flowers_price,
      SUM(s.direct_produce_cost) AS direct_produce_cost,
      SUM(s.direct_produce_price) AS direct_produce_price,
      SUM(s.cost_inclusion_cost) AS cost_inclusion_cost,
      SUM(s.customers) AS customers,
      SUM(COALESCE(b.amount, 0)) AS budget_amount
    FROM store_day_summary s
    LEFT JOIN budget b
      ON s.store_id = b.store_id
      AND s.year = b.year AND s.month = b.month AND s.day = b.day
    ${where}
    GROUP BY s.date_key, s.year, s.month, s.day
    ORDER BY s.date_key
  `
  return queryToObjects<DailyRecordRow>(conn, sql, DailyRecordRowSchema)
}

/** DailyRecordRow から総仕入原価を算出（getDailyTotalCost の SQL 版） */
export function dailyRecordTotalCost(row: DailyRecordRow): number {
  return (
    row.purchaseCost +
    row.interStoreInCost +
    row.interStoreOutCost +
    row.interDeptInCost +
    row.interDeptOutCost +
    row.flowersCost +
    row.directProduceCost
  )
}
