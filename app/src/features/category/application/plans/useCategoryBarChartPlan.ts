/**
 * Screen Query Plan — CategoryBarChart
 * @guard H1 Screen Plan 経由のみ
 */
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import { categoryDailyTrendPairHandler } from '@/application/queries/cts/CategoryDailyTrendPairHandler'
import type { CategoryDailyTrendInput } from '@/application/queries/cts/CategoryDailyTrendHandler'
import type { PairedInput } from '@/application/queries/createPairedHandler'

export type { CategoryDailyTrendInput, PairedInput }

export function useCategoryBarChartPlan(
  executor: QueryExecutor | null,
  input: PairedInput<CategoryDailyTrendInput> | null,
) {
  return useQueryWithHandler(executor, categoryDailyTrendPairHandler, input)
}
