/**
 * application/queries バレル — Query Side の公開 API
 *
 * Phase 2: CQRS 核心
 * - QueryHandler: 全クエリの統一インターフェース
 * - QueryPort: DuckDB接続の抽象化
 * - Handler: 具体的なクエリ実装
 */

// 契約型
export type {
  QueryHandler,
  AsyncQueryResult,
  DateRangeFilter,
  StoreFilter,
  BaseQueryInput,
} from './QueryContract'

// ポート
export type { QueryExecutor } from './QueryPort'
export { createQueryExecutor } from './QueryPort'

// ハンドラー
export * from './summary'
export * from './dailyRecords'
export * from './weather'
export * from './cts'
export * from './advanced'
export * from './dept'
export * from './features'
export * from './comparison'
