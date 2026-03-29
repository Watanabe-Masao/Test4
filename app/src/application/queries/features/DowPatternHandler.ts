/**
 * DowPatternHandler — 曜日パターン集計（composite handler）
 *
 * DuckDB から生データ（StoreDaySummary）を取得し、
 * domain 層の computeDowPattern で曜日別集約を計算する。
 *
 * @migration P5: single-source composite handler（DuckDB取得 + JS計算）
 */
import type { QueryHandler, BaseQueryInput } from '../QueryContract'
import { queryStoreDaySummary } from '@/infrastructure/duckdb/queries/storeDaySummary'
import { computeDowPattern, type DowPatternRow } from '@/application/query-bridge/rawAggregation'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'

export type DowPatternInput = BaseQueryInput

export interface DowPatternOutput {
  readonly records: readonly DowPatternRow[]
}

export const dowPatternHandler: QueryHandler<DowPatternInput, DowPatternOutput> = {
  name: 'DowPattern',
  async execute(conn: AsyncDuckDBConnection, input: DowPatternInput): Promise<DowPatternOutput> {
    const rawRows = await queryStoreDaySummary(conn, input)
    const records = computeDowPattern(rawRows)
    return { records }
  },
}

export type { DowPatternRow }
