/**
 * Screen Query Plan — WeatherAnalysisPanel
 * @guard H1 Screen Plan 経由のみ
 *
 * @responsibility R:unclassified
 */
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import {
  storeDaySummaryHandler,
  type StoreDaySummaryInput,
} from '@/application/queries/summary/StoreDaySummaryHandler'

export type { StoreDaySummaryInput }

export function useWeatherAnalysisPlan(
  executor: QueryExecutor | null,
  input: StoreDaySummaryInput | null,
) {
  return useQueryWithHandler(executor, storeDaySummaryHandler, input)
}
