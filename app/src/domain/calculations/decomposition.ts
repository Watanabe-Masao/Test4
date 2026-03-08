/**
 * 要因分解・分析エクスポート
 */
// 要因分解（シャープリー値ベース）
export { decompose2, decompose3, decompose5, decomposePriceMix } from './factorDecomposition'
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

// アラート・閾値
export { evaluateAlerts, evaluateAllStoreAlerts, DEFAULT_ALERT_RULES } from './alertSystem'
export type { AlertRule, Alert, AlertSeverity, AlertRuleType } from './alertSystem'

// 相関分析・統計
export {
  pearsonCorrelation,
  correlationMatrix,
  normalizeMinMax,
  detectDivergence,
  cosineSimilarity,
  movingAverage as statisticalMovingAverage,
  calculateZScores,
} from './correlation'
export type {
  CorrelationResult,
  NormalizedSeries,
  DivergencePoint,
  CorrelationMatrixCell,
} from './correlation'
