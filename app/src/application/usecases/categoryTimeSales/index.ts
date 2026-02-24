// ─── Index construction ─────────────────────────────────
export { buildCategoryTimeSalesIndex } from './indexBuilder'

// ─── Filtering ──────────────────────────────────────────
export type { HierarchyFilterParams } from './filters'
export { queryIndex, filterByDow } from './filters'

// ─── Divisor ────────────────────────────────────────────
export type { AggregateMode } from './divisor'
export { computeDivisor, countDistinctDays, computeDowDivisorMap } from './divisor'

// ─── Aggregation ────────────────────────────────────────
export type {
  HourlyAggregation,
  LevelAggregationEntry,
  HourDowAggregation,
  StoreHourlyEntry,
} from './aggregation'
export {
  aggregateHourly,
  aggregateByLevel,
  aggregateHourDow,
  aggregateByStore,
} from './aggregation'
