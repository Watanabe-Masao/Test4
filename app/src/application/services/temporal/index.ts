/**
 * @responsibility R:unclassified
 */

// Phase 2: Daily Series Foundation
export { buildDailySeries } from './buildDailySeries'
export { resolveDailyPoint } from './dailySeriesMissingness'
export { toYearMonthKey } from './DailySeriesTypes'
export type {
  DailySeriesPoint,
  DailySeriesSourceRow,
  DailySeriesMetricKey,
  DailySeriesStatus,
} from './DailySeriesTypes'

// Phase 3: Row Adapter + Metric Resolvers
export { adaptStoreDaySummaryRow } from './storeDaySummaryTemporalAdapter'
export type { StoreDaySummaryRowForTemporal } from './storeDaySummaryTemporalAdapter'
export { resolveAllMetrics, TEMPORAL_METRIC_RESOLVERS } from './temporalMetricResolvers'
export type { TemporalMetricResolver, StoreDaySummaryTemporalRow } from './temporalMetricResolvers'

// Phase 5: temporal source normalization — store粒度 source の dateKey 集約
export { aggregateStoreDaySummaryByDateKey } from './aggregateStoreDaySummaryByDateKey'
