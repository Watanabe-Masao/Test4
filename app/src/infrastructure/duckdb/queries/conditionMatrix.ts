/**
 * コンディションマトリクスクエリ
 *
 * 指定期間の店舗別メトリクスと、前年同期・前週同期・トレンド（前半/後半）のデータを
 * 一回の SQL クエリで取得する。
 *
 * 結果: 店舗ごとに { current, prevYear, prevWeek, trendRecent, trendPrior } の5期間分の集計値。
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import { z } from 'zod'
import type { DateRange } from '@/domain/models/calendar'
import { dateRangeToKeys } from '@/domain/models/CalendarDate'
import { queryToObjects, storeIdFilterWithAlias } from '../queryRunner'
import { validateDateKey } from '../queryParams'

/** 1期間・1店舗分の集約メトリクス */
export interface PeriodMetrics {
  readonly storeId: string
  readonly totalSales: number
  readonly totalCustomers: number
  readonly totalDiscount: number
  readonly grossSales: number
  readonly discountRate: number
  readonly totalCost: number
  readonly totalCostInclusion: number
  readonly costInclusionRate: number
  readonly totalQuantity: number
  readonly salesDays: number
}

/** 店舗×5期間のコンディションマトリクス行 */
export interface ConditionMatrixRow {
  readonly storeId: string
  // ── 当期 ──
  readonly curSales: number
  readonly curCustomers: number
  readonly curDiscount: number
  readonly curGrossSales: number
  readonly curDiscountRate: number
  readonly curTotalCost: number
  readonly curConsumable: number
  readonly curConsumableRate: number
  readonly curQuantity: number
  readonly curSalesDays: number
  // ── 前年同期 ──
  readonly pySales: number
  readonly pyCustomers: number
  readonly pyDiscount: number
  readonly pyGrossSales: number
  readonly pyDiscountRate: number
  readonly pyTotalCost: number
  readonly pyConsumable: number
  readonly pyConsumableRate: number
  readonly pyQuantity: number
  readonly pySalesDays: number
  // ── 前週同期 ──
  readonly pwSales: number
  readonly pwCustomers: number
  readonly pwDiscount: number
  readonly pwGrossSales: number
  readonly pwDiscountRate: number
  readonly pwTotalCost: number
  readonly pwConsumable: number
  readonly pwConsumableRate: number
  readonly pwQuantity: number
  readonly pwSalesDays: number
  // ── トレンド（後半） ──
  readonly trSales: number
  readonly trCustomers: number
  readonly trDiscount: number
  readonly trGrossSales: number
  readonly trDiscountRate: number
  readonly trTotalCost: number
  readonly trConsumable: number
  readonly trConsumableRate: number
  readonly trQuantity: number
  readonly trSalesDays: number
  // ── トレンド（前半） ──
  readonly tpSales: number
  readonly tpCustomers: number
  readonly tpDiscount: number
  readonly tpGrossSales: number
  readonly tpDiscountRate: number
  readonly tpTotalCost: number
  readonly tpConsumable: number
  readonly tpConsumableRate: number
  readonly tpQuantity: number
  readonly tpSalesDays: number
}

