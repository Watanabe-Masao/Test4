/**
 * correlation-wasm 型付きモック（candidate: ANA-005）
 */
import {
  pearsonCorrelation,
  normalizeMinMax,
  cosineSimilarity,
  movingAverage,
  calculateZScores,
  detectDivergence,
} from '@/domain/calculations/algorithms/correlation'
import { DIVERGENCE_DETECTION_THRESHOLD } from '@/domain/constants'

export default function init(): Promise<void> {
  return Promise.resolve()
}

export function pearson_correlation(xs: Float64Array, ys: Float64Array): Float64Array {
  const r = pearsonCorrelation(Array.from(xs), Array.from(ys))
  return new Float64Array([r.r, r.n])
}

export function cosine_similarity(a: Float64Array, b: Float64Array): number {
  return cosineSimilarity(Array.from(a), Array.from(b))
}

export function normalize_min_max(values: Float64Array): Float64Array {
  const r = normalizeMinMax(Array.from(values))
  return new Float64Array([r.min, r.max, r.range, ...r.values])
}

export function detect_divergence(
  seriesA: Float64Array,
  seriesB: Float64Array,
  threshold: number,
): Float64Array {
  const points = detectDivergence(
    Array.from(seriesA),
    Array.from(seriesB),
    threshold || DIVERGENCE_DETECTION_THRESHOLD,
  )
  const result: number[] = []
  for (const p of points) {
    result.push(p.index, p.seriesAValue, p.seriesBValue, p.divergence, p.isSignificant ? 1.0 : 0.0)
  }
  return new Float64Array(result)
}

export function moving_average(values: Float64Array, window: number): Float64Array {
  return new Float64Array(movingAverage(Array.from(values), window))
}

export function calculate_z_scores(values: Float64Array): Float64Array {
  return new Float64Array(calculateZScores(Array.from(values)))
}
