/**
 * Arrow StructRow → JS Object 変換ユーティリティ
 *
 * DuckDB-WASM が返す Arrow StructRow を plain JS object に変換する。
 * queryRunner.ts と worker/workerHandlers.ts の両方から使用される。
 */

/**
 * snake_case 文字列を camelCase に変換する。
 * 例: 'total_amount' → 'totalAmount', 'date_key' → 'dateKey'
 */
export function snakeToCamel(s: string): string {
  return s.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase())
}

/**
 * Arrow StructRow から plain JS object に変換する。
 * DuckDB-WASM の toArray() が返す StructRow は Proxy ベースで、
 * JSON.stringify やスプレッド演算子では内部プロパティが正しく展開されない場合がある。
 */
export function structRowToObject(row: Record<string, unknown>): Record<string, unknown> {
  const obj: Record<string, unknown> = {}
  for (const key of Object.keys(row)) {
    const val = row[key]
    // BigInt → number 変換（DuckDB の INTEGER は BigInt で返る場合がある）
    obj[snakeToCamel(key)] = typeof val === 'bigint' ? Number(val) : val
  }
  return obj
}