/** ConditionMatrixRow 用の Zod スキーマ（5期間×10メトリクス + storeId） */
export const ConditionMatrixRowSchema = z.object({
  storeId: z.string(),
  // ── 当期 ──
  curSales: z.number(),
  curCustomers: z.number(),
  curDiscount: z.number(),
  curGrossSales: z.number(),
  curDiscountRate: z.number(),
  curTotalCost: z.number(),
  curConsumable: z.number(),
  curConsumableRate: z.number(),
  curQuantity: z.number(),
  curSalesDays: z.number(),
  // ── 前年同期 ──
  pySales: z.number(),
  pyCustomers: z.number(),
  pyDiscount: z.number(),
  pyGrossSales: z.number(),
  pyDiscountRate: z.number(),
  pyTotalCost: z.number(),
  pyConsumable: z.number(),
  pyConsumableRate: z.number(),
  pyQuantity: z.number(),
  pySalesDays: z.number(),
  // ── 前週同期 ──
  pwSales: z.number(),
  pwCustomers: z.number(),
  pwDiscount: z.number(),
  pwGrossSales: z.number(),
  pwDiscountRate: z.number(),
  pwTotalCost: z.number(),
  pwConsumable: z.number(),
  pwConsumableRate: z.number(),
  pwQuantity: z.number(),
  pwSalesDays: z.number(),
  // ── トレンド（後半） ──
  trSales: z.number(),
  trCustomers: z.number(),
  trDiscount: z.number(),
  trGrossSales: z.number(),
  trDiscountRate: z.number(),
  trTotalCost: z.number(),
  trConsumable: z.number(),
  trConsumableRate: z.number(),
  trQuantity: z.number(),
  trSalesDays: z.number(),
  // ── トレンド（前半） ──
  tpSales: z.number(),
  tpCustomers: z.number(),
  tpDiscount: z.number(),
  tpGrossSales: z.number(),
  tpDiscountRate: z.number(),
  tpTotalCost: z.number(),
  tpConsumable: z.number(),
  tpConsumableRate: z.number(),
  tpQuantity: z.number(),
  tpSalesDays: z.number(),
})

/**
 * 条件付き集計列を生成するヘルパー。
 * 1回のテーブルスキャンで5期間分のメトリクスを CASE WHEN で分類集約する。
 */
function conditionalColumns(prefix: string, condition: string): string {
  const c = condition
  const costFields = [
    'purchase_cost',
    'flowers_cost',
    'direct_produce_cost',
    'inter_store_in_cost',
    'inter_store_out_cost',
    'inter_dept_in_cost',
    'inter_dept_out_cost',
  ] as const
  const costSum = costFields
    .map((f) => `COALESCE(SUM(CASE WHEN ${c} THEN s.${f} END), 0)`)
    .join('\n          + ')

  return `
    COALESCE(SUM(CASE WHEN ${c} THEN s.sales END), 0) AS ${prefix}_sales,
    COALESCE(SUM(CASE WHEN ${c} THEN s.customers END), 0) AS ${prefix}_customers,
    COALESCE(SUM(CASE WHEN ${c} THEN s.discount_absolute END), 0) AS ${prefix}_discount,
    COALESCE(SUM(CASE WHEN ${c} THEN s.sales END), 0)
      + COALESCE(SUM(CASE WHEN ${c} THEN s.discount_absolute END), 0)
      AS ${prefix}_gross_sales,
    CASE WHEN (COALESCE(SUM(CASE WHEN ${c} THEN s.sales END), 0)
             + COALESCE(SUM(CASE WHEN ${c} THEN s.discount_absolute END), 0)) > 0
      THEN COALESCE(SUM(CASE WHEN ${c} THEN s.discount_absolute END), 0)
         / (COALESCE(SUM(CASE WHEN ${c} THEN s.sales END), 0)
           + COALESCE(SUM(CASE WHEN ${c} THEN s.discount_absolute END), 0))
      ELSE 0 END AS ${prefix}_discount_rate,
    ${costSum} AS ${prefix}_total_cost,
    COALESCE(SUM(CASE WHEN ${c} THEN s.cost_inclusion_cost END), 0) AS ${prefix}_costInclusion,
    CASE WHEN COALESCE(SUM(CASE WHEN ${c} THEN s.sales END), 0) > 0
      THEN COALESCE(SUM(CASE WHEN ${c} THEN s.cost_inclusion_cost END), 0)
         / COALESCE(SUM(CASE WHEN ${c} THEN s.sales END), 0)
      ELSE 0 END AS ${prefix}_cost_inclusion_rate,
    COALESCE(SUM(CASE WHEN ${c} THEN s.total_quantity END), 0) AS ${prefix}_quantity,
    COUNT(DISTINCT CASE WHEN ${c} AND s.sales > 0 THEN s.date_key END) AS ${prefix}_sales_days`
}

/** Date → YYYY-MM-DD DateKey 文字列 */
function formatDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * 期間の中間日（DateKey）を算出する。
 * fromKey と toKey の間の日数を半分にした日を返す。
 */
