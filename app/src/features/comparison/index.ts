/**
 * features/comparison — 比較サブシステム feature slice
 *
 * 前年比較・曜日ギャップ・同曜日マッピング・KPI 投影を含む。
 * 外部からの参照はこの barrel 経由のみ許可。
 */

// 公開 API: 型
export type {
  PrevYearData,
  PrevYearDailyEntry,
  PrevYearMonthlyKpi,
  PrevYearMonthlyKpiEntry,
  StoreContribution,
  CompareModeV2,
} from './application/comparisonTypes'

// 公開 API: アクセサ
export {
  getPrevYearDailyValue,
  getPrevYearDailySales,
  extractPrevYearCustomerCount,
} from './application/comparisonAccessors'

// 公開 API: ViewModel
export {
  toComparisonPoints,
  toComparisonPointMap,
  buildDailyYoYRows,
  aggregateContributions,
  indexContributionsByDay,
  indexContributionsByStore,
} from './application/viewModels'
export type {
  ComparisonPoint,
  DailyYoYRow,
  StoreYoYRow,
  ContributionAggregate,
} from './application/viewModels'

// 公開 API: Domain 型
export type {
  ComparisonWindow,
  YoYWindow,
  WoWWindow,
  FallbackAwareWindow,
  SingleWindow,
} from './domain/comparisonWindow'
export { isComparisonWindow } from './domain/comparisonWindow'

export type { DataComparisonProvenance, MappingKind } from './domain/comparisonProvenance'
export {
  createProvenance,
  createFallbackProvenance,
  toMappingKind,
} from './domain/comparisonProvenance'

// 公開 API: Facade hooks
export { useComparisonModuleCore } from './application/hooks/useComparisonModule'
export type {
  ComparisonModule,
  UseComparisonModuleCoreInput,
} from './application/hooks/useComparisonModule'
export { useComparisonScope } from './application/hooks/useComparisonScope'

// 公開 API: Projection context
export { buildComparisonProjectionContext } from './application/buildComparisonProjectionContext'
export type { ComparisonProjectionContext } from './application/ComparisonProjectionContext'

// 公開 API: Monthly prev-year sales selector (月間粒度・取り込み期間キャップなし)
export { selectMonthlyPrevYearSales } from './application/selectMonthlyPrevYearSales'
export type {
  MonthlyPrevYearSalesMode,
  MonthlyPrevYearSalesSource,
  MonthlyPrevYearSalesProjection,
} from './application/selectMonthlyPrevYearSales'
