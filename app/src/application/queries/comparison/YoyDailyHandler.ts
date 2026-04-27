/**
 * YoyDailyHandler — 前年比較日別データ（comparison-coupled composite handler）
 *
 * 当期・前期のStoreDaySummaryを2回取得し、
 * application/comparison の resolveComparisonRows で日単位比較先を解決する。
 *
 * @migration P5: comparison-coupled composite handler
 *
 * @responsibility R:unclassified
 */
import type { QueryHandler } from '../QueryContract'
import { queryStoreDaySummary } from '@/infrastructure/duckdb/queries/storeDaySummary'
import type { YoyDailyRow } from '@/infrastructure/duckdb/queries/yoyComparison'
import { computeYoyDailyV2 } from '@/application/hooks/duckdb/jsAggregationLogic'
import type { CompareModeV2 } from '@/application/comparison/comparisonTypes'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import { CURRENT_SCOPE, COMPARISON_SCOPE } from '../comparisonQueryScope'

export interface YoyDailyInput {
  /** 当期の日付範囲 */
  readonly curDateFrom: string
  readonly curDateTo: string
  /** 前期の日付範囲 */
  readonly prevDateFrom: string
  readonly prevDateTo: string
  readonly storeIds?: readonly string[]
  readonly compareMode: CompareModeV2
}

export interface YoyDailyOutput {
  /** YoyDailyRow 上位互換（matchStatus 付き） */
  readonly records: readonly YoyDailyRow[]
}

export const yoyDailyHandler: QueryHandler<YoyDailyInput, YoyDailyOutput> = {
  name: 'YoyDaily',
  async execute(conn: AsyncDuckDBConnection, input: YoyDailyInput): Promise<YoyDailyOutput> {
    // 当期・前期を並列取得
    const [curRows, prevRows] = await Promise.all([
      queryStoreDaySummary(conn, {
        dateFrom: input.curDateFrom,
        dateTo: input.curDateTo,
        storeIds: input.storeIds,
        isPrevYear: CURRENT_SCOPE,
      }),
      queryStoreDaySummary(conn, {
        dateFrom: input.prevDateFrom,
        dateTo: input.prevDateTo,
        storeIds: input.storeIds,
        isPrevYear: COMPARISON_SCOPE,
      }),
    ])

    const records = computeYoyDailyV2(curRows, prevRows, input.compareMode)
    return { records }
  },
}

export type { YoyDailyRow }