export function computeMidDateKey(fromKey: string, toKey: string): string {
  const from = new Date(fromKey)
  const to = new Date(toKey)
  const totalMs = to.getTime() - from.getTime()
  const midMs = from.getTime() + Math.floor(totalMs / 2)
  const mid = new Date(midMs)
  const y = mid.getFullYear()
  const m = String(mid.getMonth() + 1).padStart(2, '0')
  const d = String(mid.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * コンディションマトリクスデータを取得する
 *
 * 指定日付範囲に対し、5期間のメトリクスを1回のテーブルスキャンで返す:
 * - 当期 (cur): 指定範囲全体
 * - 前年同期 (py): is_prev_year = TRUE
 * - 前週同期 (pw): 7日前シフト
 * - トレンド後半 (tr): 指定範囲の後半
 * - トレンド前半 (tp): 指定範囲の前半
 *
 * 最適化: 5つの CTE（各々がテーブルを独立スキャン）ではなく、
 * 条件付き集計（CASE WHEN）を使い store_day_summary を1回だけスキャンする。
 */
export async function queryConditionMatrix(
  conn: AsyncDuckDBConnection,
  dateRange: DateRange,
  storeIds?: ReadonlySet<string>,
): Promise<readonly ConditionMatrixRow[]> {
  const { fromKey: rawFrom, toKey: rawTo } = dateRangeToKeys(dateRange)
  const fromKey = validateDateKey(rawFrom)
  const toKey = validateDateKey(rawTo)
  const storeCondition = storeIdFilterWithAlias(
    storeIds && storeIds.size > 0 ? [...storeIds] : undefined,
    's',
  )
  const storeWhere = storeCondition ? ` AND ${storeCondition}` : ''

  // 中間日を計算
  const midKey = validateDateKey(computeMidDateKey(fromKey, toKey))
  const midDate = new Date(midKey)
  midDate.setDate(midDate.getDate() + 1)
  const midNextKey = validateDateKey(
    `${midDate.getFullYear()}-${String(midDate.getMonth() + 1).padStart(2, '0')}-${String(midDate.getDate()).padStart(2, '0')}`,
  )

  // 前週シフト用の日付範囲を JS で事前計算
  // SQL の CAST(date_key AS DATE) は無効な date_key（例: 2025-02-32）でエラーになるため回避
  const pwFromDate = new Date(fromKey)
  pwFromDate.setDate(pwFromDate.getDate() - 7)
  const pwToDate = new Date(toKey)
  pwToDate.setDate(pwToDate.getDate() - 7)
  const pwFromKey = validateDateKey(formatDateKey(pwFromDate))
  const pwToKey = validateDateKey(formatDateKey(pwToDate))
  const pwDateCondition = `s.date_key BETWEEN '${pwFromKey}' AND '${pwToKey}'`

  // 各期間の分類条件
  const curCond = `s.date_key BETWEEN '${fromKey}' AND '${toKey}' AND s.is_prev_year = FALSE`
  const pyCond = `s.date_key BETWEEN '${fromKey}' AND '${toKey}' AND s.is_prev_year = TRUE`
  const pwCond = `${pwDateCondition} AND s.is_prev_year = FALSE`
  const trCond = `s.date_key BETWEEN '${midNextKey}' AND '${toKey}' AND s.is_prev_year = FALSE`
  const tpCond = `s.date_key BETWEEN '${fromKey}' AND '${midKey}' AND s.is_prev_year = FALSE`

  const sql = `
    SELECT
      s.store_id,
      -- 当期
      ${conditionalColumns('cur', curCond)},
      -- 前年同期
      ${conditionalColumns('py', pyCond)},
      -- 前週同期
      ${conditionalColumns('pw', pwCond)},
      -- トレンド後半
      ${conditionalColumns('tr', trCond)},
      -- トレンド前半
      ${conditionalColumns('tp', tpCond)}
    FROM store_day_summary s
    WHERE (
      s.date_key BETWEEN '${fromKey}' AND '${toKey}'
      OR (${pwDateCondition} AND s.is_prev_year = FALSE)
    )${storeWhere}
    GROUP BY s.store_id
    ORDER BY s.store_id
  `

  return queryToObjects<ConditionMatrixRow>(conn, sql, ConditionMatrixRowSchema)
}
