/**
 * 仕入比較クエリモジュール
 *
 * purchase テーブルから日付範囲ベースで取引先別仕入データを集約し、
 * 前年比較用の構造化データを返す。
 * date_key BETWEEN で同曜日・月跨ぎクエリに対応する。
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import { queryToObjects, buildWhereClause, storeIdFilter } from '../queryRunner'
import { validateDateKey } from '../queryParams'

// ── 結果型（SQL → camelCase 変換後）──

export interface PurchaseSupplierRow {
  readonly supplierCode: string
  readonly supplierName: string
  readonly totalCost: number
  readonly totalPrice: number
}

export interface PurchaseTotalRow {
  readonly totalCost: number
  readonly totalPrice: number
}

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
export async function queryPurchaseBySupplier(
  conn: AsyncDuckDBConnection,
  dateFrom: string,
  dateTo: string,
  storeIds?: readonly string[],
): Promise<readonly PurchaseSupplierRow[]> {
  const df = validateDateKey(dateFrom)
  const dt = validateDateKey(dateTo)
  const where = buildWhereClause([`date_key BETWEEN '${df}' AND '${dt}'`, storeIdFilter(storeIds)])
  const sql = `
    SELECT
      COALESCE(supplier_code, 'UNKNOWN') AS supplier_code,
      COALESCE(supplier_name, '不明') AS supplier_name,
      COALESCE(SUM(cost), 0) AS total_cost,
      COALESCE(SUM(price), 0) AS total_price
    FROM purchase
    ${where}
    GROUP BY supplier_code, supplier_name
    ORDER BY total_cost DESC`
  return queryToObjects<PurchaseSupplierRow>(conn, sql)
}

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
  const df = validateDateKey(dateFrom)
  const dt = validateDateKey(dateTo)
  const where = buildWhereClause([`date_key BETWEEN '${df}' AND '${dt}'`, storeIdFilter(storeIds)])
  const sql = `
    SELECT MAX(EXTRACT(DAY FROM date_key::DATE)) AS max_day
    FROM purchase
    ${where}`
  const rows = await queryToObjects<{ maxDay: number | null }>(conn, sql)
  return rows.length > 0 ? rows[0].maxDay : null
}

/**
 * 指定日付範囲の仕入合計を取得する
 */
export async function queryPurchaseTotal(
  conn: AsyncDuckDBConnection,
  dateFrom: string,
  dateTo: string,
  storeIds?: readonly string[],
): Promise<PurchaseTotalRow> {
  const df = validateDateKey(dateFrom)
  const dt = validateDateKey(dateTo)
  const where = buildWhereClause([`date_key BETWEEN '${df}' AND '${dt}'`, storeIdFilter(storeIds)])
  const sql = `
    SELECT
      COALESCE(SUM(cost), 0) AS total_cost,
      COALESCE(SUM(price), 0) AS total_price
    FROM purchase
    ${where}`
  const rows = await queryToObjects<PurchaseTotalRow>(conn, sql)
  return rows.length > 0 ? rows[0] : { totalCost: 0, totalPrice: 0 }
}

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
  const df = validateDateKey(dateFrom)
  const dt = validateDateKey(dateTo)
  const where = buildWhereClause([`date_key BETWEEN '${df}' AND '${dt}'`, storeIdFilter(storeIds)])
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
 * 率の計算は呼び出し元が domain/calculations 経由で行う（禁止事項 #10）。
 */
