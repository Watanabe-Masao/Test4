/**
 * 仕入比較クエリモジュール
 *
 * purchase テーブルから日付範囲ベースで取引先別仕入データを集約し、
 * 前年比較用の構造化データを返す。
 * date_key BETWEEN で同曜日・月跨ぎクエリに対応する。
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import { queryToObjects, buildTypedWhere } from '../queryRunner'
import type { WhereCondition } from '../queryRunner'

/** purchase テーブル共通の WHERE 句を構築する */
function purchaseWhere(
  dateFrom: string,
  dateTo: string,
  storeIds?: readonly string[],
  extra?: WhereCondition,
): string {
  const conditions: WhereCondition[] = [
    { type: 'dateRange', column: 'date_key', from: dateFrom, to: dateTo },
    { type: 'storeIds', storeIds },
  ]
  if (extra) conditions.push(extra)
  return buildTypedWhere(conditions)
}

// ── 結果型（SQL → camelCase 変換後）──

/** 日別仕入集計（チャート用） */
export interface PurchaseDailyRow {
  readonly day: number
  readonly totalCost: number
  readonly totalPrice: number
}

// ── クエリ関数 ──

/**
 * 指定日付範囲の取引先別仕入集計を取得する
 */
/**
 * 取引先コード → 取引先名のマッピングを取得する（名前解決専用）
 *
 * cost/price の集計値は正本ではない。正本は readPurchaseCost の PurchaseCostReadModel。
 */
export async function querySupplierNames(
  conn: AsyncDuckDBConnection,
  dateFrom: string,
  dateTo: string,
  storeIds?: readonly string[],
): Promise<ReadonlyMap<string, string>> {
  const where = purchaseWhere(dateFrom, dateTo, storeIds)
  const sql = `
    SELECT DISTINCT
      COALESCE(supplier_code, 'UNKNOWN') AS supplier_code,
      COALESCE(supplier_name, '不明') AS supplier_name
    FROM purchase
    ${where}`
  const rows = await queryToObjects<{ supplierCode: string; supplierName: string }>(conn, sql)
  return new Map(rows.map((r) => [r.supplierCode, r.supplierName]))
}

// queryPurchaseBySupplier は廃止済み。
// 取引先名は querySupplierNames()、cost/price は readPurchaseCost の ReadModel を使用。

/**
 * 指定日付範囲内で実データが存在する最大日付のday部分を取得する。
 * 取り込み有効期間のキャップに使用。
 */
export async function queryEffectiveMaxDay(
  conn: AsyncDuckDBConnection,
  dateFrom: string,
  dateTo: string,
  storeIds?: readonly string[],
): Promise<number | null> {
  const where = purchaseWhere(dateFrom, dateTo, storeIds)
  const sql = `
    SELECT MAX(EXTRACT(DAY FROM date_key::DATE)) AS max_day
    FROM purchase
    ${where}`
  const rows = await queryToObjects<{ maxDay: number | null }>(conn, sql)
  return rows.length > 0 ? rows[0].maxDay : null
}

// queryPurchaseTotal は廃止済み。正本は readPurchaseCost の grandTotalCost。

/** 店舗別仕入集計 */
export interface PurchaseStoreRow {
  readonly storeId: string
  readonly totalCost: number
  readonly totalPrice: number
}

/**
 * 指定日付範囲の店舗別仕入集計を取得する
 */
export async function queryPurchaseByStore(
  conn: AsyncDuckDBConnection,
  dateFrom: string,
  dateTo: string,
  storeIds?: readonly string[],
): Promise<readonly PurchaseStoreRow[]> {
  const where = purchaseWhere(dateFrom, dateTo, storeIds)
  const sql = `
    SELECT
      store_id,
      COALESCE(SUM(cost), 0) AS total_cost,
      COALESCE(SUM(price), 0) AS total_price
    FROM purchase
    ${where}
    GROUP BY store_id
    ORDER BY total_cost DESC`
  return queryToObjects<PurchaseStoreRow>(conn, sql)
}

/** 店舗別仕入額集計（purchase + special_sales + transfers の UNION） */
export interface StoreCostPriceRow {
  readonly storeId: string
  readonly totalCost: number
  readonly totalPrice: number
}

