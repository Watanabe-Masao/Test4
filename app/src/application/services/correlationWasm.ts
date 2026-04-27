/**
 * correlation WASM wrapper (candidate)
 * @contractId ANA-005
 * @semanticClass analytic
 * @authorityKind candidate-authoritative
 *
 * @responsibility R:unclassified
 */
import type {
  CorrelationResult,
  NormalizedSeries,
  DivergencePoint,
} from '@/domain/calculations/algorithms/correlation'
import { DIVERGENCE_DETECTION_THRESHOLD } from '@/domain/constants'
import { getCorrelationWasmExports } from './wasmEngine'

function getWasm() {
  return getCorrelationWasmExports()!
}

export function pearsonCorrelationWasm(
  xs: readonly number[],
  ys: readonly number[],
): CorrelationResult {
  const wasm = getWasm()
  const arr = wasm.pearson_correlation(new Float64Array(xs), new Float64Array(ys))
  return { r: arr[0], n: arr[1] }
}

export function cosineSimilarityWasm(a: readonly number[], b: readonly number[]): number {
  const wasm = getWasm()
  return wasm.cosine_similarity(new Float64Array(a), new Float64Array(b))
}

export function normalizeMinMaxWasm(values: readonly number[]): NormalizedSeries {
  const wasm = getWasm()
  const arr = wasm.normalize_min_max(new Float64Array(values))
  const min = arr[0]
  const max = arr[1]
  const range = arr[2]
  const normalized: number[] = []
  for (let i = 3; i < arr.length; i++) normalized.push(arr[i])
  return { values: normalized, min, max, range }
}

export function detectDivergenceWasm(
  seriesA: readonly number[],
  seriesB: readonly number[],
  threshold = DIVERGENCE_DETECTION_THRESHOLD,
): readonly DivergencePoint[] {
  const wasm = getWasm()
  const arr = wasm.detect_divergence(
    new Float64Array(seriesA),
    new Float64Array(seriesB),
    threshold,
  )
  const points: DivergencePoint[] = []
  for (let i = 0; i < arr.length; i += 5) {
    points.push({
      index: arr[i],
      seriesAValue: arr[i + 1],
      seriesBValue: arr[i + 2],
      divergence: arr[i + 3],
      isSignificant: arr[i + 4] === 1.0,
    })
  }
  return points
}

export function movingAverageWasm(values: readonly number[], window: number): readonly number[] {
  const wasm = getWasm()
  return Array.from(wasm.moving_average(new Float64Array(values), window))
}

export function calculateZScoresWasm(values: readonly number[]): readonly number[] {
  const wasm = getWasm()
  return Array.from(wasm.calculate_z_scores(new Float64Array(values)))
}
