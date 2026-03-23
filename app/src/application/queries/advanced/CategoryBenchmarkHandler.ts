/**
 * CategoryBenchmarkHandler — カテゴリベンチマーク（指数加重ランキング）クエリ
 *
 * CategoryBenchmarkChart.vm, PiCvBubbleChart, CvTimeSeriesChart 等で使用。
 */
import type { QueryHandler, BaseQueryInput } from '../QueryContract'
import {
  queryCategoryBenchmark,
  type CategoryBenchmarkRow,
} from '@/infrastructure/duckdb/queries/advancedAnalytics'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'

export interface CategoryBenchmarkInput extends BaseQueryInput {
  readonly level: 'department' | 'line' | 'klass'
  readonly parentDeptCode?: string
  readonly parentLineCode?: string
}

export interface CategoryBenchmarkOutput {
  readonly records: readonly CategoryBenchmarkRow[]
}

export const categoryBenchmarkHandler: QueryHandler<
  CategoryBenchmarkInput,
  CategoryBenchmarkOutput
> = {
  name: 'CategoryBenchmark',
  async execute(
    conn: AsyncDuckDBConnection,
    input: CategoryBenchmarkInput,
  ): Promise<CategoryBenchmarkOutput> {
    const records = await queryCategoryBenchmark(conn, input)
    return { records }
  },
}

export type { CategoryBenchmarkRow }
