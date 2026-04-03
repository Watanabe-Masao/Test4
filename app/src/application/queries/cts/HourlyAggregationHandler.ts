/**
 * HourlyAggregationHandler — 時間帯別集約クエリ
 *
 * TimeSlotChart で使用。当月/比較月の時間帯別売上・点数を集約する。
 */
import type { QueryHandler, BaseQueryInput } from '../QueryContract'
import { queryHourlyAggregation } from '@/infrastructure/duckdb/queries/ctsHourlyQueries'
import type { HourlyAggregationRow } from '@/domain/models/CtsQueryContracts'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { PrevYearFlag } from '../comparisonQueryScope'

export interface HourlyAggregationInput extends BaseQueryInput {
  readonly deptCode?: string
  readonly lineCode?: string
  readonly klassCode?: string
  readonly isPrevYear?: PrevYearFlag
}

export interface HourlyAggregationOutput {
  readonly records: readonly HourlyAggregationRow[]
}

export const hourlyAggregationHandler: QueryHandler<
  HourlyAggregationInput,
  HourlyAggregationOutput
> = {
  name: 'HourlyAggregation',
  async execute(
    conn: AsyncDuckDBConnection,
    input: HourlyAggregationInput,
  ): Promise<HourlyAggregationOutput> {
    const records = await queryHourlyAggregation(conn, input)
    return { records }
  },
}

export type { HourlyAggregationRow }
