// Utility
export { safeNumber, safeDivide, formatCurrency, formatManYen, formatPercent, formatPointDiff } from './utils'

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
