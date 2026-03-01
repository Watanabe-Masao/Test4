/**
 * コンディションマトリクスクエリ
 *
 * 指定期間の店舗別メトリクスと、前年同期・前週同期のデータを
 * 一回の SQL クエリで取得する。
 *
 * 結果: 店舗ごとに { current, prevYear, prevWeek } の3期間分の集計値。
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
  readonly totalConsumable: number
  readonly consumableRate: number
  readonly salesDays: number
}

/** 店舗×3期間のコンディションマトリクス行 */
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
  readonly pwSalesDays: number
}

/** DuckDB 日付演算用の内部 SQL ヘルパー */
function dateKeyShiftSql(fromKey: string, toKey: string, days: number): string {
  // DuckDB: STRFTIME(CAST(REPLACE(date_key, '/', '-') AS DATE) - INTERVAL '7' DAY, '%Y/%m/%d')
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
        COALESCE(SUM(s.consumable_cost), 0) AS total_consumable,
        CASE WHEN COALESCE(SUM(s.sales), 0) > 0
          THEN COALESCE(SUM(s.consumable_cost), 0) / COALESCE(SUM(s.sales), 0)
          ELSE 0 END AS consumable_rate,
        COUNT(DISTINCT CASE WHEN s.sales > 0 THEN s.date_key END) AS sales_days
      FROM store_day_summary s
      WHERE ${whereClause}
      GROUP BY s.store_id
    )`
}

/**
 * コンディションマトリクスデータを取得する
 *
 * 指定日付範囲に対し、当期・前年同期・前週同期の3期間で
 * 店舗別の主要メトリクスを1回のクエリで返す。
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

  // 当期: is_prev_year = FALSE, 指定範囲
  const curWhere = `s.date_key BETWEEN '${fromKey}' AND '${toKey}' AND s.is_prev_year = FALSE${storeWhere}`

  // 前年同期: is_prev_year = TRUE, 同じ月/日範囲
  const pyWhere = `s.date_key BETWEEN '${fromKey}' AND '${toKey}' AND s.is_prev_year = TRUE${storeWhere}`

  // 前週同期: is_prev_year = FALSE, 日付を -7日シフト
  const pwWhere = `${dateKeyShiftSql(fromKey, toKey, 7)} AND s.is_prev_year = FALSE${storeWhere}`

  const sql = `
    WITH
    ${aggregateCte('cur', curWhere)},
    ${aggregateCte('py', pyWhere)},
    ${aggregateCte('pw', pwWhere)}
    SELECT
      c.store_id,
      -- 当期
      c.total_sales     AS cur_sales,
      c.total_customers  AS cur_customers,
      c.total_discount   AS cur_discount,
      c.gross_sales      AS cur_gross_sales,
      c.discount_rate    AS cur_discount_rate,
      c.total_cost       AS cur_total_cost,
      c.total_consumable AS cur_consumable,
      c.consumable_rate  AS cur_consumable_rate,
      c.sales_days       AS cur_sales_days,
      -- 前年同期
      COALESCE(p.total_sales, 0)      AS py_sales,
      COALESCE(p.total_customers, 0)   AS py_customers,
      COALESCE(p.total_discount, 0)    AS py_discount,
      COALESCE(p.gross_sales, 0)       AS py_gross_sales,
      COALESCE(p.discount_rate, 0)     AS py_discount_rate,
      COALESCE(p.total_cost, 0)        AS py_total_cost,
      COALESCE(p.total_consumable, 0)  AS py_consumable,
      COALESCE(p.consumable_rate, 0)   AS py_consumable_rate,
      COALESCE(p.sales_days, 0)        AS py_sales_days,
      -- 前週同期
      COALESCE(w.total_sales, 0)      AS pw_sales,
      COALESCE(w.total_customers, 0)   AS pw_customers,
      COALESCE(w.total_discount, 0)    AS pw_discount,
      COALESCE(w.gross_sales, 0)       AS pw_gross_sales,
      COALESCE(w.discount_rate, 0)     AS pw_discount_rate,
      COALESCE(w.total_cost, 0)        AS pw_total_cost,
      COALESCE(w.total_consumable, 0)  AS pw_consumable,
      COALESCE(w.consumable_rate, 0)   AS pw_consumable_rate,
      COALESCE(w.sales_days, 0)        AS pw_sales_days
    FROM cur c
    LEFT JOIN py p ON c.store_id = p.store_id
    LEFT JOIN pw w ON c.store_id = w.store_id
    ORDER BY c.store_id
  `

  return queryToObjects<ConditionMatrixRow>(conn, sql)
}
