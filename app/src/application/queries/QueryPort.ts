/**
 * QueryPort — DuckDB接続の抽象化
 *
 * Infrastructure 層の DuckDB 接続を Application 層で型安全に使うためのポート。
 * テスト時はモック接続を注入可能。
 */
import type { AsyncDuckDBConnection, AsyncDuckDB } from '@duckdb/duckdb-wasm'
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
}

/**
 * Legacy DuckDB 接続レジストリ。
 *
 * QueryHandler 未移行の旧フック（useDuckDBCategoryTimeRecords 等）が
 * queryExecutor から raw conn/db を取得するためのエスケープハッチ。
 * presentation/ では使用禁止 — application/ の旧フック専用。
 *
 * @internal 全フックが QueryHandler に移行したら削除する。
 */
const legacyRegistry = new WeakMap<
  QueryExecutor,
  { conn: AsyncDuckDBConnection | null; db: AsyncDuckDB | null }
>()

/**
 * DuckDB コネクションベースの QueryExecutor 実装
 *
 * @param db 天気 ETRN 永続化等のバルク INSERT 用。省略可。
 */
export function createQueryExecutor(
  conn: AsyncDuckDBConnection | null,
  db?: AsyncDuckDB | null,
): QueryExecutor {
  const executor: QueryExecutor = {
    isReady: conn !== null,
    async execute<TInput, TOutput>(
      handler: QueryHandler<TInput, TOutput>,
      input: TInput,
    ): Promise<TOutput | null> {
      if (!conn) return null
      return handler.execute(conn, input)
    },
  }
  legacyRegistry.set(executor, { conn, db: db ?? null })
  return executor
}

/**
 * QueryHandler 未移行の旧フック用エスケープハッチ。
 *
 * application/hooks/duckdb/ 内の旧フック（useDuckDBCategoryTimeRecords 等）が
 * queryExecutor から raw conn/db を取得するために使う。
 * presentation/ では使用禁止。
 *
 * @internal 全フックが QueryHandler に移行したら削除する。
 */
export function getLegacyDuckDB(executor: QueryExecutor | null | undefined): {
  conn: AsyncDuckDBConnection | null
  db: AsyncDuckDB | null
} {
  if (!executor) return { conn: null, db: null }
  return legacyRegistry.get(executor) ?? { conn: null, db: null }
}
