/**
 * DailyQuantityPairHandler — 当年+前年の日別買上点数を 1 回で取得
 *
 * 従来は当年・前年を 2 回の useQueryWithHandler で sequential に取得していた。
 * このハンドラーは Promise.all で並列取得し、レスポンスタイムを半減させる。
 */
import type { QueryHandler, BaseQueryInput } from '../QueryContract'
import {
  queryDailyQuantity,
  type DailyQuantityRow,
} from '@/infrastructure/duckdb/queries/aggregates/dailyAggregation'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import { CURRENT_SCOPE, COMPARISON_SCOPE } from '../comparisonQueryScope'

export interface DailyQuantityPairInput extends BaseQueryInput {
  /** 前年の日付範囲（null = 前年なし） */
  readonly prevDateFrom?: string
  readonly prevDateTo?: string
}

export interface DailyQuantityPairOutput {
  readonly current: readonly DailyQuantityRow[]
  readonly prev: readonly DailyQuantityRow[]
}

export const dailyQuantityPairHandler: QueryHandler<
  DailyQuantityPairInput,
  DailyQuantityPairOutput
> = {
  name: 'DailyQuantityPair',
  async execute(
    conn: AsyncDuckDBConnection,
    input: DailyQuantityPairInput,
  ): Promise<DailyQuantityPairOutput> {
    const curPromise = queryDailyQuantity(conn, {
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
      storeIds: input.storeIds ? [...input.storeIds] : undefined,
      isPrevYear: CURRENT_SCOPE,
    })

    const prevPromise =
      input.prevDateFrom && input.prevDateTo
        ? queryDailyQuantity(conn, {
            dateFrom: input.prevDateFrom,
            dateTo: input.prevDateTo,
            storeIds: input.storeIds ? [...input.storeIds] : undefined,
            isPrevYear: COMPARISON_SCOPE,
          })
        : Promise.resolve([] as DailyQuantityRow[])

    const [current, prev] = await Promise.all([curPromise, prevPromise])
    return { current, prev }
  },
}

export type { DailyQuantityRow }
