/**
 * Screen Query Plan — StoreHourlyChart
 * @guard H1 Screen Plan 経由のみ
 *
 * @responsibility R:query-plan
 */
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import {
  storeAggregationHandler,
  type StoreAggregationInput,
} from '@/application/queries/cts/StoreAggregationHandler'

export type { StoreAggregationInput }

export function useStoreHourlyChartPlan(
  executor: QueryExecutor | null,
  input: StoreAggregationInput | null,
) {
  return useQueryWithHandler(executor, storeAggregationHandler, input)
}