/**
 * 指定日付範囲の店舗別原価/売価を取得する。
 *
 * purchase + special_sales + transfers を UNION し、
 * 全仕入カテゴリを合算した額を store_id 別に返す。
 * 率の計算は呼び出し元が domain/calculations 経由で行う（@guard B3）。
 */
export async function queryStoreCostPrice(
  conn: AsyncDuckDBConnection,
  dateFrom: string,
  dateTo: string,
  storeIds?: readonly string[],
): Promise<readonly StoreCostPriceRow[]> {
  const w = purchaseWhere(dateFrom, dateTo, storeIds)

  const sql = `
    SELECT
      store_id,
      COALESCE(SUM(cost), 0) AS total_cost,
      COALESCE(SUM(price), 0) AS total_price
    FROM (
      SELECT store_id, cost, price FROM purchase ${w}
      UNION ALL
      SELECT store_id, cost, price FROM special_sales ${w}
      UNION ALL
      SELECT store_id, cost, price FROM transfers ${w}
    ) combined
    GROUP BY store_id
    ORDER BY total_cost DESC`
  return queryToObjects<StoreCostPriceRow>(conn, sql)
}

/** 店舗×日別値入率集計（purchase + special_sales + transfers の UNION） */
export interface StoreDailyMarkupRateRow {
  readonly storeId: string
  readonly day: number
  readonly totalCost: number
  readonly totalPrice: number
}

/**
 * 指定日付範囲の店舗×日別原価/売価を取得する。
 * 日別値入率・累計値入率の計算に使用。
 */
export async function queryStoreDailyMarkupRate(
  conn: AsyncDuckDBConnection,
  dateFrom: string,
  dateTo: string,
  storeIds?: readonly string[],
): Promise<readonly StoreDailyMarkupRateRow[]> {
  const w = purchaseWhere(dateFrom, dateTo, storeIds)

  const sql = `
    SELECT
      store_id,
      day,
      COALESCE(SUM(cost), 0) AS total_cost,
      COALESCE(SUM(price), 0) AS total_price
    FROM (
      SELECT store_id, day, cost, price FROM purchase ${w}
      UNION ALL
      SELECT store_id, day, cost, price FROM special_sales ${w}
      UNION ALL
      SELECT store_id, day, cost, price FROM transfers ${w}
    ) combined
    GROUP BY store_id, day
    ORDER BY store_id, day`
  return queryToObjects<StoreDailyMarkupRateRow>(conn, sql)
}

/** 日別売上集計（チャート用） */
export interface SalesDailyRow {
  readonly day: number
  readonly totalSales: number
}

/**
 * 指定日付範囲の日別売上を取得する（store_day_summary）
 */
export async function querySalesDaily(
  conn: AsyncDuckDBConnection,
  dateFrom: string,
  dateTo: string,
  storeIds?: readonly string[],
  isPrevYear = false,
): Promise<readonly SalesDailyRow[]> {
  const where = purchaseWhere(dateFrom, dateTo, storeIds, {
    type: 'boolean',
    column: 'is_prev_year',
    value: isPrevYear,
  })
  const sql = `
    SELECT
      day,
      COALESCE(SUM(sales), 0) AS total_sales
    FROM store_day_summary
    ${where}
    GROUP BY day
    ORDER BY day`
  return queryToObjects<SalesDailyRow>(conn, sql)
}

/** 店舗×日別×取引先別仕入集計 */
export interface PurchaseDailySupplierRow {
  readonly storeId: string
  readonly day: number
  readonly supplierCode: string
  readonly totalCost: number
  readonly totalPrice: number
}

/**
 * 指定日付範囲の店舗×日別×取引先別仕入集計を取得する
 *
 * store_id を含むことで、店舗別分析にも正本から導出可能。
 * 全店合計は JS 側で集約する。
 */
