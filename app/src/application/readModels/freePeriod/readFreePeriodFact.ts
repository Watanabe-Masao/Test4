/**
 * readFreePeriodFact — 自由期間分析の唯一の read 関数
 *
 * DuckDB から日別×店舗の売上/仕入/客数/売変を取得し、
 * JS で期間サマリーを導出して FreePeriodReadModel を返す。
 *
 * @see references/01-principles/free-period-analysis-definition.md (予定)
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import { queryToObjects, buildTypedWhere } from '@/infrastructure/duckdb/queryRunner'
import type { WhereCondition } from '@/infrastructure/duckdb/queryRunner'
import {
  FreePeriodReadModel,
  FreePeriodDailyRow,
  FreePeriodSummary,
  type FreePeriodReadModel as FreePeriodReadModelType,
  type FreePeriodDailyRow as FreePeriodDailyRowType,
  type FreePeriodSummary as FreePeriodSummaryType,
  type FreePeriodQueryInput as FreePeriodQueryInputType,
} from './FreePeriodTypes'

// ── 内部クエリ ──

function buildWhere(
  dateFrom: string,
  dateTo: string,
  storeIds?: readonly string[],
  isPrevYear = false,
): string {
  const conditions: WhereCondition[] = [
    { type: 'dateRange', column: 'date_key', from: dateFrom, to: dateTo },
    { type: 'boolean', column: 'is_prev_year', value: isPrevYear },
    { type: 'storeIds', storeIds: storeIds ? [...storeIds] : undefined },
  ]
  return buildTypedWhere(conditions)
}

const DAILY_SQL = (where: string) => `
  SELECT
    cs.store_id AS "storeId",
    cs.date_key AS "dateKey",
    cs.day,
    EXTRACT(DOW FROM cs.date_key::DATE)::INT AS "dow",
    SUM(cs.sales_amount) AS "sales",
    SUM(cs.customers) AS "customers",
    COALESCE(p.cost, 0) AS "purchaseCost",
    COALESCE(p.price, 0) AS "purchasePrice",
    SUM(cs.discount_71 + cs.discount_72 + cs.discount_73 + cs.discount_74) AS "discount",
    cs.is_prev_year AS "isPrevYear"
  FROM classified_sales cs
  LEFT JOIN (
    SELECT store_id, date_key, SUM(cost) AS cost, SUM(price) AS price
    FROM purchase
    GROUP BY store_id, date_key
  ) p ON cs.store_id = p.store_id AND cs.date_key = p.date_key
  ${where}
  GROUP BY cs.store_id, cs.date_key, cs.day, cs.is_prev_year, p.cost, p.price
  ORDER BY cs.date_key, cs.store_id
`

async function queryDailyRows(
  conn: AsyncDuckDBConnection,
  dateFrom: string,
  dateTo: string,
  storeIds?: readonly string[],
  isPrevYear = false,
): Promise<readonly FreePeriodDailyRowType[]> {
  const where = buildWhere(dateFrom, dateTo, storeIds, isPrevYear)
  return queryToObjects(conn, DAILY_SQL(where), FreePeriodDailyRow)
}

// ── サマリー計算（純粋関数） ──

export function computeFreePeriodSummary(
  rows: readonly FreePeriodDailyRowType[],
): FreePeriodSummaryType {
  if (rows.length === 0) {
    return {
      storeCount: 0,
      dayCount: 0,
      totalSales: 0,
      totalCustomers: 0,
      totalPurchaseCost: 0,
      totalDiscount: 0,
      averageDailySales: 0,
      transactionValue: 0,
      discountRate: 0,
    }
  }

  const storeIds = new Set<string>()
  const days = new Set<string>()
  let totalSales = 0
  let totalCustomers = 0
  let totalPurchaseCost = 0
  let totalDiscount = 0

  for (const row of rows) {
    storeIds.add(row.storeId)
    days.add(row.dateKey)
    totalSales += row.sales
    totalCustomers += row.customers
    totalPurchaseCost += row.purchaseCost
    totalDiscount += row.discount
  }

  const dayCount = days.size
  const averageDailySales = dayCount > 0 ? totalSales / dayCount : 0
  const transactionValue = totalCustomers > 0 ? totalSales / totalCustomers : 0
  const discountRate =
    totalSales + totalDiscount > 0 ? totalDiscount / (totalSales + totalDiscount) : 0

  return FreePeriodSummary.parse({
    storeCount: storeIds.size,
    dayCount,
    totalSales,
    totalCustomers,
    totalPurchaseCost,
    totalDiscount,
    averageDailySales,
    transactionValue,
    discountRate,
  })
}

// ── 公開 API ──

/**
 * 自由期間分析の唯一の read 関数。
 *
 * DuckDB から日別行を取得し、期間サマリーを計算して返す。
 * 比較期間が指定されている場合は比較行も取得する。
 */
export async function readFreePeriodFact(
  conn: AsyncDuckDBConnection,
  input: FreePeriodQueryInputType,
): Promise<FreePeriodReadModelType> {
  const currentRows = await queryDailyRows(
    conn,
    input.dateFrom,
    input.dateTo,
    input.storeIds,
    false,
  )

  let comparisonRows: readonly FreePeriodDailyRowType[] = []
  if (input.comparisonDateFrom && input.comparisonDateTo) {
    comparisonRows = await queryDailyRows(
      conn,
      input.comparisonDateFrom,
      input.comparisonDateTo,
      input.storeIds,
      true,
    )
  }

  const currentSummary = computeFreePeriodSummary(currentRows)
  const comparisonSummary =
    comparisonRows.length > 0 ? computeFreePeriodSummary(comparisonRows) : null

  return FreePeriodReadModel.parse({
    currentRows,
    comparisonRows,
    currentSummary,
    comparisonSummary,
  })
}
