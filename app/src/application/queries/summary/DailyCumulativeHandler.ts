/**
 * DailyCumulativeHandler — 日別累積売上クエリ
 *
 * StoreDaySummary から日別の累積売上・累積粗利等を取得する。
 * CumulativeChart, DailySalesChart 等で使用。
 */
import type { QueryHandler, BaseQueryInput } from '../QueryContract'
import {
  queryDailyCumulativeAggregation,
  type DailyCumulativeRow,
} from '@/infrastructure/duckdb/queries/aggregates/dailyAggregation'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'

export type DailyCumulativeInput = BaseQueryInput

export interface DailyCumulativeOutput {
  readonly records: readonly DailyCumulativeRow[]
}

export const dailyCumulativeHandler: QueryHandler<DailyCumulativeInput, DailyCumulativeOutput> = {
  name: 'DailyCumulative',
  async execute(
    conn: AsyncDuckDBConnection,
    input: DailyCumulativeInput,
  ): Promise<DailyCumulativeOutput> {
    const records = await queryDailyCumulativeAggregation(conn, input)
    return { records }
  },
}

export type { DailyCumulativeRow }
