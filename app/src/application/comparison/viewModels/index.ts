/**
 * 比較 ViewModel 共通基盤
 *
 * 比較結果の表示用 shape を共通化し、
 * Panel / Chart / Table ごとに個別実装しない。
 */
export type { ComparisonPoint, DailyYoYRow, StoreYoYRow } from './ComparisonViewTypes'
export { toComparisonPoints, toComparisonPointMap } from './buildComparisonPoints'
export { buildDailyYoYRows } from './buildDailyYoYRows'
export type { ContributionAggregate } from './aggregateStoreContributions'
export {
  aggregateContributions,
  indexContributionsByDay,
  indexContributionsByStore,
} from './aggregateStoreContributions'
