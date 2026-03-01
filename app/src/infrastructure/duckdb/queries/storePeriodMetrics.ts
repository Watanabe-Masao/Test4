/**
 * store_period_metrics クエリモジュール
 *
 * StoreResult の全計算を SQL CTE で再現する。
 * 任意の DateRange に対して動的に計算結果を返す。
 *
 * JS 計算パイプライン（storeAssembler / dailyBuilder / CalculationOrchestrator）を
 * 単一の SQL クエリに統合し、DuckDB を唯一の計算ソースとする。
 *
 * 呼び出し側はドメイン型（DateRange, ReadonlySet<string>）を渡すだけでよい。
 * SQL パラメータへの変換は本モジュール内部で行う。
 *
 * @see storeAssembler.ts  — このクエリが置き換える JS 計算
 * @see estMethod.ts       — 推定法（SQL CTE est_* で再現）
 * @see invMethod.ts       — 在庫法（SQL CTE inv_* で再現）
 * @see discountImpact.ts  — 売変影響（SQL CTE est_calc で再現）
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import { dateRangeToKeys } from '@/domain/models/CalendarDate'
import { queryToObjects, buildWhereClause, storeIdFilter } from '../queryRunner'

// ── 結果型 ──

/** 店舗別期間メトリクス（StoreResult の SQL 版） */
export interface StorePeriodMetricsRow {
  readonly storeId: string

  // ── 売上 ──
  readonly totalSales: number
  readonly totalCoreSales: number
  readonly grossSales: number
  readonly deliverySalesPrice: number
  readonly deliverySalesCost: number
  readonly totalFlowersPrice: number
  readonly totalFlowersCost: number
  readonly totalDirectProducePrice: number
  readonly totalDirectProduceCost: number

  // ── 原価 ──
  readonly totalCost: number
  readonly inventoryCost: number
  readonly totalPurchaseCost: number
  readonly totalPurchasePrice: number

  // ── 移動 ──
  readonly interStoreInCost: number
  readonly interStoreInPrice: number
  readonly interStoreOutCost: number
  readonly interStoreOutPrice: number
  readonly interDeptInCost: number
  readonly interDeptInPrice: number
  readonly interDeptOutCost: number
  readonly interDeptOutPrice: number
  readonly totalTransferCost: number
  readonly totalTransferPrice: number

  // ── 売変 ──
  readonly totalDiscount: number
  readonly discountRate: number
  readonly discountLossCost: number

  // ── 値入率 ──
  readonly averageMarkupRate: number
  readonly coreMarkupRate: number

  // ── 消耗品 ──
  readonly totalConsumable: number
  readonly consumableRate: number

  // ── 客数 ──
  readonly totalCustomers: number
  readonly averageCustomersPerDay: number

  // ── 在庫法 ──
  readonly openingInventory: number | null
  readonly closingInventory: number | null
  readonly invMethodCogs: number | null
  readonly invMethodGrossProfit: number | null
  readonly invMethodGrossProfitRate: number | null

  // ── 推定法 ──
  readonly estMethodCogs: number
  readonly estMethodMargin: number
  readonly estMethodMarginRate: number
  readonly estMethodClosingInventory: number | null

  // ── 予算 ──
  readonly grossProfitBudget: number

  // ── 期間情報 ──
  readonly salesDays: number
  readonly totalDays: number
  readonly purchaseMaxDay: number
  readonly hasDiscountData: boolean
}

// ── 内部ヘルパー ──

/** ドメイン型 → SQL WHERE 句変換（モジュール内部のみ） */
function toWhereClause(dateRange: DateRange, storeIds?: ReadonlySet<string>): string {
  const { fromKey, toKey } = dateRangeToKeys(dateRange)
  const storeIdArr = storeIds && storeIds.size > 0 ? [...storeIds] : undefined
  const storeCondition = storeIdFilter(storeIdArr)
  return buildWhereClause([
    `s.date_key BETWEEN '${fromKey}' AND '${toKey}'`,
    's.is_prev_year = FALSE',
    storeCondition ? storeCondition.replace('store_id', 's.store_id') : null,
  ])
}

