/**
 * CalculationResult — 計算結果の標準型
 *
 * 0 / null / 計算不能 / 推定値 / 異常値 の境界を明示する。
 * safeDivide(..., 0) による意味潰しを防ぎ、UI が warning を拾えるようにする。
 *
 * 参照: references/01-principles/observation-period-spec.md (status 定義)
 */

/** 計算結果のステータス */
export type CalculationStatus = 'ok' | 'undefined' | 'estimated' | 'partial' | 'invalid'

/** 計算結果の標準型 */
export interface CalculationResult<T> {
  /** 計算値。invalid/undefined 時は null */
  readonly value: T | null
  /** 計算の状態 */
  readonly status: CalculationStatus
  /** 警告メッセージ（空配列 = 警告なし） */
  readonly warnings: readonly string[]
}

/** ok 状態の結果を生成する */
export function okResult<T>(value: T, warnings?: readonly string[]): CalculationResult<T> {
  return { value, status: 'ok', warnings: warnings ?? [] }
}

/** invalid 状態の結果を生成する */
export function invalidResult<T>(warnings: readonly string[]): CalculationResult<T> {
  return { value: null, status: 'invalid', warnings }
}

/** undefined 状態の結果を生成する */
export function undefinedResult<T>(warnings?: readonly string[]): CalculationResult<T> {
  return { value: null, status: 'undefined', warnings: warnings ?? [] }
}
