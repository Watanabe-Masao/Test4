/**
 * DistinctDayCountHandler — 営業日数カウントクエリ
 *
 * TimeSlotChart の日次平均モードで使用。
 * total_amount > 0 の日のみカウントする（非営業日除外）。
 */
import type { QueryHandler, BaseQueryInput } from '../QueryContract'
import { queryDistinctDayCount } from '@/infrastructure/duckdb/queries/categoryTimeSales'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { PrevYearFlag } from '../comparisonQueryScope'

export interface DistinctDayCountInput extends BaseQueryInput {
  readonly isPrevYear?: PrevYearFlag
}

export interface DistinctDayCountOutput {
  readonly count: number
}

export const distinctDayCountHandler: QueryHandler<DistinctDayCountInput, DistinctDayCountOutput> =
  {
    name: 'DistinctDayCount',
    async execute(
      conn: AsyncDuckDBConnection,
      input: DistinctDayCountInput,
    ): Promise<DistinctDayCountOutput> {
      const count = await queryDistinctDayCount(conn, {
        ...input,
        businessDaysOnly: true,
      })
      return { count }
    },
  }