/** DateRange から開始年月を取得（inventory_config JOIN 用） */
function startYearMonth(dateRange: DateRange): { year: number; month: number } {
  return { year: dateRange.from.year, month: dateRange.from.month }
}

// ── クエリ関数 ──

/**
 * 店舗別期間メトリクスを取得する（StoreResult の SQL 版）
 *
 * store_day_summary を期間集約し、値入率・売変率・在庫法・推定法の
 * 全計算を SQL CTE で実行する。
 *
 * 月跨ぎ・年跨ぎに対応: DateRange で任意期間を指定可能。
 */
export async function queryStorePeriodMetrics(
  conn: AsyncDuckDBConnection,
  dateRange: DateRange,
  storeIds?: ReadonlySet<string>,
): Promise<readonly StorePeriodMetricsRow[]> {
  const where = toWhereClause(dateRange, storeIds)
  const { year, month } = startYearMonth(dateRange)

  const sql = `
    WITH raw AS (
      -- store_day_summary から店舗別期間集約
      SELECT
        s.store_id,
        COALESCE(SUM(s.sales), 0) AS total_sales,
        COALESCE(SUM(s.core_sales), 0) AS total_core_sales,
        COALESCE(SUM(s.gross_sales), 0) AS gross_sales,
        COALESCE(SUM(s.discount_absolute), 0) AS total_discount,
        COALESCE(SUM(s.purchase_cost), 0) AS total_purchase_cost,
        COALESCE(SUM(s.purchase_price), 0) AS total_purchase_price,
        COALESCE(SUM(s.flowers_cost), 0) AS total_flowers_cost,
        COALESCE(SUM(s.flowers_price), 0) AS total_flowers_price,
        COALESCE(SUM(s.direct_produce_cost), 0) AS total_direct_produce_cost,
        COALESCE(SUM(s.direct_produce_price), 0) AS total_direct_produce_price,
        COALESCE(SUM(s.inter_store_in_cost), 0) AS inter_store_in_cost,
        COALESCE(SUM(s.inter_store_in_price), 0) AS inter_store_in_price,
        COALESCE(SUM(s.inter_store_out_cost), 0) AS inter_store_out_cost,
        COALESCE(SUM(s.inter_store_out_price), 0) AS inter_store_out_price,
        COALESCE(SUM(s.inter_dept_in_cost), 0) AS inter_dept_in_cost,
        COALESCE(SUM(s.inter_dept_in_price), 0) AS inter_dept_in_price,
        COALESCE(SUM(s.inter_dept_out_cost), 0) AS inter_dept_out_cost,
        COALESCE(SUM(s.inter_dept_out_price), 0) AS inter_dept_out_price,
        COALESCE(SUM(s.consumable_cost), 0) AS total_consumable,
        COALESCE(SUM(s.customers), 0) AS total_customers,
        COUNT(DISTINCT CASE WHEN s.sales > 0 THEN s.date_key END) AS sales_days,
        COUNT(DISTINCT s.date_key) AS total_days,
        COALESCE(MAX(CASE WHEN s.purchase_cost > 0 THEN s.day ELSE 0 END), 0) AS purchase_max_day,
        MAX(CASE WHEN s.discount_absolute > 0 THEN TRUE ELSE FALSE END) AS has_discount_data
      FROM store_day_summary s
      ${where}
      GROUP BY s.store_id
    ),
    costs AS (
      SELECT
        r.*,
        -- 売上納品（花 + 産直）
        r.total_flowers_price + r.total_direct_produce_price AS delivery_sales_price,
        r.total_flowers_cost + r.total_direct_produce_cost AS delivery_sales_cost,
        -- 移動合計
        r.inter_store_in_cost + r.inter_store_out_cost
          + r.inter_dept_in_cost + r.inter_dept_out_cost AS total_transfer_cost,
        r.inter_store_in_price + r.inter_store_out_price
          + r.inter_dept_in_price + r.inter_dept_out_price AS total_transfer_price,
        -- 総仕入原価 = 仕入原価 + 花原価 + 産直原価 + 移動原価 + 消耗品
        r.total_purchase_cost + r.total_flowers_cost + r.total_direct_produce_cost
          + r.inter_store_in_cost + r.inter_store_out_cost
          + r.inter_dept_in_cost + r.inter_dept_out_cost
          + r.total_consumable AS total_cost,
        -- 在庫仕入原価（売上納品分除外）= 総仕入原価 - 花原価 - 産直原価
        r.total_purchase_cost
          + r.inter_store_in_cost + r.inter_store_out_cost
          + r.inter_dept_in_cost + r.inter_dept_out_cost
          + r.total_consumable AS inventory_cost,
        -- 全仕入売価（値入率算出用）
        r.total_purchase_price + r.total_flowers_price + r.total_direct_produce_price
          + r.inter_store_in_price + r.inter_store_out_price
          + r.inter_dept_in_price + r.inter_dept_out_price AS all_purchase_price,
        r.total_purchase_cost + r.total_flowers_cost + r.total_direct_produce_cost
          + r.inter_store_in_cost + r.inter_store_out_cost
          + r.inter_dept_in_cost + r.inter_dept_out_cost AS all_purchase_cost
      FROM raw r
    ),
    rates AS (
      SELECT
        c.*,
        -- 売変率 = discount / (sales + discount)  ※ safeDivide 相当
        CASE WHEN (c.total_sales + c.total_discount) > 0
          THEN c.total_discount / (c.total_sales + c.total_discount)
          ELSE 0 END AS discount_rate,
        -- 平均値入率 = (allPrice - allCost) / allPrice
        CASE WHEN c.all_purchase_price > 0
          THEN (c.all_purchase_price - c.all_purchase_cost) / c.all_purchase_price
          ELSE 0 END AS average_markup_rate,
        -- コア値入率（花/産直除外）
        CASE WHEN (c.total_purchase_price + c.total_transfer_price) > 0
          THEN ((c.total_purchase_price + c.total_transfer_price)
                - (c.total_purchase_cost + c.total_transfer_cost))
               / (c.total_purchase_price + c.total_transfer_price)
          ELSE COALESCE(
            (SELECT value FROM app_settings WHERE key = 'defaultMarkupRate'), 0.25
          ) END AS core_markup_rate,
        -- 消耗品率 = consumable / sales
        CASE WHEN c.total_sales > 0
          THEN c.total_consumable / c.total_sales
          ELSE 0 END AS consumable_rate,
        -- 日平均客数 = customers / salesDays
        CASE WHEN c.sales_days > 0
          THEN c.total_customers * 1.0 / c.sales_days
          ELSE 0 END AS avg_customers_per_day
      FROM costs c
    ),
    est AS (
      SELECT
        rt.*,
        -- 推定法: 粗売上 = コア売上 / (1 - 売変率)  ※ discountRate < 1 で除算
        CASE WHEN rt.discount_rate < 1
          THEN rt.total_core_sales / (1 - rt.discount_rate)
          ELSE rt.total_core_sales END AS est_gross_sales
      FROM rates rt
    ),
    est_calc AS (
      SELECT
        e.*,
        -- 推定法: 推定原価 = 粗売上 × (1 - 値入率) + 消耗品
        e.est_gross_sales * (1 - e.core_markup_rate) + e.total_consumable AS est_method_cogs,
        -- 売変ロス原価 = (1 - 値入率) × コア売上 × (売変率 / (1 - 売変率))
        CASE WHEN e.discount_rate < 1
          THEN (1 - e.core_markup_rate) * e.total_core_sales
               * e.discount_rate / (1 - e.discount_rate)
          ELSE (1 - e.core_markup_rate) * e.total_core_sales * e.discount_rate
          END AS discount_loss_cost
      FROM est e
    ),
    est_final AS (
      SELECT
        ec.*,
        -- 推定マージン = コア売上 - 推定原価
        ec.total_core_sales - ec.est_method_cogs AS est_method_margin,
        -- 推定マージン率 = マージン / コア売上
        CASE WHEN ec.total_core_sales > 0
          THEN (ec.total_core_sales - ec.est_method_cogs) / ec.total_core_sales
          ELSE 0 END AS est_method_margin_rate
      FROM est_calc ec
    )
    SELECT
      ef.store_id,
      -- 売上
      ef.total_sales,
      ef.total_core_sales,
      ef.gross_sales,
      ef.delivery_sales_price,
      ef.delivery_sales_cost,
      ef.total_flowers_price,
      ef.total_flowers_cost,
      ef.total_direct_produce_price,
      ef.total_direct_produce_cost,
      -- 原価
      ef.total_cost,
      ef.inventory_cost,
      ef.total_purchase_cost,
      ef.total_purchase_price,
      -- 移動
      ef.inter_store_in_cost,
      ef.inter_store_in_price,
      ef.inter_store_out_cost,
      ef.inter_store_out_price,
      ef.inter_dept_in_cost,
      ef.inter_dept_in_price,
      ef.inter_dept_out_cost,
      ef.inter_dept_out_price,
      ef.total_transfer_cost,
      ef.total_transfer_price,
      -- 売変
      ef.total_discount,
      ef.discount_rate,
      ef.discount_loss_cost,
      -- 値入率
      ef.average_markup_rate,
      ef.core_markup_rate,
      -- 消耗品
      ef.total_consumable,
      ef.consumable_rate,
      -- 客数
      ef.total_customers,
      ef.avg_customers_per_day AS average_customers_per_day,
      -- 在庫法
      ic.opening_inventory,
      ic.closing_inventory,
      CASE WHEN ic.opening_inventory IS NOT NULL AND ic.closing_inventory IS NOT NULL
        THEN ic.opening_inventory + ef.total_cost - ic.closing_inventory
        ELSE NULL END AS inv_method_cogs,
      CASE WHEN ic.opening_inventory IS NOT NULL AND ic.closing_inventory IS NOT NULL
        THEN ef.total_sales - (ic.opening_inventory + ef.total_cost - ic.closing_inventory)
        ELSE NULL END AS inv_method_gross_profit,
      CASE WHEN ic.opening_inventory IS NOT NULL AND ic.closing_inventory IS NOT NULL
           AND ef.total_sales > 0
        THEN (ef.total_sales - (ic.opening_inventory + ef.total_cost - ic.closing_inventory))
             / ef.total_sales
        ELSE NULL END AS inv_method_gross_profit_rate,
      -- 推定法
      ef.est_method_cogs,
      ef.est_method_margin,
      ef.est_method_margin_rate,
      CASE WHEN ic.opening_inventory IS NOT NULL
        THEN ic.opening_inventory + ef.inventory_cost - ef.est_method_cogs
        ELSE NULL END AS est_method_closing_inventory,
      -- 予算
      COALESCE(ic.gross_profit_budget, 0) AS gross_profit_budget,
      -- 期間情報
      ef.sales_days,
      ef.total_days,
      ef.purchase_max_day,
      ef.has_discount_data
    FROM est_final ef
    LEFT JOIN inventory_config ic
      ON ef.store_id = ic.store_id
      AND ic.year = ${year} AND ic.month = ${month}
    ORDER BY ef.store_id`

  return queryToObjects<StorePeriodMetricsRow>(conn, sql)
}

/**
 * 単一店舗の期間メトリクスを取得する
 */
export async function queryStorePeriodMetricsSingle(
  conn: AsyncDuckDBConnection,
  dateRange: DateRange,
  storeId: string,
): Promise<StorePeriodMetricsRow | null> {
  const rows = await queryStorePeriodMetrics(conn, dateRange, new Set([storeId]))
  return rows.length > 0 ? rows[0] : null
}
