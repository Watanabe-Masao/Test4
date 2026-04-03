/**
 * Runtime State Machine 型定義
 *
 * DuckDB エンジン・データロード・復旧の状態遷移を型安全に表現する。
 *
 * 状態遷移:
 *   idle → booting → loading-cache → ready
 *                                  → recovering → ready
 *                                  → degraded
 *                  → failed
 */

/** Runtime の全体状態フェーズ */
export type RuntimePhase =
  | 'idle'
  | 'booting'
  | 'loading-cache'
  | 'ready'
  | 'recovering'
  | 'degraded'
  | 'failed'

/** Runtime 状態の詳細情報 */
export interface RuntimeState {
  readonly phase: RuntimePhase
  /** エラーが発生している場合のメッセージ */
  readonly error: string | null
  /** DuckDB エンジンが利用可能か */
  readonly engineAvailable: boolean
  /** データロードが完了しているか */
  readonly dataLoaded: boolean
}

/** Runtime 状態のブロッキング判定 */
export function isBlockingPhase(phase: RuntimePhase): boolean {
  return phase !== 'ready' && phase !== 'degraded'
}

/** Runtime 状態の初期値 */
export const INITIAL_RUNTIME_STATE: RuntimeState = {
  phase: 'idle',
  error: null,
  engineAvailable: false,
  dataLoaded: false,
} as const
