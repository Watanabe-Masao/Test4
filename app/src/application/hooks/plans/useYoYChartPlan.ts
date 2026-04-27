/**
 * Screen Query Plan — YoYChart
 * @guard H1 Screen Plan 経由のみ
 *
 * @responsibility R:unclassified
 */
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import {
  yoyDailyHandler,
  type YoyDailyInput,
} from '@/application/queries/comparison/YoyDailyHandler'

export type { YoyDailyInput }

export function useYoYChartPlan(executor: QueryExecutor | null, input: YoyDailyInput | null) {
  return useQueryWithHandler(executor, yoyDailyHandler, input)
}
