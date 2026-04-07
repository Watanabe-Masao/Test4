/**
 * Screen Query Plan — CumulativeChart
 * @guard H1 Screen Plan 経由のみ
 *
 * @responsibility R:query-plan
 */
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import {
  dailyCumulativeHandler,
  type DailyCumulativeInput,
} from '@/application/queries/summary/DailyCumulativeHandler'

export type { DailyCumulativeInput }

export function useCumulativeChartPlan(
  executor: QueryExecutor | null,
  input: DailyCumulativeInput | null,
) {
  return useQueryWithHandler(executor, dailyCumulativeHandler, input)
}
