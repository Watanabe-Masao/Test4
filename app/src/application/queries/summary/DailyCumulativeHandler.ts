/**
 * DailyCumulativeHandler — 日別累積売上クエリ
 *
 * StoreDaySummary から日別の累積売上・累積粗利等を取得する。
 * CumulativeChart, DailySalesChart 等で使用。
 */
import type { QueryHandler, BaseQueryInput } from '../QueryContract'
import {
  queryDailyCumulative,
  type DailyCumulativeRow,
} from '@/infrastructure/duckdb/queries/storeDaySummary'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'

export interface DailyCumulativeInput extends BaseQueryInput {
  readonly isPrevYear?: boolean
}

export interface DailyCumulativeOutput {
  readonly records: readonly DailyCumulativeRow[]
}

export const dailyCumulativeHandler: QueryHandler<DailyCumulativeInput, DailyCumulativeOutput> = {
  name: 'DailyCumulative',
  async execute(
    conn: AsyncDuckDBConnection,
    input: DailyCumulativeInput,
  ): Promise<DailyCumulativeOutput> {
    const records = await queryDailyCumulative(conn, input)
    return { records }
  },
}

export type { DailyCumulativeRow }
