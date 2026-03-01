/**
 * DuckDB スキーママイグレーション型定義
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'

/** マイグレーション定義 */
export interface Migration {
  /** マイグレーション先のバージョン番号 */
  readonly version: number
  /** 説明 */
  readonly description: string
  /** アップグレード（version - 1 → version） */
  up(conn: AsyncDuckDBConnection): Promise<void>
  /** ダウングレード（version → version - 1） */
  down(conn: AsyncDuckDBConnection): Promise<void>
}

/** マイグレーション実行結果 */
export interface MigrationResult {
  /** 実行前のバージョン */
  readonly fromVersion: number
  /** 実行後のバージョン */
  readonly toVersion: number
  /** 適用されたマイグレーション数 */
  readonly migrationsApplied: number
  /** 処理時間 (ms) */
  readonly durationMs: number
}
