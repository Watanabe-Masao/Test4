/**
 * ガードテスト許可リスト — 型定義・ビルダー
 *
 * == AAG 3 層分離 ==
 * - Core 型（AllowlistEntry, AllowlistLifecycle, CoreRetentionReason）→ 本ファイル
 * - App 固有（AppRetentionReason: display-only, no-readmodels）→ 本ファイル（将来 App Domain へ）
 * - RetentionReason = Core | App の union（後方互換）
 */

/**
 * 構造負債のライフサイクル分類（Core）。
 * - permanent: 構造上の理由で恒久的に残す（DI adapter, inherent complexity 等）
 * - retirement: 条件付きで除去可能（compat re-export, migration 等）
 * - active-debt: 設計作業が必要（専用比較設計, hotspot 分解等）
 */
export type AllowlistLifecycle = 'permanent' | 'retirement' | 'active-debt'

/**
 * Core 残留理由 — プロジェクト横断で再利用可能。
 * - detection-limit: guard 検出精度の限界（ローカル変数名、コメント等の誤検知）
 * - structural: 構造的複雑性。リファクタリングが必要
 * - fallback: 正本未提供時の安全な fallback 経路
 */
export type CoreRetentionReason = 'detection-limit' | 'structural' | 'fallback'

/**
 * App 固有残留理由 — 粗利管理ツール固有。
 * - display-only: 表示用途のみ。分析入力ではない
 * - no-readmodels: 正本（readModels）へのアクセス経路が未配線
 */
export type AppRetentionReason = 'display-only' | 'no-readmodels'

/**
 * 残留理由の構造化分類（Core | App の union）。
 * Discovery Review で「この分類はまだ正しいか？」を検証する。
 */
export type RetentionReason = CoreRetentionReason | AppRetentionReason

/**
 * 除去条件の構造化分類。
 * removalCondition（自由文）を補完する機械処理可能な分類。
 * - retire-when: 条件が満たされたら除去（例: readModel 移行完了時）
 * - remove-after: 期限後に除去（例: 移行期間終了後）
 * - block-until: 前提が完了するまで除去不可（例: Phase X 完了まで）
 */
export type RemovalKind = 'retire-when' | 'remove-after' | 'block-until'

/** カテゴリ型の許可リストエントリ（ファイルパスの例外） */
export interface AllowlistEntry {
  readonly path: string
  /** どの Architecture Rule の例外か（例: 'AR-G5-HOOK-MEMO'） */
  readonly ruleId?: string
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
  /** 除去条件の構造化分類。removalCondition（自由文）を補完する機械処理可能な分類 */
  readonly removalKind?: RemovalKind
  /** 構造負債のライフサイクル。未指定は active-debt 扱い。 */
  readonly lifecycle?: AllowlistLifecycle
  /**
   * 残留理由の構造化分類。Discovery Review の棚卸しで使用。
   * @see references/01-principles/adaptive-governance-evolution.md
   */
  readonly retentionReason?: RetentionReason
  // ── 時間軸（Temporal Governance） ──
  /** 例外の作成日（YYYY-MM-DD） */
  readonly createdAt?: string
  /** 有効期限（active-debt のみ推奨） */
  readonly expiresAt?: string
  /** 延長回数（2 超でルール review 強制） */
  readonly renewalCount?: number
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
