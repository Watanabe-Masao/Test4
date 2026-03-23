/**
 * CategoryHourlyHandler — カテゴリ×時間帯集約クエリ
 *
 * CategoryHourlyChart, DeptHourlyChart 等で使用。
 */
import type { QueryHandler, BaseQueryInput } from '../QueryContract'
import {
  queryCategoryHourly,
  type CategoryHourlyRow,
} from '@/infrastructure/duckdb/queries/ctsHourlyQueries'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'

export interface CategoryHourlyInput extends BaseQueryInput {
  readonly level: 'department' | 'line' | 'klass'
  readonly deptCode?: string
  readonly lineCode?: string
  readonly klassCode?: string
  readonly isPrevYear?: boolean
}

export interface CategoryHourlyOutput {
  readonly records: readonly CategoryHourlyRow[]
}

export const categoryHourlyHandler: QueryHandler<CategoryHourlyInput, CategoryHourlyOutput> = {
  name: 'CategoryHourly',
  async execute(
    conn: AsyncDuckDBConnection,
    input: CategoryHourlyInput,
  ): Promise<CategoryHourlyOutput> {
    const records = await queryCategoryHourly(conn, input)
    return { records }
  },
}

export type { CategoryHourlyRow }
