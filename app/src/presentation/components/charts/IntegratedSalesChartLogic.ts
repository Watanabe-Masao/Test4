/**
 * 後方互換 re-export
 *
 * 実体は application/hooks/plans/integratedSalesAggregation.ts に移動。
 * 日別点数データの集約ロジックは Application 層の責務。
 */
export { aggregateDailyQuantity } from '@/application/hooks/plans/integratedSalesAggregation'
