/**
 * Screen Query Plan — useCategoryHierarchyData
 *
 * levelAggregation + categoryHourly の 2 pair handler を一元管理。
 *
 * @guard H1 Screen Plan 経由のみ
 */
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import { levelAggregationPairHandler } from '@/application/queries/cts/LevelAggregationPairHandler'
import { categoryHourlyPairHandler } from '@/application/queries/cts/CategoryHourlyPairHandler'
import type { PairedInput } from '@/application/queries/createPairedHandler'
import type { LevelAggregationInput } from '@/application/queries/cts/LevelAggregationHandler'
import type { CategoryHourlyInput } from '@/application/queries/cts/CategoryHourlyHandler'

export type { PairedInput, LevelAggregationInput, CategoryHourlyInput }

export function useCategoryHierarchyPlan(
  executor: QueryExecutor | null,
  levelInput: PairedInput<LevelAggregationInput> | null,
  hourlyInput: PairedInput<CategoryHourlyInput> | null,
) {
  const levelPair = useQueryWithHandler(executor, levelAggregationPairHandler, levelInput)
  const hourlyPair = useQueryWithHandler(executor, categoryHourlyPairHandler, hourlyInput)
  return { levelPair, hourlyPair }
}
