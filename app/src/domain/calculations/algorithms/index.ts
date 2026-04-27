/**
 * 統計的アルゴリズム（ドメイン非依存）
 *
 * 相関分析、トレンド分析、感度分析、高度予測など、
 * ビジネスドメインに依存しない数学的・統計的アルゴリズム群。
 *
 * @responsibility R:unclassified
 */

// 相関分析・正規化・類似度
export {
  pearsonCorrelation,
  correlationMatrix,
  normalizeMinMax,
  detectDivergence,
  cosineSimilarity,
  movingAverage,
  calculateZScores,
} from './correlation'
export type {
  CorrelationResult,
  NormalizedSeries,
  DivergencePoint,
  CorrelationMatrixCell,
} from './correlation'

// トレンド分析
export { analyzeTrend } from './trendAnalysis'
export type { MonthlyDataPoint, TrendAnalysisResult } from './trendAnalysis'

// 感度分析
export { calculateSensitivity, calculateElasticity, extractSensitivityBase } from './sensitivity'
export type {
  SensitivityBase,
  SensitivityDeltas,
  SensitivityResult,
  ElasticityResult,
} from './sensitivity'

// 高度予測
export {
  calculateWMA,
  linearRegression,
  projectDowAdjusted,
  calculateMonthEndProjection,
} from './advancedForecast'
export type { WMAEntry, MonthEndProjection, LinearRegressionResult } from './advancedForecast'
