/**
 * 粗利計算エクスポート — 在庫法・推定法・予算・売変
 */
// ユーティリティ
export {
  safeNumber,
  safeDivide,
  calculateAchievementRate,
  calculateYoYRatio,
  calculateShare,
  calculateGrossProfitRate,
  calculateTransactionValue,
  calculateItemsPerCustomer,
  calculateAveragePricePerItem,
  calculateMovingAverage,
  computeAverageDivisor,
  computeActiveDowDivisorMap,
} from './utils'
export type { AverageMode, AveragingContext } from './utils'

// 在庫法（runtime は grossProfitBridge 経由で使用する）
export { calculateInvMethod } from './invMethod'
export type { InvMethodInput, InvMethodResult } from './invMethod'

// 推定法（runtime は grossProfitBridge 経由で使用する）
export {
  calculateEstMethod,
  calculateEstMethodWithStatus,
  calculateCoreSales,
  calculateDiscountRate,
} from './estMethod'
export type { EstMethodInput, EstMethodResult } from './estMethod'

// 売変影響（runtime は grossProfitBridge 経由で使用する）
export { calculateDiscountImpact, calculateDiscountImpactWithStatus } from './discountImpact'
export type { DiscountImpactInput, DiscountImpactResult } from './discountImpact'

// 値入率（runtime は grossProfitBridge 経由で使用する）
export { calculateMarkupRates } from './markupRate'
export type { MarkupRateInput, MarkupRateResult } from './markupRate'

// 原価集約（runtime は grossProfitBridge 経由で使用する）
export { calculateTransferTotals, calculateInventoryCost } from './costAggregation'
export type { TransferTotalsInput, TransferTotalsResult } from './costAggregation'

// 予算分析（型のみ re-export。runtime は budgetAnalysisBridge 経由で使用する）
export type { BudgetAnalysisInput, BudgetAnalysisResult } from './budgetAnalysis'

// 全店集計
export { sumStoreValues, sumNullableValues, weightedAverageBySales } from './aggregation'

// 除数計算
export { computeDivisor, countDistinctDays, computeDowDivisorMap, filterByStore } from './divisor'
export type { AggregateMode } from '@/domain/models/UnifiedFilter'
