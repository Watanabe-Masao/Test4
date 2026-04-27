/**
 * 相関分析・正規化・類似度計算
 *
 * 統合タイムラインや店舗クラスタリングで使用する
 * 統計的な分析の純粋関数群。
 *
 * @responsibility R:unclassified
 */
import { z } from 'zod'
import { safeDivide } from '../utils'
import { DIVERGENCE_DETECTION_THRESHOLD } from '@/domain/constants'

// ─── Zod Schemas ─────────────────────────────────────

export const CorrelationResultSchema = z.object({
  r: z.number(),
  n: z.number(),
})
export type CorrelationResult = z.infer<typeof CorrelationResultSchema>

export const NormalizedSeriesSchema = z.object({
  values: z.array(z.number()).readonly(),
  min: z.number(),
  max: z.number(),
  range: z.number(),
})
export type NormalizedSeries = z.infer<typeof NormalizedSeriesSchema>

export const DivergencePointSchema = z.object({
  index: z.number(),
  seriesAValue: z.number(),
  seriesBValue: z.number(),
  divergence: z.number(),
  isSignificant: z.boolean(),
})
export type DivergencePoint = z.infer<typeof DivergencePointSchema>

export const CorrelationMatrixCellSchema = z.object({
  seriesA: z.string(),
  seriesB: z.string(),
  correlation: CorrelationResultSchema,
})
export type CorrelationMatrixCell = z.infer<typeof CorrelationMatrixCellSchema>

// ─── Correlation ──────────────────────────────────────

/**
 * ピアソンの積率相関係数を計算する。
 *
 * r = Σ((xi-x̄)(yi-ȳ)) / √(Σ(xi-x̄)² × Σ(yi-ȳ)²)
 *
 * @param xs 系列A
 * @param ys 系列B（xsと同じ長さ）
 * @returns 相関係数r（-1 ～ 1）。データ不足時はr=0
 */
export function pearsonCorrelation(
  xs: readonly number[],
  ys: readonly number[],
): CorrelationResult {
  const n = Math.min(xs.length, ys.length)
  if (n < 2) return { r: 0, n }

  let sumX = 0
  let sumY = 0
  for (let i = 0; i < n; i++) {
    sumX += xs[i]
    sumY += ys[i]
  }
  const meanX = safeDivide(sumX, n, 0)
  const meanY = safeDivide(sumY, n, 0)

  let covXY = 0
  let varX = 0
  let varY = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX
    const dy = ys[i] - meanY
    covXY += dx * dy
    varX += dx * dx
    varY += dy * dy
  }

  const denominator = Math.sqrt(varX * varY)
  const r = safeDivide(covXY, denominator, 0)

  // 浮動小数点誤差で ±1 を超える場合のクランプ
  return { r: Math.max(-1, Math.min(1, r)), n }
}

/**
 * 相関マトリクスを計算する。
 *
 * 複数の名前付き系列間の全ペアワイズ相関を計算。
 *
 * @param series { name: string, values: number[] } の配列
 * @returns 上三角行列のセル配列
 */
export function correlationMatrix(
  series: readonly { readonly name: string; readonly values: readonly number[] }[],
): readonly CorrelationMatrixCell[] {
  const cells: CorrelationMatrixCell[] = []

  for (let i = 0; i < series.length; i++) {
    for (let j = i + 1; j < series.length; j++) {
      cells.push({
        seriesA: series[i].name,
        seriesB: series[j].name,
        correlation: pearsonCorrelation(series[i].values, series[j].values),
      })
    }
  }

  return cells
}

// ─── Normalization ────────────────────────────────────

/** 正規化の中点（全値同一の場合のデフォルト値） */
const NORMALIZATION_MIDPOINT = 50

/** 正規化のスケール上限（0-100） */
const NORMALIZATION_SCALE = 100

