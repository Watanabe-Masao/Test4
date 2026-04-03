/**
 * CategoryMixWeeklyHandler — カテゴリ構成比週次推移クエリ
 *
 * CategoryMixChart で使用。
 */
import type { QueryHandler, BaseQueryInput } from '../QueryContract'
import {
  queryCategoryMixWeekly,
  type CategoryMixWeeklyRow,
} from '@/infrastructure/duckdb/queries/advancedAnalytics'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'

export interface CategoryMixWeeklyInput extends BaseQueryInput {
  readonly level: 'department' | 'line' | 'klass'
}

export interface CategoryMixWeeklyOutput {
  readonly records: readonly CategoryMixWeeklyRow[]
}

export const categoryMixWeeklyHandler: QueryHandler<
  CategoryMixWeeklyInput,
  CategoryMixWeeklyOutput
> = {
  name: 'CategoryMixWeekly',
  async execute(
    conn: AsyncDuckDBConnection,
    input: CategoryMixWeeklyInput,
  ): Promise<CategoryMixWeeklyOutput> {
    const records = await queryCategoryMixWeekly(conn, input)
    return { records }
  },
}

export type { CategoryMixWeeklyRow }
