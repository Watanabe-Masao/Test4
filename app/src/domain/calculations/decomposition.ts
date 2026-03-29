/**
 * 要因分解・分析エクスポート
 */
// 要因分解（シャープリー値ベース）
// 関数は domain pure 参照実装から直接 export
export { decompose2, decompose3, decompose5, decomposePriceMix } from './factorDecomposition'
// 型は domain の factorDecomposition.ts から直接 export（pure 参照実装）
export type {
  CategoryQtyAmt,
  TwoFactorResult,
  ThreeFactorResult,
  FiveFactorResult,
  PriceMixResult,
} from './factorDecomposition'

// 曜日ギャップ分析
export {
  analyzeDowGap,
  analyzeDowGapActualDay,
  countDowsInMonth,
  ZERO_DOW_GAP_ANALYSIS,
  ZERO_ACTUAL_DAY_IMPACT,
} from './dowGapAnalysis'

// 因果チェーン分析 → application/analysis/ に移動済み
// 消費者は @/application/analysis/causalChain から直接 import

// アラート・閾値 → application/rules/ に移動済み
// 消費者は @/application/rules/ から直接 import

// 相関分析・統計（algorithms/ サブディレクトリ）
export {
  pearsonCorrelation,
  correlationMatrix,
  normalizeMinMax,
  detectDivergence,
  cosineSimilarity,
  movingAverage as statisticalMovingAverage,
  calculateZScores,
} from './algorithms/correlation'
export type {
  CorrelationResult,
  NormalizedSeries,
  DivergencePoint,
  CorrelationMatrixCell,
} from './algorithms/correlation'
