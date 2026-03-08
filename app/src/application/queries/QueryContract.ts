/**
 * QueryHandler 統一パターン — Query Side の型契約
 *
 * 全 DuckDB クエリは QueryHandler インターフェースに従う。
 * Input/Output 型を明示化し、テスト可能にする。
 *
 * Phase 2: CQRS 核心 — Command（JS計算）と Query（DuckDB探索）の明示的分離
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'

/**
 * QueryHandler — 全クエリの共通インターフェース
 *
 * @template TInput  クエリのフィルタ条件（ReadModel の入力）
 * @template TOutput クエリの結果（ReadModel）
 */
export interface QueryHandler<TInput, TOutput> {
  /** ハンドラー名（ログ・プロファイリング用） */
  readonly name: string
  /** クエリ実行 */
  execute(conn: AsyncDuckDBConnection, input: TInput): Promise<TOutput>
}

/**
 * useAsyncQuery の戻り値型
 */
export interface AsyncQueryResult<T> {
  readonly data: T | null
  readonly isLoading: boolean
  readonly error: Error | null
}

/**
 * 日付範囲フィルタ — 多くのクエリで共通
 */
export interface DateRangeFilter {
  readonly dateFrom: string
  readonly dateTo: string
}

/**
 * 店舗フィルタ — 多くのクエリで共通
 */
export interface StoreFilter {
  readonly storeIds?: readonly string[]
}

/**
 * 基本クエリ入力 — DateRange + Store の組み合わせ
 */
export interface BaseQueryInput extends DateRangeFilter, StoreFilter {}
