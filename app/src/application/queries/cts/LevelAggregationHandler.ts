/**
 * LevelAggregationHandler — 階層レベル別集約クエリ
 *
 * CategoryPerformanceChart, HeatmapChart, CategoryHierarchyExplorer 等で使用。
 */
import type { QueryHandler, BaseQueryInput } from '../QueryContract'
import {
  queryLevelAggregation,
  type LevelAggregationRow,
} from '@/infrastructure/duckdb/queries/ctsHierarchyQueries'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'

export interface LevelAggregationInput extends BaseQueryInput {
  readonly level: 'department' | 'line' | 'klass'
  readonly deptCode?: string
  readonly lineCode?: string
  readonly klassCode?: string
  readonly dow?: readonly number[]
  readonly isPrevYear?: boolean
}

export interface LevelAggregationOutput {
  readonly records: readonly LevelAggregationRow[]
}

export const levelAggregationHandler: QueryHandler<LevelAggregationInput, LevelAggregationOutput> =
  {
    name: 'LevelAggregation',
    async execute(
      conn: AsyncDuckDBConnection,
      input: LevelAggregationInput,
    ): Promise<LevelAggregationOutput> {
      const records = await queryLevelAggregation(conn, input)
      return { records }
    },
  }

export type { LevelAggregationRow }
