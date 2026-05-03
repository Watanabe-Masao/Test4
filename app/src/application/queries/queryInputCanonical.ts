/**
 * Query Input Canonicalization — query identity の正本化
 *
 * 同じ意味の入力が同じ cache key を生成することを保証する。
 * useQueryWithHandler の inputKey 算出で使用される。
 *
 * @invariant INV-RUN-01 Semantic Determinism
 * @see references/01-foundation/safe-performance-principles.md
 *
 * @responsibility R:unclassified
 */

/**
 * セット意味論を持つフィールド名の一覧。
 * これらのフィールドの配列値はソートされる（順序に意味がない）。
 * それ以外の配列は順序を保持する。
 */
const SET_SEMANTIC_FIELDS = new Set(['storeIds', 'dow', 'extraMetrics'])

/**
 * 任意のオブジェクトを正規化し、意味的に同一の入力が
 * JSON.stringify で同じ文字列を生成するようにする。
 *
 * - オブジェクトのキーをアルファベット順にソート（再帰的）
 * - セット意味論フィールドの配列のみソート（storeIds, dow 等）
 * - undefined フィールドを除去
 * - 空配列を undefined に正規化（[] → 除去）
 */
export function canonicalizeQueryInput<T>(input: T): T {
  return canonicalize(input, null) as T
}

function sortPrimitiveArray(arr: readonly unknown[]): unknown[] {
  return [...arr].sort((a, b) => {
    if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b)
    if (typeof a === 'number' && typeof b === 'number') return a - b
    return String(a).localeCompare(String(b))
  })
}

function canonicalize(value: unknown, fieldName: string | null): unknown {
  if (value === null || value === undefined) return value
  if (typeof value !== 'object') return value

  if (Array.isArray(value)) {
    if (value.length === 0) return undefined
    const allPrimitive = value.every(
      (v) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean',
    )
    if (allPrimitive && fieldName != null && SET_SEMANTIC_FIELDS.has(fieldName)) {
      return sortPrimitiveArray(value)
    }
    if (allPrimitive) {
      // 順序を保持（セット意味論でないフィールド）
      return [...value]
    }
    return value.map((v) => canonicalize(v, null))
  }

  const obj = value as Record<string, unknown>
  const sorted: Record<string, unknown> = {}
  const keys = Object.keys(obj).sort()
  for (const key of keys) {
    const v = canonicalize(obj[key], key)
    if (v !== undefined) {
      sorted[key] = v
    }
  }
  return sorted
}

/**
 * storeIds の正規化。sort + dedupe。空配列は undefined に正規化。
 */
export function normalizeStoreIds(ids?: readonly string[]): readonly string[] | undefined {
  if (!ids || ids.length === 0) return undefined
  return [...new Set(ids)].sort()
}

/**
 * 日付範囲の安定キー。
 */
export function stableDateRangeKey(dateFrom: string, dateTo: string): string {
  return `${dateFrom}..${dateTo}`
}
