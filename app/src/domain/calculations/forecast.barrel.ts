/**
 * 予測・トレンド分析エクスポート
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

export {
  calculateWMA,
  linearRegression,
  projectDowAdjusted,
  calculateMonthEndProjection,
} from './advancedForecast'
export type { WMAEntry, MonthEndProjection, LinearRegressionResult } from './advancedForecast'

export { analyzeTrend } from './trendAnalysis'
export type { MonthlyDataPoint, TrendAnalysisResult } from './trendAnalysis'

export { calculateSensitivity, calculateElasticity, extractSensitivityBase } from './sensitivity'
export type {
  SensitivityBase,
  SensitivityDeltas,
  SensitivityResult,
  ElasticityResult,
} from './sensitivity'

export { computeEstimatedInventory, computeEstimatedInventoryDetails } from './inventoryCalc'
export type { InventoryPoint, InventoryDetailRow } from './inventoryCalc'

export { calculatePinIntervals } from './pinIntervals'
export type { PinInterval } from './pinIntervals'
