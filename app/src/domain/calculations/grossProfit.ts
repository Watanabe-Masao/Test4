/**
 * 粗利計算エクスポート — 在庫法・推定法・予算・売変
 */
// ユーティリティ
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

// 在庫法
export { calculateInvMethod } from './invMethod'
export type { InvMethodInput, InvMethodResult } from './invMethod'

// 推定法
export { calculateEstMethod, calculateCoreSales, calculateDiscountRate } from './estMethod'
export type { EstMethodInput, EstMethodResult } from './estMethod'

// 売変影響
export { calculateDiscountImpact } from './discountImpact'
export type { DiscountImpactInput, DiscountImpactResult } from './discountImpact'

// 予算分析（型のみ re-export。runtime は budgetAnalysisBridge 経由で使用する）
export type { BudgetAnalysisInput, BudgetAnalysisResult } from './budgetAnalysis'

// 全店集計
export { sumStoreValues, sumNullableValues, weightedAverageBySales } from './aggregation'

// 除数計算
export { computeDivisor, countDistinctDays, computeDowDivisorMap, filterByStore } from './divisor'
export type { AggregateMode } from '@/domain/models/UnifiedFilter'
