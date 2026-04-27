/**
 * Screen Query Plan — CategoryHourlyChart
 * @guard H1 Screen Plan 経由のみ
 *
 * @responsibility R:unclassified
 */
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import {
  categoryHourlyHandler,
  type CategoryHourlyInput,
} from '@/application/queries/cts/CategoryHourlyHandler'

export type { CategoryHourlyInput }

export function useCategoryHourlyChartPlan(
  executor: QueryExecutor | null,
  input: CategoryHourlyInput | null,
) {
  return useQueryWithHandler(executor, categoryHourlyHandler, input)
}
