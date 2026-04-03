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
import type { PrevYearFlag } from '../comparisonQueryScope'

export interface LevelAggregationInput extends BaseQueryInput {
  readonly level: 'department' | 'line' | 'klass'
  readonly deptCode?: string
  readonly lineCode?: string
  readonly klassCode?: string
  readonly dow?: readonly number[]
}

export interface LevelAggregationOutput {
  readonly records: readonly LevelAggregationRow[]
}

/** Internal: isPrevYear is injected by createPairedHandler at runtime */
type ExecuteInput = LevelAggregationInput & { readonly isPrevYear?: PrevYearFlag }

export const levelAggregationHandler: QueryHandler<ExecuteInput, LevelAggregationOutput> = {
  name: 'LevelAggregation',
  async execute(conn: AsyncDuckDBConnection, input: ExecuteInput): Promise<LevelAggregationOutput> {
    const records = await queryLevelAggregation(conn, input)
    return { records }
  },
}

export type { LevelAggregationRow }
