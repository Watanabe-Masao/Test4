/**
 * Screen Query Plan — CategoryDiscountChart
 * @guard H1 Screen Plan 経由のみ
 *
 * @responsibility R:unclassified
 */
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import { categoryDiscountPairHandler } from '@/application/queries/cts/CategoryDiscountPairHandler'
import type { CategoryDiscountInput } from '@/application/queries/cts/CategoryDiscountHandler'
import type { PairedInput } from '@/application/queries/createPairedHandler'

export type { CategoryDiscountInput, PairedInput }

export function useCategoryDiscountChartPlan(
  executor: QueryExecutor | null,
  input: PairedInput<CategoryDiscountInput> | null,
) {
  return useQueryWithHandler(executor, categoryDiscountPairHandler, input)
}
