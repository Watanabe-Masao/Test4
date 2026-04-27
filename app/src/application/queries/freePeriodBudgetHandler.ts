/**
 * freePeriodBudgetHandler — 自由期間予算の QueryHandler
 *
 * infra query で raw データを取得し、pure builder で ReadModel を構築する。
 *
 * @layer Application — Query Handler
 *
 * @responsibility R:unclassified
 */
import type { QueryHandler } from './QueryContract'
import { queryFreePeriodBudget } from '@/infrastructure/duckdb/queries/freePeriodBudget'
import { buildFreePeriodBudgetReadModel } from '@/application/readModels/freePeriod'
import type {
  FreePeriodBudgetQueryInput,
  FreePeriodBudgetReadModel,
} from '@/application/readModels/freePeriod'

export const freePeriodBudgetHandler: QueryHandler<
  FreePeriodBudgetQueryInput,
  FreePeriodBudgetReadModel
> = {
  name: 'freePeriodBudget',
  async execute(conn, input) {
    const rawRows = await queryFreePeriodBudget(conn, input.storeIds)
    return buildFreePeriodBudgetReadModel(rawRows, input)
  },
}
