/**
 * DuckDB クエリフック — 後方互換バレル
 *
 * 実装は duckdb/ ディレクトリに責務別に分割された。
 * このファイルは既存の import パスを維持するための re-export バレル。
 */
export {
  // 汎用
  useAsyncQuery,
  toDateKeys,
  storeIdsToArray,
  // CTS
  useDuckDBHourlyAggregation,
  useDuckDBLevelAggregation,
  useDuckDBStoreAggregation,
  useDuckDBHourDowMatrix,
  useDuckDBDistinctDayCount,
  useDuckDBDowDivisorMap,
  useDuckDBCategoryDailyTrend,
  useDuckDBCategoryHourly,
  useDuckDBCategoryDowMatrix,
  // 部門KPI
  useDuckDBDeptKpi,
  useDuckDBDeptKpiTrend,
  // StoreDaySummary
  useDuckDBDailyCumulative,
  useDuckDBAggregatedRates,
  // YoY
  useDuckDBYoyDaily,
  useDuckDBYoyCategory,
  // 特徴量
  useDuckDBDailyFeatures,
  useDuckDBHourlyProfile,
  useDuckDBDowPattern,
  // 高度分析
  useDuckDBCategoryMixWeekly,
  useDuckDBCategoryBenchmark,
  useDuckDBCategoryBenchmarkTrend,
  useDuckDBCategoryHierarchy,
  buildCategoryBenchmarkScores,
  buildCategoryBenchmarkScoresByDate,
  buildCategoryTrendData,
  buildBoxPlotData,
  buildBoxPlotDataByDate,
  buildStoreBreakdown,
  buildDateBreakdown,
  // 店舗期間メトリクス + 予算分析
  useDuckDBStorePeriodMetrics,
  useDuckDBDailyCumulativeBudget,
  useDuckDBBudgetAnalysisSummary,
  // 日別明細
  useDuckDBDailyRecords,
  useDuckDBPrevYearDailyRecords,
  useDuckDBAggregatedDailyRecords,
  // 天気時間帯
  useDuckDBWeatherHourly,
  useDuckDBWeatherHourlyAvg,
} from './duckdb'

export type {
  AsyncQueryResult,
  DuckDBDeptKpiResult,
  HourlyAggregationRow,
  LevelAggregationRow,
  StoreAggregationRow,
  HourDowMatrixRow,
  CategoryDailyTrendRow,
  CategoryHourlyRow,
  CategoryDowMatrixRow,
  DeptKpiRankedRow,
  DeptKpiSummaryRow,
  DeptKpiMonthlyTrendRow,
  DailyCumulativeRow,
  AggregatedRatesRow,
  YoyDailyRow,
  YoyCategoryRow,
  DailyFeatureRow,
  HourlyProfileRow,
  DowPatternRow,
  CategoryMixWeeklyRow,
  CategoryBenchmarkRow,
  CategoryBenchmarkTrendRow,
  CategoryBenchmarkScore,
  CategoryTrendPoint,
  CategoryHierarchyItem,
  BoxPlotStats,
  StoreBreakdownItem,
  DateBreakdownItem,
  BenchmarkMetric,
  ProductType,
  PeriodMetrics,
  DailyCumulativeBudgetRow,
  BudgetAnalysisSummaryRow,
  DailyRecordRow,
  HourlyWeatherAvgRow,
} from './duckdb'
