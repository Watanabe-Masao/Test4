/**
 * StoreDaySummaryHandler — 店舗×日サマリークエリ
 *
 * FactorDecompositionPanel, WeatherAnalysisPanel 等で使用。
 */
import type { QueryHandler, BaseQueryInput } from '../QueryContract'
import {
  queryStoreDaySummary,
  type StoreDaySummaryRow,
} from '@/infrastructure/duckdb/queries/storeDaySummary'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'

export interface StoreDaySummaryInput extends BaseQueryInput {
  readonly isPrevYear?: boolean
}

export interface StoreDaySummaryOutput {
  readonly records: readonly StoreDaySummaryRow[]
}

export const storeDaySummaryHandler: QueryHandler<StoreDaySummaryInput, StoreDaySummaryOutput> = {
  name: 'StoreDaySummary',
  async execute(
    conn: AsyncDuckDBConnection,
    input: StoreDaySummaryInput,
  ): Promise<StoreDaySummaryOutput> {
    const records = await queryStoreDaySummary(conn, input)
    return { records }
  },
}

export type { StoreDaySummaryRow }
