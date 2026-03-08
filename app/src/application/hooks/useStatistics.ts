/**
 * 統計・分析関数のアプリケーション層バレル
 *
 * presentation 層が domain/calculations/ の統計モジュールを直接参照することを避け、
 * application 層経由で提供する。
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
export { analyzeTrend } from '@/domain/calculations/algorithms/trendAnalysis'
export type {
  MonthlyDataPoint,
  TrendAnalysisResult,
} from '@/domain/calculations/algorithms/trendAnalysis'

// ── 高度な予測・回帰 ───────────────────────────────────
export {
  linearRegression,
  calculateWMA,
  calculateMonthEndProjection,
} from '@/domain/calculations/algorithms/advancedForecast'

export type {
  LinearRegressionResult,
  WMAEntry,
  MonthEndProjection,
} from '@/domain/calculations/algorithms/advancedForecast'

// ── 標準偏差（forecast モジュール内） ──────────────────
export { calculateStdDev } from '@/domain/calculations/forecast'
