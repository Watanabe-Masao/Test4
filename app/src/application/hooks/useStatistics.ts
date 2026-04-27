/**
 * 統計・分析関数のアプリケーション層バレル
 *
 * presentation 層が domain/calculations/ の統計モジュールを直接参照することを避け、
 * application 層経由で提供する。
 *
 * @responsibility R:unclassified
 */
// ── 相関・統計 ──────────────────────────────────────────
export {
  pearsonCorrelation,
  normalizeMinMax,
  detectDivergence,
  cosineSimilarity,
  movingAverage,
} from '@/domain/calculations/algorithms/correlation'

export type {
  CorrelationResult,
  NormalizedSeries,
  DivergencePoint,
} from '@/domain/calculations/algorithms/correlation'

// ── トレンド分析 ────────────────────────────────────────
// bridge 経由: forecast 関連の全 call path を統一する
export { analyzeTrend } from '@/application/services/forecastBridge'
export type { MonthlyDataPoint, TrendAnalysisResult } from '@/application/services/forecastBridge'

// ── 高度な予測・回帰 ───────────────────────────────────
export {
  linearRegression,
  calculateWMA,
  calculateMonthEndProjection,
} from '@/application/services/forecastBridge'

export type {
  LinearRegressionResult,
  WMAEntry,
  MonthEndProjection,
} from '@/application/services/forecastBridge'

// ── 標準偏差（forecast モジュール内） ──────────────────
export { calculateStdDev } from '@/application/services/forecastBridge'

// ── Z-score / 母標準偏差（rawAggregation より） ────────
export {
  zScore,
  stddevPop,
  coefficientOfVariation,
} from '@/domain/calculations/rawAggregation/statisticalFunctions'
