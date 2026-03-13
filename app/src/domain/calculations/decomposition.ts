/**
 * 要因分解・分析エクスポート
 */
// 要因分解（シャープリー値ベース）
// 関数は domain pure 参照実装から直接 export
export {
  decompose2,
  decompose3,
  decompose5,
  decomposePriceMix,
} from './factorDecomposition'
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

// 因果チェーン分析
export { buildCausalSteps, storeResultToCausalPrev } from './causalChain'
export type { ColorHint, CausalFactor, CausalStep, CausalChainPrevInput } from './causalChain'

// アラート・閾値（rules/ サブディレクトリ）
export { evaluateAlerts, evaluateAllStoreAlerts, DEFAULT_ALERT_RULES } from './rules/alertSystem'
export type { AlertRule, Alert, AlertSeverity, AlertRuleType } from './rules/alertSystem'

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