export async function queryPurchaseDailyBySupplier(
  conn: AsyncDuckDBConnection,
  dateFrom: string,
  dateTo: string,
  storeIds?: readonly string[],
): Promise<readonly PurchaseDailySupplierRow[]> {
  const where = purchaseWhere(dateFrom, dateTo, storeIds)
  const sql = `
    SELECT
      store_id,
      day,
      COALESCE(supplier_code, 'UNKNOWN') AS supplier_code,
      COALESCE(SUM(cost), 0) AS total_cost,
      COALESCE(SUM(price), 0) AS total_price
    FROM purchase
    ${where}
    GROUP BY store_id, day, supplier_code
    ORDER BY store_id, day, supplier_code`
  return queryToObjects<PurchaseDailySupplierRow>(conn, sql)
}

/**
 * 指定日付範囲の日別仕入集計を取得する（チャート用）
 */
export async function queryPurchaseDaily(
  conn: AsyncDuckDBConnection,
  dateFrom: string,
  dateTo: string,
  storeIds?: readonly string[],
): Promise<readonly PurchaseDailyRow[]> {
  const where = purchaseWhere(dateFrom, dateTo, storeIds)
  const sql = `
    SELECT
      day,
      COALESCE(SUM(cost), 0) AS total_cost,
      COALESCE(SUM(price), 0) AS total_price
    FROM purchase
    ${where}
    GROUP BY day
    ORDER BY day`
  return queryToObjects<PurchaseDailyRow>(conn, sql)
}

/** 店舗×カテゴリ別日別集計行（花・産直・店間・部門間用） */
export interface CategoryDailyRow {
  readonly storeId: string
  readonly day: number
  readonly categoryKey: string
  readonly totalCost: number
  readonly totalPrice: number
}

/**
 * special_sales（花・産直）の店舗×日別集計
 */
export async function querySpecialSalesDaily(
  conn: AsyncDuckDBConnection,
  dateFrom: string,
  dateTo: string,
  storeIds?: readonly string[],
): Promise<readonly CategoryDailyRow[]> {
  const where = purchaseWhere(dateFrom, dateTo, storeIds)
  const sql = `
    SELECT
      store_id,
      day,
      type AS category_key,
      COALESCE(SUM(cost), 0) AS total_cost,
      COALESCE(SUM(price), 0) AS total_price
    FROM special_sales
    ${where}
    GROUP BY store_id, day, type
    ORDER BY day, type`
  return queryToObjects<CategoryDailyRow>(conn, sql)
}

// querySpecialSalesTotal は廃止済み。正本は readPurchaseCost の deliverySales。

/**
 * transfers（店間・部門間）の店舗×日別集計
 */
export async function queryTransfersDaily(
  conn: AsyncDuckDBConnection,
  dateFrom: string,
  dateTo: string,
  storeIds?: readonly string[],
): Promise<readonly CategoryDailyRow[]> {
  const where = purchaseWhere(dateFrom, dateTo, storeIds)
  const sql = `
    SELECT
      store_id,
      day,
      direction AS category_key,
      COALESCE(SUM(cost), 0) AS total_cost,
      COALESCE(SUM(price), 0) AS total_price
    FROM transfers
    ${where}
    GROUP BY store_id, day, direction
    ORDER BY store_id, day, direction`
  return queryToObjects<CategoryDailyRow>(conn, sql)
}

// queryTransfersTotal は廃止済み。正本は readPurchaseCost の transfers。

/** 売上合計（classified_sales 直接、is_prev_year 不要） */
export interface SalesTotalRow {
  readonly totalSales: number
}

/**
 * 指定日付範囲の売上合計を取得（classified_sales から直接集約）
 */
export async function querySalesTotal(
  conn: AsyncDuckDBConnection,
  dateFrom: string,
  dateTo: string,
  storeIds?: readonly string[],
  isPrevYear = false,
): Promise<number> {
  const where = purchaseWhere(dateFrom, dateTo, storeIds, {
    type: 'boolean',
    column: 'is_prev_year',
    value: isPrevYear,
  })
  const sql = `
    SELECT COALESCE(SUM(sales_amount), 0) AS total_sales
    FROM classified_sales
    ${where}`
  const rows = await queryToObjects<SalesTotalRow>(conn, sql)
  return rows.length > 0 ? rows[0].totalSales : 0
}
