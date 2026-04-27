/**
 * 統計量計算関数群（純粋関数）
 *
 * rawAggregation から抽出。標準偏差、Z-score、変動係数を担う。
 *
 * @responsibility R:unclassified
 */
import { safeDivide } from '../utils'

/**
 * 母標準偏差（STDDEV_POP）を計算する。
 */
export function stddevPop(values: readonly number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

/**
 * Z-score を計算する。
 *
 * stddev が 0 の場合は 0 を返す。
 */
export function zScore(value: number, mean: number, stddev: number): number {
  return safeDivide(value - mean, stddev, 0)
}

/**
 * 変動係数（CV: Coefficient of Variation）を計算する。
 *
 * mean が 0 の場合は 0 を返す。
 */
export function coefficientOfVariation(values: readonly number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  return safeDivide(stddevPop(values), mean, 0)
}
