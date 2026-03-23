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
export { useAlerts } from './useAlerts'
export type { Alert, AlertSeverity, AlertRule } from './useAlerts'
export { evaluateAlerts, DEFAULT_ALERT_RULES } from '@/domain/calculations/rules/alertSystem'
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
export type { DowGapAnalysis } from '@/domain/models/ComparisonContext'
export { useDrillAction } from './useDrillAction'
export type {
  PrevYearData,
  PrevYearDailyEntry,
  PrevYearMonthlyKpi,
  PrevYearMonthlyKpiEntry,
  StoreContribution,
} from '@/application/comparison/comparisonTypes'
export { useLoadComparisonData } from './useLoadComparisonData'
export type { ComparisonLoadStatus } from './useLoadComparisonData'
export { useComparisonModule } from './useComparisonModule'
export type { ComparisonModule } from './useComparisonModule'
// DayDetail — application/hooks/duckdb/ からの re-export（presentation が duckdb/ を直接 import しないため）
export { useDayDetailData } from './duckdb/useDayDetailData'
export type {
  DayDetailData,
  DayDetailDataParams,
  WeatherCandidate,
} from './duckdb/useDayDetailData'
