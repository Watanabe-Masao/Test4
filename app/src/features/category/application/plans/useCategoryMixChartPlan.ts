/**
 * Screen Query Plan — CategoryMixChart
 * @guard H1 Screen Plan 経由のみ
 */
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import {
  categoryMixWeeklyHandler,
  type CategoryMixWeeklyInput,
} from '@/application/queries/advanced/CategoryMixWeeklyHandler'

export type { CategoryMixWeeklyInput }

export function useCategoryMixChartPlan(
  executor: QueryExecutor | null,
  input: CategoryMixWeeklyInput | null,
) {
  return useQueryWithHandler(executor, categoryMixWeeklyHandler, input)
}
