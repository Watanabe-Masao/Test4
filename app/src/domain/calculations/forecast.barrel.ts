/**
 * 予測・トレンド分析エクスポート
 *
 * @responsibility R:unclassified
 */
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

// algorithms/ サブディレクトリ
export {
  calculateWMA,
  linearRegression,
  projectDowAdjusted,
  calculateMonthEndProjection,
} from './algorithms/advancedForecast'
export type {
  WMAEntry,
  MonthEndProjection,
  LinearRegressionResult,
} from './algorithms/advancedForecast'

export { analyzeTrend } from './algorithms/trendAnalysis'
export type { MonthlyDataPoint, TrendAnalysisResult } from './algorithms/trendAnalysis'

export {
  calculateSensitivity,
  calculateElasticity,
  extractSensitivityBase,
} from './algorithms/sensitivity'
export type {
  SensitivityBase,
  SensitivityDeltas,
  SensitivityResult,
  ElasticityResult,
} from './algorithms/sensitivity'

export { computeEstimatedInventory, computeEstimatedInventoryDetails } from './inventoryCalc'
export type { InventoryPoint, InventoryDetailRow } from './inventoryCalc'

export { calculatePinIntervals } from './pinIntervals'
export type { PinInterval } from './pinIntervals'
