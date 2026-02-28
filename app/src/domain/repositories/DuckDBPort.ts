/**
 * DuckDB 分析エンジンへのアクセス契約
 *
 * Application 層が Infrastructure 層の DuckDB 実装に直接依存しないよう、
 * エンジンの状態とコネクションをインターフェースとして抽象化する。
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'

/** DuckDB エンジンの状態 */
export type DuckDBState = 'idle' | 'initializing' | 'ready' | 'error'

/** DuckDB 分析エンジンのポート */
export interface DuckDBAnalyticsPort {
  /** エンジンの準備状態（ready 時のみクエリ可能） */
  readonly isReady: boolean
  /** 接続（準備完了時のみ非 null） */
  readonly conn: AsyncDuckDBConnection | null
  /** データバージョン（useMemo 依存配列用。ロード成功ごとにインクリメント） */
  readonly dataVersion: number
  /** エラーメッセージ（エラー時のみ非 null） */
  readonly error: string | null
  /** データロード中フラグ */
  readonly isLoading: boolean
}
