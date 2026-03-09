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
