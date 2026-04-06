/**
 * Screen Query Plan — DeptTrendChart
 * @guard H1 Screen Plan 経由のみ
 *
 * @responsibility R:query-plan
 */
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import {
  deptKpiTrendHandler,
  type DeptKpiTrendInput,
} from '@/application/queries/dept/DeptKpiTrendHandler'

export type { DeptKpiTrendInput }

export function useDeptTrendChartPlan(
  executor: QueryExecutor | null,
  input: DeptKpiTrendInput | null,
) {
  return useQueryWithHandler(executor, deptKpiTrendHandler, input)
}
