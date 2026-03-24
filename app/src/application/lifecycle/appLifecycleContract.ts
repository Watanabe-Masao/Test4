/**
 * App Lifecycle 契約型定義
 *
 * アプリ全体のライフサイクル状態を application 層で一元管理する。
 * UI はこの契約が供給する状態を描画するだけで、状態の生成・判断を行わない。
 *
 * @see references/01-principles/app-lifecycle-principles.md
 */

// ─── ライフサイクルフェーズ ─────────────────────────────────

/** アプリ全体の起動・準備・稼働状態 */
export type AppLifecyclePhase =
  | 'booting' // 初期起動中（復元前）
  | 'restoring' // IndexedDB からデータ復元中
  | 'initializing_engine' // DuckDB WASM エンジン初期化中
  | 'loading_data' // DuckDB へのデータロード中
  | 'applying_update' // Service Worker 更新適用中（リロード予告）
  | 'ready' // 稼働可能
  | 'error' // 致命的エラー

// ─── ライフサイクルステータス ──────────────────────────────

/** UI が解釈なしでそのまま利用できるステータス */
export interface AppLifecycleStatus {
  /** 現在のフェーズ */
  readonly phase: AppLifecyclePhase
  /** true の場合、UI 操作をブロックしオーバーレイを表示する */
  readonly blocking: boolean
  /** エラーメッセージ（phase === 'error' 時） */
  readonly error: string | null
}

// ─── blocking 判定 ────────────────────────────────────────

/** blocking フェーズの集合（ready / error 以外は全て blocking） */
const BLOCKING_PHASES: ReadonlySet<AppLifecyclePhase> = new Set<AppLifecyclePhase>([
  'booting',
  'restoring',
  'initializing_engine',
  'loading_data',
  'applying_update',
])

export function isBlockingPhase(phase: AppLifecyclePhase): boolean {
  return BLOCKING_PHASES.has(phase)
}

// ─── データ準備状態（ready 後の判定用）────────────────────

/** ready 後の空状態バリアント */
export type AppReadiness =
  | { readonly kind: 'not_ready' }
  | { readonly kind: 'ready_with_data' }
  | { readonly kind: 'ready_empty_import' } // データ未投入
  | { readonly kind: 'ready_empty_result' } // 条件に一致する結果なし
