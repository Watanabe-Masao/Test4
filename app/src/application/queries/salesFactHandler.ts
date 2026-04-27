/**
 * salesFactHandler — 売上・販売点数の QueryHandler
 *
 * infra query で raw データを取得し、pure builder で ReadModel を構築する。
 *
 * @layer Application — Query Handler
 *
 * @responsibility R:unclassified
 */
import type { QueryHandler } from './QueryContract'
import {
  querySalesFactDaily,
  querySalesFactHourly,
} from '@/infrastructure/duckdb/queries/salesFactQueries'
import { buildSalesFactReadModel } from '@/application/readModels/salesFact'
import type { SalesFactInput, SalesFactOutput } from '@/application/readModels/salesFact'

export const salesFactHandler: QueryHandler<SalesFactInput, SalesFactOutput> = {
  name: 'salesFact',
  async execute(conn, input) {
    const storeIds = input.storeIds ? [...input.storeIds].sort() : undefined

    const [daily, hourly] = await Promise.all([
      querySalesFactDaily(conn, input.dateFrom, input.dateTo, storeIds, input.isPrevYear),
      querySalesFactHourly(conn, input.dateFrom, input.dateTo, storeIds, input.isPrevYear),
    ])

    const model = buildSalesFactReadModel(daily, hourly, input.dataVersion)
    return { model }
  },
}