export async function queryStoreCostPrice(
  conn: AsyncDuckDBConnection,
  dateFrom: string,
  dateTo: string,
  storeIds?: readonly string[],
): Promise<readonly StoreCostPriceRow[]> {
  const df = validateDateKey(dateFrom)
  const dt = validateDateKey(dateTo)
  const dateFilter = `date_key BETWEEN '${df}' AND '${dt}'`
  const storeFilter = storeIdFilter(storeIds)
  const w = buildWhereClause([dateFilter, storeFilter])

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
  const df = validateDateKey(dateFrom)
  const dt = validateDateKey(dateTo)
  const dateFilter = `date_key BETWEEN '${df}' AND '${dt}'`
  const storeFilter = storeIdFilter(storeIds)
  const w = buildWhereClause([dateFilter, storeFilter])

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
  const df = validateDateKey(dateFrom)
  const dt = validateDateKey(dateTo)
  const where = buildWhereClause([
    `date_key BETWEEN '${df}' AND '${dt}'`,
    `is_prev_year = ${isPrevYear}`,
    storeIdFilter(storeIds),
  ])
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

/** 日別×取引先別仕入集計（ピボットテーブル用） */
export interface PurchaseDailySupplierRow {
  readonly day: number
  readonly supplierCode: string
  readonly totalCost: number
  readonly totalPrice: number
}

/**
 * 指定日付範囲の日別×取引先別仕入集計を取得する（ピボットテーブル用）
 */
export async function queryPurchaseDailyBySupplier(
  conn: AsyncDuckDBConnection,
  dateFrom: string,
  dateTo: string,
  storeIds?: readonly string[],
): Promise<readonly PurchaseDailySupplierRow[]> {
  const df = validateDateKey(dateFrom)
  const dt = validateDateKey(dateTo)
  const where = buildWhereClause([`date_key BETWEEN '${df}' AND '${dt}'`, storeIdFilter(storeIds)])
  const sql = `
    SELECT
      day,
      COALESCE(supplier_code, 'UNKNOWN') AS supplier_code,
      COALESCE(SUM(cost), 0) AS total_cost,
      COALESCE(SUM(price), 0) AS total_price
    FROM purchase
    ${where}
    GROUP BY day, supplier_code
    ORDER BY day, supplier_code`
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
  const df = validateDateKey(dateFrom)
  const dt = validateDateKey(dateTo)
  const where = buildWhereClause([`date_key BETWEEN '${df}' AND '${dt}'`, storeIdFilter(storeIds)])
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

/** カテゴリ別日別集計行（花・産直・店間・部門間用） */
export interface CategoryDailyRow {
  readonly day: number
  readonly categoryKey: string
  readonly totalCost: number
  readonly totalPrice: number
}

/**
 * special_sales（花・産直）の日別集計
 */
export async function querySpecialSalesDaily(
  conn: AsyncDuckDBConnection,
  dateFrom: string,
  dateTo: string,
  storeIds?: readonly string[],
): Promise<readonly CategoryDailyRow[]> {
  const df = validateDateKey(dateFrom)
  const dt = validateDateKey(dateTo)
  const where = buildWhereClause([`date_key BETWEEN '${df}' AND '${dt}'`, storeIdFilter(storeIds)])
  const sql = `
    SELECT
      day,
      type AS category_key,
      COALESCE(SUM(cost), 0) AS total_cost,
      COALESCE(SUM(price), 0) AS total_price
    FROM special_sales
    ${where}
    GROUP BY day, type
    ORDER BY day, type`
  return queryToObjects<CategoryDailyRow>(conn, sql)
}

/**
 * special_sales（花・産直）の合計
 */
export async function querySpecialSalesTotal(
  conn: AsyncDuckDBConnection,
  dateFrom: string,
  dateTo: string,
  storeIds?: readonly string[],
): Promise<readonly { categoryKey: string; totalCost: number; totalPrice: number }[]> {
  const df = validateDateKey(dateFrom)
  const dt = validateDateKey(dateTo)
  const where = buildWhereClause([`date_key BETWEEN '${df}' AND '${dt}'`, storeIdFilter(storeIds)])
  const sql = `
    SELECT
      type AS category_key,
      COALESCE(SUM(cost), 0) AS total_cost,
      COALESCE(SUM(price), 0) AS total_price
    FROM special_sales
    ${where}
    GROUP BY type`
  return queryToObjects<{ categoryKey: string; totalCost: number; totalPrice: number }>(conn, sql)
}

/**
 * transfers（店間・部門間）の日別集計
 */
export async function queryTransfersDaily(
  conn: AsyncDuckDBConnection,
  dateFrom: string,
  dateTo: string,
  storeIds?: readonly string[],
): Promise<readonly CategoryDailyRow[]> {
  const df = validateDateKey(dateFrom)
  const dt = validateDateKey(dateTo)
  const where = buildWhereClause([`date_key BETWEEN '${df}' AND '${dt}'`, storeIdFilter(storeIds)])
  const sql = `
    SELECT
      day,
      direction AS category_key,
      COALESCE(SUM(cost), 0) AS total_cost,
      COALESCE(SUM(price), 0) AS total_price
    FROM transfers
    ${where}
    GROUP BY day, direction
    ORDER BY day, direction`
  return queryToObjects<CategoryDailyRow>(conn, sql)
}

/**
 * transfers（店間・部門間）の合計
 */
export async function queryTransfersTotal(
  conn: AsyncDuckDBConnection,
  dateFrom: string,
  dateTo: string,
  storeIds?: readonly string[],
): Promise<readonly { categoryKey: string; totalCost: number; totalPrice: number }[]> {
  const df = validateDateKey(dateFrom)
  const dt = validateDateKey(dateTo)
  const where = buildWhereClause([`date_key BETWEEN '${df}' AND '${dt}'`, storeIdFilter(storeIds)])
  const sql = `
    SELECT
      direction AS category_key,
      COALESCE(SUM(cost), 0) AS total_cost,
      COALESCE(SUM(price), 0) AS total_price
    FROM transfers
    ${where}
    GROUP BY direction`
  return queryToObjects<{ categoryKey: string; totalCost: number; totalPrice: number }>(conn, sql)
}

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
  const df = validateDateKey(dateFrom)
  const dt = validateDateKey(dateTo)
  const where = buildWhereClause([
    `date_key BETWEEN '${df}' AND '${dt}'`,
    `is_prev_year = ${isPrevYear}`,
    storeIdFilter(storeIds),
  ])
  const sql = `
    SELECT COALESCE(SUM(sales_amount), 0) AS total_sales
    FROM classified_sales
    ${where}`
  const rows = await queryToObjects<SalesTotalRow>(conn, sql)
  return rows.length > 0 ? rows[0].totalSales : 0
}
