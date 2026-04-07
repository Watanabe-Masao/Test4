/**
 * Screen Query Plan — ConditionMatrixTable
 * @guard H1 Screen Plan 経由のみ
 *
 * @responsibility R:query-plan
 */
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import {
  conditionMatrixHandler,
  type ConditionMatrixInput,
} from '@/application/queries/advanced/ConditionMatrixHandler'

export type { ConditionMatrixInput }

export function useConditionMatrixPlan(
  executor: QueryExecutor | null,
  input: ConditionMatrixInput | null,
) {
  return useQueryWithHandler(executor, conditionMatrixHandler, input)
}
