/**
 * Failure Semantics 共通型
 *
 * 運用状態を5語彙 + ready で統一する。
 * Weather / WASM / SW / chunk load が同じ型を使うことで、
 * Diagnostics UI やテストが統一的に扱える。
 */

/** 運用状態の5語彙 — 全 runtime contract で共通 */
export type AvailabilityStatus =
  | 'disabled' // 設定で明示的に無効化
  | 'unavailable' // 依存が存在しない（env 未設定等）
  | 'degraded' // 動作するが制約あり（フォールバック中）
  | 'failed' // 初期化・実行に失敗
  | 'stale' // 動作するが古い（SW version 不一致等）

export interface AvailabilityState<T = unknown> {
  readonly status: AvailabilityStatus | 'ready'
  readonly data?: T
  readonly reason?: string
}
