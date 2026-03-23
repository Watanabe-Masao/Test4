/**
 * CategoryHierarchyHandler — カテゴリ階層一覧クエリ
 *
 * 部門/ライン/クラスの distinct 一覧を取得（階層フィルタ用ドロップダウン）。
 * CategoryBenchmarkChart.vm, CategoryBoxPlotChart.vm 等で使用。
 */
import type { QueryHandler, BaseQueryInput } from '../QueryContract'
import {
  queryCategoryHierarchy,
  type CategoryHierarchyItem,
} from '@/infrastructure/duckdb/queries/advancedAnalytics'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'

export interface CategoryHierarchyInput extends BaseQueryInput {
  readonly level: 'department' | 'line' | 'klass'
  readonly parentDeptCode?: string
}

export interface CategoryHierarchyOutput {
  readonly records: readonly CategoryHierarchyItem[]
}

export const categoryHierarchyHandler: QueryHandler<
  CategoryHierarchyInput,
  CategoryHierarchyOutput
> = {
  name: 'CategoryHierarchy',
  async execute(
    conn: AsyncDuckDBConnection,
    input: CategoryHierarchyInput,
  ): Promise<CategoryHierarchyOutput> {
    const records = await queryCategoryHierarchy(conn, input)
    return { records }
  },
}

export type { CategoryHierarchyItem }
