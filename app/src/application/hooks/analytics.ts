/**
 * 分析系フック — 統計・比較・DuckDB・ドリル・解析
 */
export { useDuckDB } from './useDuckDB'
export type { DuckDBHookResult } from './useDuckDB'
export {
  useDuckDBHourlyAggregation,
  useDuckDBLevelAggregation,
  useDuckDBStoreAggregation,
  useDuckDBHourDowMatrix,
  useDuckDBDistinctDayCount,
  useDuckDBDowDivisorMap,
  useDuckDBDeptKpi,
  useDuckDBDeptKpiTrend,
  useDuckDBDailyCumulative,
  useDuckDBAggregatedRates,
  useDuckDBYoyDaily,
  useDuckDBYoyCategory,
  useDuckDBDailyFeatures,
  useDuckDBHourlyProfile,
  useDuckDBDowPattern,
  useDuckDBCategoryDailyTrend,
  useDuckDBCategoryHourly,
  useDuckDBCategoryMixWeekly,
  useDuckDBCategoryBenchmark,
  useDuckDBStorePeriodMetrics,
  useDuckDBDailyCumulativeBudget,
  useDuckDBBudgetAnalysisSummary,
  useDuckDBDailyRecords,
  useDuckDBPrevYearDailyRecords,
  useDuckDBAggregatedDailyRecords,
} from './useDuckDBQuery'
export {
  pearsonCorrelation,
  normalizeMinMax,
  detectDivergence,
  cosineSimilarity,
  movingAverage,
  analyzeTrend,
  linearRegression,
  calculateWMA,
  calculateMonthEndProjection,
  calculateStdDev,
} from './useStatistics'
export type {
  CorrelationResult,
  NormalizedSeries,
  DivergencePoint,
  MonthlyDataPoint,
  TrendAnalysisResult,
  LinearRegressionResult,
  WMAEntry,
  MonthEndProjection,
} from './useStatistics'
export { useComparisonContext } from './useComparisonContext'
export { useShapleyTimeSeries } from './useShapleyTimeSeries'
export type { ShapleyDayItem, ShapleyTimeSeriesResult } from './useShapleyTimeSeries'
export { useDeptKpiView } from './useDeptKpiView'
export type { DepartmentKpiIndex } from './useDeptKpiView'
export { useAlerts, DEFAULT_ALERT_RULES, evaluateAlerts } from './useAlerts'
export type { Alert, AlertSeverity, AlertRule } from './useAlerts'
export {
  resolveTimeSeriesSource,
  resolveYoYSource,
  resolveDuckDBOnlySource,
  buildSourceContext,
  useSourceContext,
  useStaleFreshCache,
} from './useAnalyticsResolver'
export type {
  AnalyticsSource,
  SourceContext,
  ResolvedSource,
  CachedResult,
} from './useAnalyticsResolver'
export { useDowGapAnalysis } from './useDowGapAnalysis'
export type { DowGapAnalysis } from './useDowGapAnalysis'
export { useDrillAction } from './useDrillAction'
export { usePrevYearData } from './usePrevYearData'
export type { PrevYearData, PrevYearDailyEntry } from './usePrevYearData'
export { usePrevYearMonthlyKpi } from './usePrevYearMonthlyKpi'
export type {
  PrevYearMonthlyKpi,
  PrevYearMonthlyKpiEntry,
  StoreContribution,
} from './usePrevYearMonthlyKpi'
export { useAutoLoadPrevYear } from './useAutoLoadPrevYear'
export { useLoadComparisonData } from './useLoadComparisonData'
export type { ComparisonLoadStatus } from './useLoadComparisonData'
export { useComparisonModule } from './useComparisonModule'
export type { ComparisonModule } from './useComparisonModule'
