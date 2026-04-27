/**
 * @responsibility R:unclassified
 */

export {
  calculateStoreResult,
  calculateAllStores,
  aggregateStoreResults,
} from './CalculationOrchestrator'
export {
  buildStoreDaySummaryIndex,
  buildStoreDaySummaryCache,
  computeSummaryFingerprint,
} from './summaryBuilder'
export { calculateAllPeriodMetrics, aggregateSummaryRows } from './periodMetricsCalculator'
export type {
  DaySummaryInput,
  PeriodMetrics,
  PeriodInventoryConfig,
} from './periodMetricsCalculator'
