/**
 * freePeriodDeptKPIHandler — 自由期間部門KPIの QueryHandler
 *
 * infra query で raw データを取得し、pure builder で ReadModel を構築する。
 *
 * @layer Application — Query Handler
 *
 * @responsibility R:unclassified
 */
import type { QueryHandler } from './QueryContract'
import { queryFreePeriodDeptKPI } from '@/infrastructure/duckdb/queries/freePeriodDeptKPI'
import { buildFreePeriodDeptKPIReadModel } from '@/application/readModels/freePeriod'
import type {
  FreePeriodDeptKPIQueryInput,
  FreePeriodDeptKPIReadModel,
} from '@/application/readModels/freePeriod'

export const freePeriodDeptKPIHandler: QueryHandler<
  FreePeriodDeptKPIQueryInput,
  FreePeriodDeptKPIReadModel
> = {
  name: 'freePeriodDeptKPI',
  async execute(conn, input) {
    const rawRows = await queryFreePeriodDeptKPI(conn, input.yearMonths)
    return buildFreePeriodDeptKPIReadModel(rawRows, input.yearMonths.length)
  },
}
