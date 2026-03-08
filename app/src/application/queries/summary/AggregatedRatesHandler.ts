/**
 * AggregatedRatesHandler — 期間集約レートクエリ
 *
 * 指定期間の売上合計・粗利率等の集約値を取得する。
 */
import type { QueryHandler, BaseQueryInput } from '../QueryContract'
import {
  queryAggregatedRates,
  type AggregatedRatesRow,
} from '@/infrastructure/duckdb/queries/storeDaySummary'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'

export interface AggregatedRatesInput extends BaseQueryInput {
  readonly isPrevYear?: boolean
}

export type AggregatedRatesOutput = AggregatedRatesRow | null

export const aggregatedRatesHandler: QueryHandler<AggregatedRatesInput, AggregatedRatesOutput> = {
  name: 'AggregatedRates',
  async execute(
    conn: AsyncDuckDBConnection,
    input: AggregatedRatesInput,
  ): Promise<AggregatedRatesOutput> {
    return queryAggregatedRates(conn, input)
  },
}

export type { AggregatedRatesRow }
