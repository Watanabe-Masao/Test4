/**
 * Screen Query Plan — FactorDecompositionPanel
 * @guard H1 Screen Plan 経由のみ
 */
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import { storeDaySummaryPairHandler } from '@/application/queries/summary/StoreDaySummaryPairHandler'
import type { StoreDaySummaryInput } from '@/application/queries/summary/StoreDaySummaryHandler'
import type { PairedInput } from '@/application/queries/createPairedHandler'

export type { StoreDaySummaryInput, PairedInput }

export function useFactorDecompositionPlan(
  executor: QueryExecutor | null,
  input: PairedInput<StoreDaySummaryInput> | null,
) {
  return useQueryWithHandler(executor, storeDaySummaryPairHandler, input)
}
