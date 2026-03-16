/**
 * 曜日ギャップ分析の統計ヘルパー（pure functions）
 *
 * 小標本（n=4-5）の小売データに適した統計手法を提供する。
 *
 * - calcMedian: 中央値（外れ値に強い）
 * - calcAdjustedMean: MADベースで外れ値を除外した調整平均
 * - computeDowStatistics: 曜日別の統計情報（mean/median/adjustedMean/CV）
 */

import type { DowGapMethod, DowStatistics } from '@/domain/models/ComparisonContext'
import { safeDivide } from './utils'

/**
 * MADベース外れ値検出の定数（Iglewicz & Hoaglin 推奨値）
 *
 * CONSISTENCY_CONSTANT: 正規分布の場合に MAD を σ に近似するための定数 (1/Φ^{-1}(3/4))
 * MODIFIED_Z_THRESHOLD: 外れ値と判定する modified z-score の閾値
 */
const CONSISTENCY_CONSTANT = 0.6745
const MODIFIED_Z_THRESHOLD = 3.5

/** 中央値を算出する。空配列なら 0 */
export function calcMedian(values: readonly number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

/**
 * 調整平均: MAD（中央絶対偏差）ベースで外れ値を除外して再計算。
 *
 * 小標本（n=4-5）ではz-score法は外れ値自身がstddevを膨張させるため
 * 検出力が低い（masking effect）。MADは中央値ベースのためロバスト。
 *
 * Modified z-score = CONSISTENCY_CONSTANT × |x - median| / MAD
 * 閾値 > MODIFIED_Z_THRESHOLD で外れ値判定
 *
 * 全除外の場合は元の平均を返す（フォールバック）。
 */
export function calcAdjustedMean(values: readonly number[]): number {
  if (values.length === 0) return 0
  const mean = safeDivide(
    values.reduce((s, v) => s + v, 0),
    values.length,
    0,
  )
  if (values.length < 3) return mean // 2件以下では外れ値判定不能
  const med = calcMedian(values)
  const absDeviations = values.map((v) => Math.abs(v - med))
  const mad = calcMedian(absDeviations)
  if (mad === 0) return mean // 全同値（or 過半数が同値）
  const filtered = values.filter(
    (v) => safeDivide(CONSISTENCY_CONSTANT * Math.abs(v - med), mad, 0) <= MODIFIED_Z_THRESHOLD,
  )
  if (filtered.length === 0) return mean
  return safeDivide(
    filtered.reduce((s, v) => s + v, 0),
    filtered.length,
    0,
  )
}

/** 曜日別の統計情報を算出する */
export function computeDowStatistics(values: readonly number[]): DowStatistics {
  const n = values.length
  if (n === 0) return { mean: 0, median: 0, adjustedMean: 0, cv: 0, n: 0 }
  const mean = safeDivide(
    values.reduce((s, v) => s + v, 0),
    n,
    0,
  )
  const median = calcMedian(values)
  const adjustedMean = calcAdjustedMean(values)
  const variance = safeDivide(
    values.reduce((s, v) => s + (v - mean) ** 2, 0),
    n,
    0,
  )
  const stddev = Math.sqrt(variance)
  const cv = safeDivide(stddev, mean, 0)
  return { mean, median, adjustedMean, cv, n }
}

/** 手法に応じた代表値を DowStatistics から取得する */
export function pickStatValue(stats: DowStatistics, method: DowGapMethod): number {
  switch (method) {
    case 'mean':
      return stats.mean
    case 'median':
      return stats.median
    case 'adjustedMean':
      return stats.adjustedMean
  }
}