/**
 * Min-Max正規化（0-100スケール）。
 *
 * 統合タイムラインで異なるスケールの指標を重ね描きする際に使用。
 *
 * @param values 元データ系列
 * @returns 正規化された系列（全値が同一の場合は全て50）
 */
export function normalizeMinMax(values: readonly number[]): NormalizedSeries {
  if (values.length === 0) {
    return { values: [], min: 0, max: 0, range: 0 }
  }

  let min = Infinity
  let max = -Infinity
  for (const v of values) {
    if (v < min) min = v
    if (v > max) max = v
  }

  const range = max - min
  if (range === 0) {
    return {
      values: values.map(() => NORMALIZATION_MIDPOINT),
      min,
      max,
      range: 0,
    }
  }

  return {
    values: values.map((v) => safeDivide(v - min, range, 0) * NORMALIZATION_SCALE),
    min,
    max,
    range,
  }
}

// ─── Divergence Detection ─────────────────────────────

/**
 * 2系列間の乖離を検出する。
 *
 * 正規化した2系列の差分が閾値を超えた点を返す。
 * 統合タイムラインで「通常の相関から外れた期間」のハイライトに使用。
 *
 * @param seriesA 系列A（元データ）
 * @param seriesB 系列B（元データ）
 * @param threshold 乖離閾値（正規化スケール0-100上での差分、デフォルト30）
 */
export function detectDivergence(
  seriesA: readonly number[],
  seriesB: readonly number[],
  threshold = DIVERGENCE_DETECTION_THRESHOLD,
): readonly DivergencePoint[] {
  const normA = normalizeMinMax(seriesA)
  const normB = normalizeMinMax(seriesB)
  const n = Math.min(normA.values.length, normB.values.length)

  const points: DivergencePoint[] = []
  for (let i = 0; i < n; i++) {
    const divergence = Math.abs(normA.values[i] - normB.values[i])
    points.push({
      index: i,
      seriesAValue: seriesA[i],
      seriesBValue: seriesB[i],
      divergence,
      isSignificant: divergence > threshold,
    })
  }

  return points
}

// ─── Cosine Similarity ────────────────────────────────

/**
 * コサイン類似度を計算する。
 *
 * 店舗間の時間帯パターン比較に使用。
 * cos(θ) = (A·B) / (|A| × |B|)
 *
 * @returns 類似度（0 ～ 1）。ゼロベクトルの場合は0
 */
export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  const n = Math.min(a.length, b.length)
  if (n === 0) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < n; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  return safeDivide(dotProduct, denominator, 0)
}

/**
 * 移動平均を計算する（乖離検出のスムージング用）。
 *
 * @param values 元データ
 * @param window ウィンドウサイズ
 * @returns 移動平均値の配列（先頭 window-1 個は元値をそのまま使用）
 */
export function movingAverage(values: readonly number[], window: number): readonly number[] {
  if (window <= 1 || values.length === 0) return [...values]

  const result: number[] = []
  for (let i = 0; i < values.length; i++) {
    if (i < window - 1) {
      result.push(values[i])
    } else {
      let sum = 0
      for (let j = i - window + 1; j <= i; j++) {
        sum += values[j]
      }
      result.push(safeDivide(sum, window, 0))
    }
  }
  return result
}

/**
 * Zスコアを計算する。
 *
 * 各値が平均からどれだけ離れているかを標準偏差の倍数で表す。
 * 時間帯ヒートマップの異常セル検出に使用。
 *
 * @param values データ系列
 * @returns Zスコアの配列（stdDev=0の場合は全て0）
 */
export function calculateZScores(values: readonly number[]): readonly number[] {
  if (values.length === 0) return []

  let sum = 0
  for (const v of values) sum += v
  const mean = safeDivide(sum, values.length, 0)

  let variance = 0
  for (const v of values) variance += (v - mean) ** 2
  const stdDev = Math.sqrt(safeDivide(variance, values.length, 0))

  if (stdDev === 0) return values.map(() => 0)

  return values.map((v) => safeDivide(v - mean, stdDev, 0))
}
