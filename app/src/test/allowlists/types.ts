/**
 * ガードテスト許可リスト — 型定義・ビルダー
 */

/** カテゴリ型の許可リストエントリ（ファイルパスの例外） */
export interface AllowlistEntry {
  readonly path: string
  readonly reason: string
  readonly category: 'adapter' | 'bridge' | 'lifecycle' | 'legacy' | 'structural' | 'migration'
  readonly removalCondition: string
}

/** 数量型の許可リストエントリ（ファイルごとの数値上限） */
export interface QuantitativeAllowlistEntry extends AllowlistEntry {
  readonly limit: number
}

/** AllowlistEntry[] から path の Set を構築する */
export function buildAllowlistSet(entries: readonly AllowlistEntry[]): Set<string> {
  return new Set(entries.map((e) => e.path))
}

/** QuantitativeAllowlistEntry[] から path→limit の Record を構築する */
export function buildQuantitativeAllowlist(
  entries: readonly QuantitativeAllowlistEntry[],
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const e of entries) {
    result[e.path] = e.limit
  }
  return result
}
