/**
 * freePeriodHandler — 自由期間分析の QueryHandler
 *
 * infra query で raw データを取得し、pure builder で ReadModel を構築する。
 * readModel は infra を知らない（pure builder パターン）。
 *
 * @layer Application — Query Handler
 */
import type { QueryHandler } from './QueryContract'
import { queryFreePeriodDaily } from '@/infrastructure/duckdb/queries/freePeriodFactQueries'
import { buildFreePeriodReadModel } from '@/application/readModels/freePeriod'
import type { FreePeriodQueryInput, FreePeriodReadModel } from '@/application/readModels/freePeriod'

export const freePeriodHandler: QueryHandler<FreePeriodQueryInput, FreePeriodReadModel> = {
  name: 'freePeriod',
  async execute(conn, input) {
    const storeIds = input.storeIds ? [...input.storeIds] : undefined

    const currentRows = await queryFreePeriodDaily(
      conn,
      input.dateFrom,
      input.dateTo,
      storeIds,
      false,
    )

    let comparisonRows: Awaited<ReturnType<typeof queryFreePeriodDaily>> = []
    if (input.comparisonDateFrom && input.comparisonDateTo) {
      comparisonRows = await queryFreePeriodDaily(
        conn,
        input.comparisonDateFrom,
        input.comparisonDateTo,
        storeIds,
        true,
      )
    }

    return buildFreePeriodReadModel(currentRows, comparisonRows)
  },
}
