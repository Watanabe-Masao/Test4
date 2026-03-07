/**
 * コンディションマトリクスクエリ
 *
 * 指定期間の店舗別メトリクスと、前年同期・前週同期・トレンド（前半/後半）のデータを
 * 一回の SQL クエリで取得する。
 *
 * 結果: 店舗ごとに { current, prevYear, prevWeek, trendRecent, trendPrior } の5期間分の集計値。
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import { dateRangeToKeys } from '@/domain/models/CalendarDate'
import { queryToObjects, storeIdFilterWithAlias } from '../queryRunner'

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

/** DuckDB 日付演算用の内部 SQL ヘルパー */
function dateKeyShiftSql(fromKey: string, toKey: string, days: number): string {
  return `
    CAST(REPLACE(s.date_key, '/', '-') AS DATE)
      BETWEEN CAST(REPLACE('${fromKey}', '/', '-') AS DATE) - INTERVAL '${days}' DAY
          AND CAST(REPLACE('${toKey}', '/', '-') AS DATE) - INTERVAL '${days}' DAY
  `
}

function aggregateCte(alias: string, whereClause: string): string {
  return `
    ${alias} AS (
      SELECT
        s.store_id,
        COALESCE(SUM(s.sales), 0) AS total_sales,
        COALESCE(SUM(s.customers), 0) AS total_customers,
        COALESCE(SUM(s.discount_absolute), 0) AS total_discount,
        COALESCE(SUM(s.sales) + SUM(s.discount_absolute), 0) AS gross_sales,
        CASE WHEN (COALESCE(SUM(s.sales), 0) + COALESCE(SUM(s.discount_absolute), 0)) > 0
          THEN COALESCE(SUM(s.discount_absolute), 0)
               / (COALESCE(SUM(s.sales), 0) + COALESCE(SUM(s.discount_absolute), 0))
          ELSE 0 END AS discount_rate,
        COALESCE(SUM(s.purchase_cost), 0)
          + COALESCE(SUM(s.flowers_cost), 0) + COALESCE(SUM(s.direct_produce_cost), 0)
          + COALESCE(SUM(s.inter_store_in_cost), 0) + COALESCE(SUM(s.inter_store_out_cost), 0)
          + COALESCE(SUM(s.inter_dept_in_cost), 0) + COALESCE(SUM(s.inter_dept_out_cost), 0)
          AS total_cost,
        COALESCE(SUM(s.cost_inclusion_cost), 0) AS total_cost_inclusion,
        CASE WHEN COALESCE(SUM(s.sales), 0) > 0
          THEN COALESCE(SUM(s.cost_inclusion_cost), 0) / COALESCE(SUM(s.sales), 0)
          ELSE 0 END AS cost_inclusion_rate,
        COALESCE(SUM(s.total_quantity), 0) AS total_quantity,
        COUNT(DISTINCT CASE WHEN s.sales > 0 THEN s.date_key END) AS sales_days
      FROM store_day_summary s
      WHERE ${whereClause}
      GROUP BY s.store_id
    )`
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
 * 指定日付範囲に対し、5期間のメトリクスを1回のクエリで返す:
 * - 当期 (cur): 指定範囲全体
 * - 前年同期 (py): is_prev_year = TRUE
 * - 前週同期 (pw): 7日前シフト
 * - トレンド後半 (tr): 指定範囲の後半
 * - トレンド前半 (tp): 指定範囲の前半
 */
export async function queryConditionMatrix(
  conn: AsyncDuckDBConnection,
  dateRange: DateRange,
  storeIds?: ReadonlySet<string>,
): Promise<readonly ConditionMatrixRow[]> {
  const { fromKey, toKey } = dateRangeToKeys(dateRange)
  const storeCondition = storeIdFilterWithAlias(
    storeIds && storeIds.size > 0 ? [...storeIds] : undefined,
    's',
  )
  const storeWhere = storeCondition ? ` AND ${storeCondition}` : ''

  // 中間日を計算
  const midKey = computeMidDateKey(fromKey, toKey)
  const midDate = new Date(midKey)
  midDate.setDate(midDate.getDate() + 1)
  const midNextKey = `${midDate.getFullYear()}-${String(midDate.getMonth() + 1).padStart(2, '0')}-${String(midDate.getDate()).padStart(2, '0')}`

  // 当期: is_prev_year = FALSE, 指定範囲
  const curWhere = `s.date_key BETWEEN '${fromKey}' AND '${toKey}' AND s.is_prev_year = FALSE${storeWhere}`

  // 前年同期: is_prev_year = TRUE
  const pyWhere = `s.date_key BETWEEN '${fromKey}' AND '${toKey}' AND s.is_prev_year = TRUE${storeWhere}`

  // 前週同期: 7日前シフト
  const pwWhere = `${dateKeyShiftSql(fromKey, toKey, 7)} AND s.is_prev_year = FALSE${storeWhere}`

  // トレンド後半: 期間の後半
  const trWhere = `s.date_key BETWEEN '${midNextKey}' AND '${toKey}' AND s.is_prev_year = FALSE${storeWhere}`

  // トレンド前半: 期間の前半
  const tpWhere = `s.date_key BETWEEN '${fromKey}' AND '${midKey}' AND s.is_prev_year = FALSE${storeWhere}`

  const sql = `
    WITH
    ${aggregateCte('cur', curWhere)},
    ${aggregateCte('py', pyWhere)},
    ${aggregateCte('pw', pwWhere)},
    ${aggregateCte('tr', trWhere)},
    ${aggregateCte('tp', tpWhere)}
    SELECT
      c.store_id,
      -- 当期
      c.total_sales      AS cur_sales,
      c.total_customers   AS cur_customers,
      c.total_discount    AS cur_discount,
      c.gross_sales       AS cur_gross_sales,
      c.discount_rate     AS cur_discount_rate,
      c.total_cost        AS cur_total_cost,
      c.total_cost_inclusion AS cur_costInclusion,
      c.cost_inclusion_rate  AS cur_cost_inclusion_rate,
      c.total_quantity    AS cur_quantity,
      c.sales_days        AS cur_sales_days,
      -- 前年同期
      COALESCE(p.total_sales, 0)       AS py_sales,
      COALESCE(p.total_customers, 0)    AS py_customers,
      COALESCE(p.total_discount, 0)     AS py_discount,
      COALESCE(p.gross_sales, 0)        AS py_gross_sales,
      COALESCE(p.discount_rate, 0)      AS py_discount_rate,
      COALESCE(p.total_cost, 0)         AS py_total_cost,
      COALESCE(p.total_cost_inclusion, 0)   AS py_costInclusion,
      COALESCE(p.cost_inclusion_rate, 0)    AS py_cost_inclusion_rate,
      COALESCE(p.total_quantity, 0)     AS py_quantity,
      COALESCE(p.sales_days, 0)         AS py_sales_days,
      -- 前週同期
      COALESCE(w.total_sales, 0)       AS pw_sales,
      COALESCE(w.total_customers, 0)    AS pw_customers,
      COALESCE(w.total_discount, 0)     AS pw_discount,
      COALESCE(w.gross_sales, 0)        AS pw_gross_sales,
      COALESCE(w.discount_rate, 0)      AS pw_discount_rate,
      COALESCE(w.total_cost, 0)         AS pw_total_cost,
      COALESCE(w.total_cost_inclusion, 0)   AS pw_costInclusion,
      COALESCE(w.cost_inclusion_rate, 0)    AS pw_cost_inclusion_rate,
      COALESCE(w.total_quantity, 0)     AS pw_quantity,
      COALESCE(w.sales_days, 0)         AS pw_sales_days,
      -- トレンド後半
      COALESCE(tr.total_sales, 0)      AS tr_sales,
      COALESCE(tr.total_customers, 0)   AS tr_customers,
      COALESCE(tr.total_discount, 0)    AS tr_discount,
      COALESCE(tr.gross_sales, 0)       AS tr_gross_sales,
      COALESCE(tr.discount_rate, 0)     AS tr_discount_rate,
      COALESCE(tr.total_cost, 0)        AS tr_total_cost,
      COALESCE(tr.total_cost_inclusion, 0)  AS tr_costInclusion,
      COALESCE(tr.cost_inclusion_rate, 0)   AS tr_cost_inclusion_rate,
      COALESCE(tr.total_quantity, 0)    AS tr_quantity,
      COALESCE(tr.sales_days, 0)        AS tr_sales_days,
      -- トレンド前半
      COALESCE(tp.total_sales, 0)      AS tp_sales,
      COALESCE(tp.total_customers, 0)   AS tp_customers,
      COALESCE(tp.total_discount, 0)    AS tp_discount,
      COALESCE(tp.gross_sales, 0)       AS tp_gross_sales,
      COALESCE(tp.discount_rate, 0)     AS tp_discount_rate,
      COALESCE(tp.total_cost, 0)        AS tp_total_cost,
      COALESCE(tp.total_cost_inclusion, 0)  AS tp_costInclusion,
      COALESCE(tp.cost_inclusion_rate, 0)   AS tp_cost_inclusion_rate,
      COALESCE(tp.total_quantity, 0)    AS tp_quantity,
      COALESCE(tp.sales_days, 0)        AS tp_sales_days
    FROM cur c
    LEFT JOIN py p ON c.store_id = p.store_id
    LEFT JOIN pw w ON c.store_id = w.store_id
    LEFT JOIN tr ON c.store_id = tr.store_id
    LEFT JOIN tp ON c.store_id = tp.store_id
    ORDER BY c.store_id
  `

  return queryToObjects<ConditionMatrixRow>(conn, sql)
}
