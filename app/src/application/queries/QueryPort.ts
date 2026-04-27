/**
 * QueryPort — DuckDB接続の抽象化
 *
 * Infrastructure 層の DuckDB 接続を Application 層で型安全に使うためのポート。
 * テスト時はモック接続を注入可能。
 *
 * @responsibility R:unclassified
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { QueryHandler } from './QueryContract'

/**
 * QueryExecutor — QueryHandler をコネクション付きで実行する
 *
 * フック内で直接 conn を渡す代わりに、QueryExecutor 経由で実行する。
 * テスト時はモック QueryExecutor を注入できる。
 */
export interface QueryExecutor {
  /**
   * QueryHandler を実行する
   * @returns null if connection is not available
   */
  execute<TInput, TOutput>(
    handler: QueryHandler<TInput, TOutput>,
    input: TInput,
  ): Promise<TOutput | null>

  /** 接続が利用可能か */
  readonly isReady: boolean

  /** データロードバージョン（DuckDB ロード完了ごとに increment） */
  readonly dataVersion: number
}

/**
 * DuckDB コネクションベースの QueryExecutor 実装
 *
 * dataVersion を含めることで、データロード完了時に参照が変わり、
 * useQueryWithHandler の effect が再実行される。
 */
export function createQueryExecutor(
  conn: AsyncDuckDBConnection | null,
  dataVersion?: number,
): QueryExecutor {
  // dataVersion を含めた新しいオブジェクトを毎回生成することで、
  // useMemo の deps に dataVersion を加えた時に参照が変わる
  return {
    isReady: conn !== null,
    dataVersion: dataVersion ?? 0,
    async execute<TInput, TOutput>(
      handler: QueryHandler<TInput, TOutput>,
      input: TInput,
    ): Promise<TOutput | null> {
      if (!conn) return null
      return handler.execute(conn, input)
    },
  }
}
