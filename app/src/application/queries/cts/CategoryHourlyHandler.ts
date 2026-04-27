/**
 * CategoryHourlyHandler — カテゴリ×時間帯集約クエリ
 *
 * CategoryHourlyChart, DeptHourlyChart 等で使用。
 *
 * @responsibility R:unclassified
 */
import type { QueryHandler, BaseQueryInput } from '../QueryContract'
import {
  queryCategoryHourly,
  type CategoryHourlyRow,
} from '@/infrastructure/duckdb/queries/ctsHourlyQueries'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { PrevYearFlag } from '../comparisonQueryScope'

export interface CategoryHourlyInput extends BaseQueryInput {
  readonly level: 'department' | 'line' | 'klass'
  readonly deptCode?: string
  readonly lineCode?: string
  readonly klassCode?: string
}

export interface CategoryHourlyOutput {
  readonly records: readonly CategoryHourlyRow[]
}

/** Internal: isPrevYear is injected by createPairedHandler at runtime */
type ExecuteInput = CategoryHourlyInput & { readonly isPrevYear?: PrevYearFlag }

export const categoryHourlyHandler: QueryHandler<ExecuteInput, CategoryHourlyOutput> = {
  name: 'CategoryHourly',
  async execute(conn: AsyncDuckDBConnection, input: ExecuteInput): Promise<CategoryHourlyOutput> {
    const records = await queryCategoryHourly(conn, input)
    return { records }
  },
}

export type { CategoryHourlyRow }
