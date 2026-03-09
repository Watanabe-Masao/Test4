/**
 * 仕入比較クエリモジュール
 *
 * purchase テーブルから当年・前年の取引先別仕入データを集約し、
 * 前年比較用の構造化データを返す。
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import { queryToObjects, buildWhereClause, storeIdFilter } from '../queryRunner'

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

// ── クエリ関数 ──

/**
 * 指定年月の取引先別仕入集計を取得する
 */
export async function queryPurchaseBySupplier(
  conn: AsyncDuckDBConnection,
  year: number,
  month: number,
  storeIds?: readonly string[],
): Promise<readonly PurchaseSupplierRow[]> {
  const where = buildWhereClause([
    `year = ${year}`,
    `month = ${month}`,
    storeIdFilter(storeIds),
  ])
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
 * 指定年月の仕入合計を取得する
 */
export async function queryPurchaseTotal(
  conn: AsyncDuckDBConnection,
  year: number,
  month: number,
  storeIds?: readonly string[],
): Promise<PurchaseTotalRow> {
  const where = buildWhereClause([
    `year = ${year}`,
    `month = ${month}`,
    storeIdFilter(storeIds),
  ])
  const sql = `
    SELECT
      COALESCE(SUM(cost), 0) AS total_cost,
      COALESCE(SUM(price), 0) AS total_price
    FROM purchase
    ${where}`
  const rows = await queryToObjects<PurchaseTotalRow>(conn, sql)
  return rows.length > 0 ? rows[0] : { totalCost: 0, totalPrice: 0 }
}
