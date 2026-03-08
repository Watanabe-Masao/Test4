// Utility
export {
  safeNumber,
  safeDivide,
  calculateTransactionValue,
  calculateItemsPerCustomer,
  calculateAveragePricePerItem,
  calculateMovingAverage,
  computeAverageDivisor,
  computeActiveDowDivisorMap,
} from './utils'
export type { AverageMode, AveragingContext } from './utils'

// フォーマット — 後方互換 re-export（新規コードは @/domain/formatting を直接使用）
export { formatCurrency, formatManYen, formatPercent, formatPointDiff } from '../formatting'

// 在庫法
export { calculateInvMethod } from './invMethod'
export type { InvMethodInput, InvMethodResult } from './invMethod'

// 推定法
export { calculateEstMethod, calculateCoreSales, calculateDiscountRate } from './estMethod'
export type { EstMethodInput, EstMethodResult } from './estMethod'

// 売変影響
export { calculateDiscountImpact } from './discountImpact'
export type { DiscountImpactInput, DiscountImpactResult } from './discountImpact'

// 予算分析
export { calculateBudgetAnalysis } from './budgetAnalysis'
export type { BudgetAnalysisInput, BudgetAnalysisResult } from './budgetAnalysis'

// 予測
export {
  calculateForecast,
  calculateWeeklySummaries,
  calculateDayOfWeekAverages,
  detectAnomalies,
  calculateStdDev,
  getWeekRanges,
} from './forecast'
export type {
  ForecastInput,
  ForecastResult,
  WeeklySummary,
  DayOfWeekAverage,
  AnomalyDetectionResult,
} from './forecast'

// 全店集計ユーティリティ
export { sumStoreValues, sumNullableValues, weightedAverageBySales } from './aggregation'

// ピン止め区間計算
export { calculatePinIntervals } from './pinIntervals'
export type { PinInterval } from './pinIntervals'

// 高度な予測分析
export {
  calculateWMA,
  linearRegression,
  projectDowAdjusted,
  calculateMonthEndProjection,
} from './advancedForecast'
export type { WMAEntry, MonthEndProjection, LinearRegressionResult } from './advancedForecast'

// アラート・閾値システム
export { evaluateAlerts, evaluateAllStoreAlerts, DEFAULT_ALERT_RULES } from './alertSystem'
export type { AlertRule, Alert, AlertSeverity, AlertRuleType } from './alertSystem'

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

// 在庫推定計算
export { computeEstimatedInventory, computeEstimatedInventoryDetails } from './inventoryCalc'
export type { InventoryPoint, InventoryDetailRow } from './inventoryCalc'

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

// 除数計算（CTS/DuckDB 共通）
export {
  computeDivisor,
  countDistinctDays,
  computeDowDivisorMap,
  filterByStore,
} from './divisor'
export type { AggregateMode } from './divisor'
