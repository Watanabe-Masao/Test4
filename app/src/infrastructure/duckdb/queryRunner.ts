/**
 * DuckDB クエリ実行・結果変換ユーティリティ
 *
 * Arrow Table → JS Object[] 変換と snake_case → camelCase 変換を提供する。
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import { validateStoreId } from './queryParams'

/**
 * snake_case 文字列を camelCase に変換する。
 * 例: 'total_amount' → 'totalAmount', 'date_key' → 'dateKey'
 */
function snakeToCamel(s: string): string {
  return s.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase())
}

/**
 * Arrow StructRow から plain JS object に変換する。
 * DuckDB-WASM の toArray() が返す StructRow は Proxy ベースで、
 * JSON.stringify やスプレッド演算子では内部プロパティが正しく展開されない場合がある。
 */
function structRowToObject(row: Record<string, unknown>): Record<string, unknown> {
  const obj: Record<string, unknown> = {}
  for (const key of Object.keys(row)) {
    const val = row[key]
    // BigInt → number 変換（DuckDB の INTEGER は BigInt で返る場合がある）
    obj[snakeToCamel(key)] = typeof val === 'bigint' ? Number(val) : val
  }
  return obj
}

/**
 * SQL を実行し、結果を camelCase 変換済みの JS Object 配列として返す。
 */
export async function queryToObjects<T>(
  conn: AsyncDuckDBConnection,
  sql: string,
): Promise<readonly T[]> {
  const result = await conn.query(sql)
  const rows = result.toArray()
  return rows.map((row) => structRowToObject(row as Record<string, unknown>) as T)
}

/**
 * スカラー値（1行1列）を取得する。結果がなければ null。
 */
export async function queryScalar<T>(conn: AsyncDuckDBConnection, sql: string): Promise<T | null> {
  const result = await conn.query(sql)
  const rows = result.toArray()
  if (rows.length === 0) return null
  const row = rows[0] as Record<string, unknown>
  const keys = Object.keys(row)
  if (keys.length === 0) return null
  const val = row[keys[0]]
  if (typeof val === 'bigint') return Number(val) as T
  return val as T
}

/**
 * SQL の WHERE 句用フィルタ条件を生成するヘルパー。
 * NULL でない値のみ AND 条件に追加する。
 */
export function buildWhereClause(conditions: readonly (string | null)[]): string {
  const filtered = conditions.filter((c): c is string => c !== null)
  return filtered.length > 0 ? `WHERE ${filtered.join(' AND ')}` : ''
}

/**
 * store_id IN (...) 条件を生成する。
 * storeIds が空または未指定なら null（条件なし）を返す。
 * 各 ID はバリデーション済みであることが保証される。
 */
export function storeIdFilter(storeIds: readonly string[] | undefined): string | null {
  if (!storeIds || storeIds.length === 0) return null
  const validated = storeIds.map(validateStoreId)
  const quoted = validated.map((id) => `'${id.replace(/'/g, "''")}'`).join(', ')
  return `store_id IN (${quoted})`
}

/**
 * テーブルエイリアス付き store_id IN (...) 条件を生成する。
 * 従来の `.replace('store_id', ...)` パターンを安全に置き換える。
 */
export function storeIdFilterWithAlias(
  storeIds: readonly string[] | undefined,
  alias: string,
): string | null {
  if (!storeIds || storeIds.length === 0) return null
  const validated = storeIds.map(validateStoreId)
  const quoted = validated.map((id) => `'${id.replace(/'/g, "''")}'`).join(', ')
  return `${alias}.store_id IN (${quoted})`
}
