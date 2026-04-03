/**
 * ガードテスト許可リスト — 型定義・ビルダー
 */

/**
 * 構造負債のライフサイクル分類。
 * - permanent: 構造上の理由で恒久的に残す（DI adapter, inherent complexity 等）
 * - retirement: 条件付きで除去可能（compat re-export, migration 等）
 * - active-debt: 設計作業が必要（専用比較設計, hotspot 分解等）
 */
export type AllowlistLifecycle = 'permanent' | 'retirement' | 'active-debt'

/** カテゴリ型の許可リストエントリ（ファイルパスの例外） */
export interface AllowlistEntry {
  readonly path: string
  readonly reason: string
  readonly category:
    | 'adapter'
    | 'bridge'
    | 'lifecycle'
    | 'legacy'
    | 'structural'
    | 'migration'
    | 'debt'
    | 'justified'
  readonly removalCondition: string
  /** 構造負債のライフサイクル。未指定は active-debt 扱い。 */
  readonly lifecycle?: AllowlistLifecycle
}

/** 数量型の許可リストエントリ（ファイルごとの数値上限） */
export interface QuantitativeAllowlistEntry extends AllowlistEntry {
  readonly limit: number
}

/** presentation direct query の rollout クラスター */
export type RolloutCluster = 'category' | 'time-slot' | 'standalone' | 'dashboard' | 'infra'

/** presentation direct query の分類 */
export type DirectQueryClassification = 'debt' | 'exception-design' | 'plan-bridge' | 'comment-only'

/** presentation 層の useQueryWithHandler 台帳エントリ */
export interface DirectQueryAuditEntry {
  readonly path: string
  readonly cluster: RolloutCluster
  readonly classification: DirectQueryClassification
  readonly reason: string
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
