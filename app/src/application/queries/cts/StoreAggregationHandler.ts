/**
 * StoreAggregationHandler — 店舗別×時間帯集約クエリ
 *
 * StoreHourlyChart 等で使用。
 *
 * @responsibility R:unclassified
 */
import type { QueryHandler, BaseQueryInput } from '../QueryContract'
import {
  queryStoreAggregation,
  type StoreAggregationRow,
} from '@/infrastructure/duckdb/queries/ctsHourlyQueries'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'

export interface StoreAggregationInput extends BaseQueryInput {
  readonly deptCode?: string
  readonly lineCode?: string
  readonly klassCode?: string
  readonly dow?: readonly number[]
}

export interface StoreAggregationOutput {
  readonly records: readonly StoreAggregationRow[]
}

export const storeAggregationHandler: QueryHandler<StoreAggregationInput, StoreAggregationOutput> =
  {
    name: 'StoreAggregation',
    async execute(
      conn: AsyncDuckDBConnection,
      input: StoreAggregationInput,
    ): Promise<StoreAggregationOutput> {
      const records = await queryStoreAggregation(conn, input)
      return { records }
    },
  }

export type { StoreAggregationRow }
