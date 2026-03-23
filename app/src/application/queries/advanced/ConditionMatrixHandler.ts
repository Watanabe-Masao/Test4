/**
 * ConditionMatrixHandler — コンディションマトリクスクエリ
 *
 * 5期間（当期/前年/前週/後半/前半）の店舗別メトリクスを一括取得。
 * ConditionMatrixTable で使用。
 *
 * 注意: queryConditionMatrix は DateRange を直接受け取るため、
 * input は BaseQueryInput ではなく独自型を使用。
 */
import type { QueryHandler } from '../QueryContract'
import type { DateRange } from '@/domain/models/calendar'
import {
  queryConditionMatrix,
  type ConditionMatrixRow,
} from '@/infrastructure/duckdb/queries/conditionMatrix'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'

export interface ConditionMatrixInput {
  readonly dateRange: DateRange
  readonly storeIds?: ReadonlySet<string>
}

export interface ConditionMatrixOutput {
  readonly records: readonly ConditionMatrixRow[]
}

export const conditionMatrixHandler: QueryHandler<ConditionMatrixInput, ConditionMatrixOutput> = {
  name: 'ConditionMatrix',
  async execute(
    conn: AsyncDuckDBConnection,
    input: ConditionMatrixInput,
  ): Promise<ConditionMatrixOutput> {
    const records = await queryConditionMatrix(conn, input.dateRange, input.storeIds)
    return { records }
  },
}

export type { ConditionMatrixRow }
