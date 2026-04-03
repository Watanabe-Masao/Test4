/**
 * Screen Query Plan — FeatureChart
 * @guard H1 Screen Plan 経由のみ
 */
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import {
  dailyFeaturesHandler,
  type DailyFeaturesInput,
} from '@/application/queries/features/DailyFeaturesHandler'

export type { DailyFeaturesInput }

export function useFeatureChartPlan(
  executor: QueryExecutor | null,
  input: DailyFeaturesInput | null,
) {
  return useQueryWithHandler(executor, dailyFeaturesHandler, input)
}
