/**
 * 生レコード集約関数群 — バレルエクスポート
 *
 * 日別集約、統計量、ユーティリティの各モジュールを再エクスポートする。
 */
export { aggregateByDay, cumulativeSum, movingAverage, dowAggregate } from './dailyAggregation'
export type {
  DailyAggregate,
  CumulativeEntry,
  MovingAverageEntry,
  DowAggregate,
} from './dailyAggregation'

export { stddevPop, zScore, coefficientOfVariation } from './statisticalFunctions'

export {
  hourlyAggregate,
  aggregatePeriodRates,
  rankBy,
  yoyMerge,
  categoryShare,
} from './aggregationUtilities'
export type { HourlyAggregate, PeriodRates, YoyEntry, CategoryShare } from './aggregationUtilities'

export { computeDowPattern, computeDailyFeatures, computeHourlyProfile } from './featureAggregation'
export type {
  DowPatternRow,
  DailyFeatureRow,
  HourlyProfileRow,
  DowPatternInput,
  DailyFeatureInput,
} from './featureAggregation'
