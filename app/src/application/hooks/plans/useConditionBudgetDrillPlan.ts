/**
 * Screen Query Plan — ConditionSummaryBudgetDrill
 * @guard H1 Screen Plan 経由のみ
 *
 * @responsibility R:unclassified
 */
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import {
  storeDailyMarkupRateHandler,
  type StoreDailyMarkupRateInput,
} from '@/application/queries/purchase/StoreDailyMarkupRateHandler'

export type { StoreDailyMarkupRateInput }

export function useConditionBudgetDrillPlan(
  executor: QueryExecutor | null,
  input: StoreDailyMarkupRateInput | null,
) {
  return useQueryWithHandler(executor, storeDailyMarkupRateHandler, input)
}
