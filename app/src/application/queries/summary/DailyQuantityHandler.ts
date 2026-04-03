/**
 * DailyQuantityHandler — 日別買上点数クエリ
 *
 * DailySalesChart の「点数」右軸で使用。
 * store_day_summary.total_quantity を date_key で集約し、全店合計の日別点数を返す。
 */
import type { QueryHandler, BaseQueryInput } from '../QueryContract'
import {
  queryDailyQuantity,
  type DailyQuantityRow,
} from '@/infrastructure/duckdb/queries/aggregates/dailyAggregation'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { PrevYearFlag } from '../comparisonQueryScope'

export type DailyQuantityInput = BaseQueryInput

export interface DailyQuantityOutput {
  readonly records: readonly DailyQuantityRow[]
}

/** Internal: isPrevYear is injected at runtime */
type ExecuteInput = DailyQuantityInput & { readonly isPrevYear?: PrevYearFlag }

export const dailyQuantityHandler: QueryHandler<ExecuteInput, DailyQuantityOutput> = {
  name: 'DailyQuantity',
  async execute(conn: AsyncDuckDBConnection, input: ExecuteInput): Promise<DailyQuantityOutput> {
    const records = await queryDailyQuantity(conn, input)
    return { records }
  },
}

export type { DailyQuantityRow }
