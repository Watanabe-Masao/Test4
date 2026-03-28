/**
 * CategoryDiscountHandler — カテゴリ別売変分析の QueryHandler
 *
 * classified_sales から部門/ライン/クラス別の売変内訳を集計。
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { QueryHandler } from '@/application/queries/QueryContract'
import {
  queryCategoryDiscount,
  type CategoryDiscountRow,
} from '@/infrastructure/duckdb/queries/categoryDiscount'
import type { BaseQueryInput } from '@/application/queries/QueryContract'

export interface CategoryDiscountInput extends BaseQueryInput {
  readonly level: 'department' | 'line' | 'klass'
  readonly isPrevYear?: boolean
  /** 親カテゴリでフィルタ（ドリルダウン用） */
  readonly parentFilter?: { readonly column: string; readonly value: string }
}

export interface CategoryDiscountOutput {
  readonly records: readonly CategoryDiscountRow[]
}

export const categoryDiscountHandler: QueryHandler<CategoryDiscountInput, CategoryDiscountOutput> =
  {
    name: 'CategoryDiscount',
    async execute(
      conn: AsyncDuckDBConnection,
      input: CategoryDiscountInput,
    ): Promise<CategoryDiscountOutput> {
      const records = await queryCategoryDiscount(conn, {
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        storeIds: input.storeIds,
        level: input.level,
        isPrevYear: input.isPrevYear ?? false,
        parentFilter: input.parentFilter,
      })
      return { records }
    },
  }
