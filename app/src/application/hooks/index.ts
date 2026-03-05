export { useImport } from './useImport'
export type { PendingDiffCheck } from './useImport'
export { useCalculation } from './useCalculation'
export { useStoreSelection } from './useStoreSelection'
export { useSettings, loadSettingsFromStorage } from './useSettings'
export { usePrevYearData } from './usePrevYearData'
export type { PrevYearData, PrevYearDailyEntry } from './usePrevYearData'
export { usePrevYearCategoryTimeSales } from './usePrevYearCategoryTimeSales'
export { useAutoLoadPrevYear } from './useAutoLoadPrevYear'
export { useKeyboardShortcuts } from './useKeyboardShortcuts'
export { useUndoRedo } from './useUndoRedo'
export { usePersistence } from './usePersistence'
export { useMonthSwitcher } from './useMonthSwitcher'
export { useExplanations, useMetricExplanation } from './useExplanation'
export { useStorageAdmin } from './useStorageAdmin'
export type { StoredMonthEntry, MonthDataSummaryEntry } from './useStorageAdmin'
export { useWorkerCalculation } from '@/application/workers'
export {
  useCategoryTimeSalesIndex,
  useCategoryTimeSalesIndexFromRecords,
} from './useCategoryTimeSalesIndex'
export { useBudgetChartData } from './useBudgetChartData'
export type { BudgetChartDataPoint } from './useBudgetChartData'
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
  useDuckDBStoreBenchmark,
  useDuckDBStorePeriodMetrics,
  useDuckDBDailyCumulativeBudget,
  useDuckDBBudgetAnalysisSummary,
  useDuckDBDailyRecords,
  useDuckDBPrevYearDailyRecords,
  useDuckDBAggregatedDailyRecords,
} from './useDuckDBQuery'
export { useStoragePersistence } from './useStoragePersistence'
export type { StorageStatusInfo } from './useStoragePersistence'
export { useDataRecovery } from './useDataRecovery'
export type { RawFileGroup } from './useDataRecovery'
export { useBackup } from './useBackup'
export type { BackupMeta, BackupImportResult } from './useBackup'
export { useAutoBackup } from './useAutoBackup'
export type { AutoBackupState, AutoBackupActions } from './useAutoBackup'
export { useAutoImport } from './useAutoImport'
export type { AutoImportState, AutoImportActions } from './useAutoImport'
export { useShapleyTimeSeries } from './useShapleyTimeSeries'
export type { ShapleyDayItem, ShapleyTimeSeriesResult } from './useShapleyTimeSeries'
export { useDeptKpiView } from './useDeptKpiView'
export type { DepartmentKpiIndex } from './useDeptKpiView'
// ── 計算ファサードフック ────────────────────────────────
export {
  useDecompose2,
  useDecompose3,
  useDecompose5,
  useDecomposePriceMix,
  decompose2,
  decompose3,
  decompose5,
  decomposePriceMix,
} from './useFactorDecomposition'
export type {
  TwoFactorResult,
  ThreeFactorResult,
  FiveFactorResult,
  CategoryQtyAmt,
  PriceMixResult,
} from './useFactorDecomposition'
export { useForecast, useWeekRanges, calculateForecast, getWeekRanges } from './useForecast'
export type { ForecastInput, ForecastResult, WeeklySummary, DayOfWeekAverage } from './useForecast'
export {
  useEstimatedInventory,
  useEstimatedInventoryDetails,
  computeEstimatedInventory,
  computeEstimatedInventoryDetails,
} from './useInventoryEstimation'
export type { InventoryPoint, InventoryDetailRow } from './useInventoryEstimation'
export { useAlerts, DEFAULT_ALERT_RULES, evaluateAlerts } from './useAlerts'
export type { Alert, AlertSeverity, AlertRule } from './useAlerts'
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
export { useSensitivityBase, useSensitivityAnalysis, useElasticity } from './useSensitivity'
export type {
  SensitivityBase,
  SensitivityDeltas,
  SensitivityResult,
  ElasticityResult,
} from './useSensitivity'
export { useCausalChain, storeResultToCausalPrev } from './useCausalChain'
export type { CausalStep, CausalChainPrevInput, CausalFactor, ColorHint } from './useCausalChain'
export { usePinIntervals, calculatePinIntervals } from './usePinIntervals'
export type { PinInterval } from './usePinIntervals'
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
export { useDrillAction } from './useDrillAction'
export { useDeviceSync } from './useDeviceSync'
export type { SettingsCodeResult, SettingsImportResult } from './useDeviceSync'
