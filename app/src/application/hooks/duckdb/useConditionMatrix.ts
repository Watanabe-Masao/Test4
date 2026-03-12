/**
 * コンディションマトリクスフック
 *
 * 純粋関数は conditionMatrixLogic.ts に分離。
 * このファイルは DuckDB クエリ実行の薄いラッパーのみ。
 */
import { useMemo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import { queryConditionMatrix, type ConditionMatrixRow } from '@/infrastructure/duckdb'
import { useAsyncQuery, type AsyncQueryResult } from './useAsyncQuery'

export type { ConditionMatrixRow }

// 型と純粋関数を re-export（後方互換）
export type {
  MatrixCell,
  MatrixRowData,
  TrendDirection,
  TrendDirectionCell,
  TrendDirectionRow,
  ConditionMatrixResult,
} from './conditionMatrixLogic'
export { buildConditionMatrix } from './conditionMatrixLogic'

/**
 * DuckDB からコンディションマトリクスデータを取得する
 */
export function useDuckDBConditionMatrix(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
): AsyncQueryResult<readonly ConditionMatrixRow[]> {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    return (c: AsyncDuckDBConnection) => queryConditionMatrix(c, dateRange, storeIds)
  }, [dateRange, storeIds])

  return useAsyncQuery(conn, dataVersion, queryFn)
}
