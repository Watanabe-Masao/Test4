/**
 * CategoryTimeRecordsHandler — CTS レコード取得
 *
 * category_time_sales + time_slots を JOIN し CategoryTimeSalesRecord[] を返す。
 * YoYWaterfallChart 等で使用（当期/前年/fallback の 3 系統）。
 *
 * @responsibility R:unclassified
 */
import type { QueryHandler, BaseQueryInput } from '../QueryContract'
import { queryCategoryTimeRecords } from '@/infrastructure/duckdb/queries/ctsHierarchyQueries'
import type { CategoryTimeSalesRecord } from '@/domain/models/record'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { PrevYearFlag } from '../comparisonQueryScope'

export interface CategoryTimeRecordsInput extends BaseQueryInput {
  readonly isPrevYear?: PrevYearFlag
}

export interface CategoryTimeRecordsOutput {
  readonly records: readonly CategoryTimeSalesRecord[]
}

export const categoryTimeRecordsHandler: QueryHandler<
  CategoryTimeRecordsInput,
  CategoryTimeRecordsOutput
> = {
  name: 'CategoryTimeRecords',
  async execute(
    conn: AsyncDuckDBConnection,
    input: CategoryTimeRecordsInput,
  ): Promise<CategoryTimeRecordsOutput> {
    const records = await queryCategoryTimeRecords(conn, input)
    return { records }
  },
}
