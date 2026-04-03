/**
 * CategoryDailyTrendHandler — カテゴリ別日次売上トレンドクエリ
 *
 * CategoryTrendChart 等で使用。
 */
import type { QueryHandler, BaseQueryInput } from '../QueryContract'
import {
  queryCategoryDailyTrend,
  type CategoryDailyTrendRow,
} from '@/infrastructure/duckdb/queries/ctsHierarchyQueries'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'

export interface CategoryDailyTrendInput extends BaseQueryInput {
  readonly level: 'department' | 'line' | 'klass'
  readonly topN?: number
  readonly deptCode?: string
  readonly lineCode?: string
  readonly klassCode?: string
  readonly dow?: readonly number[]
}

export interface CategoryDailyTrendOutput {
  readonly records: readonly CategoryDailyTrendRow[]
}

export const categoryDailyTrendHandler: QueryHandler<
  CategoryDailyTrendInput,
  CategoryDailyTrendOutput
> = {
  name: 'CategoryDailyTrend',
  async execute(
    conn: AsyncDuckDBConnection,
    input: CategoryDailyTrendInput,
  ): Promise<CategoryDailyTrendOutput> {
    const records = await queryCategoryDailyTrend(conn, input)
    return { records }
  },
}

export type { CategoryDailyTrendRow }
