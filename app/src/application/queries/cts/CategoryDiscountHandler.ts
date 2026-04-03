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
import type { PrevYearFlag } from '../comparisonQueryScope'

export interface CategoryDiscountInput extends BaseQueryInput {
  readonly level: 'department' | 'line' | 'klass'
  /** 親カテゴリでフィルタ（ドリルダウン用） */
  readonly parentFilter?: { readonly column: string; readonly value: string }
}

export interface CategoryDiscountOutput {
  readonly records: readonly CategoryDiscountRow[]
}

/** Internal: isPrevYear is injected by createPairedHandler at runtime */
type ExecuteInput = CategoryDiscountInput & { readonly isPrevYear?: PrevYearFlag }

export const categoryDiscountHandler: QueryHandler<ExecuteInput, CategoryDiscountOutput> = {
  name: 'CategoryDiscount',
  async execute(conn: AsyncDuckDBConnection, input: ExecuteInput): Promise<CategoryDiscountOutput> {
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
