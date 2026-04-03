/**
 * Screen Query Plan — DowPatternChart
 * @guard H1 Screen Plan 経由のみ
 */
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import {
  dowPatternHandler,
  type DowPatternInput,
} from '@/application/queries/features/DowPatternHandler'

export type { DowPatternInput }

export function useDowPatternChartPlan(
  executor: QueryExecutor | null,
  input: DowPatternInput | null,
) {
  return useQueryWithHandler(executor, dowPatternHandler, input)
}
