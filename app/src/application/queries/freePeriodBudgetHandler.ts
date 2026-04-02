/**
 * freePeriodBudgetHandler — 自由期間予算の QueryHandler
 *
 * readFreePeriodBudgetFact を QueryHandler インターフェースでラップし、
 * useQueryWithHandler 経由で利用可能にする。
 *
 * @layer Application — Query Handler
 */
import type { QueryHandler } from './QueryContract'
import { readFreePeriodBudgetFact } from '@/application/readModels/freePeriod'
import type {
  FreePeriodBudgetQueryInput,
  FreePeriodBudgetReadModel,
} from '@/application/readModels/freePeriod'

export const freePeriodBudgetHandler: QueryHandler<
  FreePeriodBudgetQueryInput,
  FreePeriodBudgetReadModel
> = {
  name: 'freePeriodBudget',
  execute: (conn, input) => readFreePeriodBudgetFact(conn, input),
}
