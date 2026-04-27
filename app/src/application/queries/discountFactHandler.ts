/**
 * discountFactHandler — 値引き（売変）の QueryHandler
 *
 * infra query で raw データを取得し、pure builder で ReadModel を構築する。
 *
 * @layer Application — Query Handler
 *
 * @responsibility R:unclassified
 */
import type { QueryHandler } from './QueryContract'
import { queryDiscountFact } from '@/infrastructure/duckdb/queries/discountFactQueries'
import { buildDiscountFactReadModel } from '@/application/readModels/discountFact'
import type { DiscountFactInput, DiscountFactOutput } from '@/application/readModels/discountFact'

export const discountFactHandler: QueryHandler<DiscountFactInput, DiscountFactOutput> = {
  name: 'discountFact',
  async execute(conn, input) {
    const storeIds = input.storeIds ? [...input.storeIds].sort() : undefined
    const rows = await queryDiscountFact(
      conn,
      input.dateFrom,
      input.dateTo,
      storeIds,
      input.isPrevYear ?? false,
    )
    const model = buildDiscountFactReadModel(rows, input.dataVersion)
    return { model }
  },
}
