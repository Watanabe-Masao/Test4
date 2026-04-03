/**
 * Screen Query Plan — useDeptHourlyChartData
 *
 * categoryHourly + hourlyAggregation pair の 2 query を一元管理。
 *
 * @guard H1 Screen Plan 経由のみ
 */
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import {
  categoryHourlyHandler,
  type CategoryHourlyInput,
} from '@/application/queries/cts/CategoryHourlyHandler'
import { hourlyAggregationPairHandler } from '@/application/queries/cts/HourlyAggregationPairHandler'
import type { HourlyAggregationInput } from '@/application/queries/cts/HourlyAggregationHandler'
import type { PairedInput } from '@/application/queries/createPairedHandler'

export type { CategoryHourlyInput, HourlyAggregationInput, PairedInput }

export function useDeptHourlyChartPlan(
  executor: QueryExecutor | null,
  hourlyInput: CategoryHourlyInput | null,
  qtyPairInput: PairedInput<HourlyAggregationInput> | null,
) {
  const hourlyResult = useQueryWithHandler(executor, categoryHourlyHandler, hourlyInput)
  const qtyPairResult = useQueryWithHandler(executor, hourlyAggregationPairHandler, qtyPairInput)
  return { hourlyResult, qtyPairResult }
}
