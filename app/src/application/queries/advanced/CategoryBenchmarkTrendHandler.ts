/**
 * CategoryBenchmarkTrendHandler — カテゴリベンチマーク日別トレンドクエリ
 *
 * CategoryBenchmarkChart.vm, CvTimeSeriesChart 等で使用。
 */
import type { QueryHandler, BaseQueryInput } from '../QueryContract'
import {
  queryCategoryBenchmarkTrend,
  type CategoryBenchmarkTrendRow,
} from '@/infrastructure/duckdb/queries/advancedAnalytics'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'

export interface CategoryBenchmarkTrendInput extends BaseQueryInput {
  readonly level: 'department' | 'line' | 'klass'
  readonly parentDeptCode?: string
  readonly parentLineCode?: string
}

export interface CategoryBenchmarkTrendOutput {
  readonly records: readonly CategoryBenchmarkTrendRow[]
}

export const categoryBenchmarkTrendHandler: QueryHandler<
  CategoryBenchmarkTrendInput,
  CategoryBenchmarkTrendOutput
> = {
  name: 'CategoryBenchmarkTrend',
  async execute(
    conn: AsyncDuckDBConnection,
    input: CategoryBenchmarkTrendInput,
  ): Promise<CategoryBenchmarkTrendOutput> {
    const records = await queryCategoryBenchmarkTrend(conn, input)
    return { records }
  },
}

export type { CategoryBenchmarkTrendRow }
