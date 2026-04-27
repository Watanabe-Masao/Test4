/**
 * Arrow StructRow → JS Object 変換ユーティリティ
 *
 * DuckDB-WASM が返す Arrow StructRow を plain JS object に変換する。
 * queryRunner.ts と worker/workerHandlers.ts の両方から使用される。
 *
 * @responsibility R:unclassified
 */

/**
 * snake_case 文字列を camelCase に変換する。
 * 例: 'total_amount' → 'totalAmount', 'date_key' → 'dateKey'
 */
export function snakeToCamel(s: string): string {
  return s.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase())
}

/**
 * DuckDB-WASM / Arrow が返す数値型を JS number へ正規化する。
 *
 * - bigint（BIGINT / INTEGER 64bit）: Number(val)
 * - HUGEINT / DECIMAL128（Uint32Array(4) として返ることがある）: リトルエンディアンを number に合成
 * - その他の数値互換オブジェクト（valueOf が number/bigint を返す）: 取り出して変換
 * - 上記に該当しない値はそのまま返す（Zod 側で検証する）
 */
export function normalizeNumeric(val: unknown): unknown {
  if (typeof val === 'bigint') return Number(val)
  // Arrow Decimal128 / HUGEINT は Uint32Array(4) で返る場合がある（little-endian）
  if (val instanceof Uint32Array && val.length === 4) {
    // 下位 64bit を number に、上位 64bit は safe-int 内なら合成
    const low = val[0]! + val[1]! * 0x1_0000_0000
    const highLow = val[2]!
    const highHigh = val[3]!
    if (highLow === 0 && highHigh === 0) return low
    // 上位があれば bigint 経由で合成（精度は落ちるが number は保持）
    const big =
      BigInt(val[0]!) |
      (BigInt(val[1]!) << 32n) |
      (BigInt(val[2]!) << 64n) |
      (BigInt(val[3]!) << 96n)
    return Number(big)
  }
  if (val != null && typeof val === 'object' && 'valueOf' in val) {
    const primitive = (val as { valueOf: () => unknown }).valueOf()
    if (typeof primitive === 'number') return primitive
    if (typeof primitive === 'bigint') return Number(primitive)
  }
  return val
}

/**
 * Arrow StructRow から plain JS object に変換する。
 * DuckDB-WASM の toArray() が返す StructRow は Proxy ベースで、
 * JSON.stringify やスプレッド演算子では内部プロパティが正しく展開されない場合がある。
 */
export function structRowToObject(row: Record<string, unknown>): Record<string, unknown> {
  const obj: Record<string, unknown> = {}
  for (const key of Object.keys(row)) {
    obj[snakeToCamel(key)] = normalizeNumeric(row[key])
  }
  return obj
}
