// ─── Calculation use case ────────────────────────────────
export {
  calculateStoreResult,
  calculateAllStores,
  aggregateStoreResults,
} from './calculation'

// ─── Import use case ─────────────────────────────────────
export {
  validateImportedData,
  hasValidationErrors,
  processDroppedFiles,
} from './import'
export type { ImportSummary, FileImportResult, ProgressCallback } from './import'

// ─── Explanation use case ────────────────────────────────
export { generateExplanations } from './explanation'

// ─── CategoryTimeSales use case ─────────────────────────
export { buildCategoryTimeSalesIndex } from './categoryTimeSales'
export type { HierarchyFilterParams, AggregateMode } from './categoryTimeSales'
export {
  queryByDateRange,
  queryIndex,
  filterByDow,
  computeDivisor,
  countDistinctDays,
  computeDowDivisorMap,
  aggregateHourly,
  aggregateByLevel,
  aggregateHourDow,
  aggregateByStore,
} from './categoryTimeSales'
export type {
  HourlyAggregation,
  LevelAggregationEntry,
  HourDowAggregation,
  StoreHourlyEntry,
} from './categoryTimeSales'
