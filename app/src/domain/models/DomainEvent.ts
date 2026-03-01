/**
 * ドメインイベント型定義
 *
 * アプリケーション内のデータ変更を表すイベント。
 * Infrastructure 層と Application 層のコンポーネント間の疎結合な連携に使用する。
 *
 * domain 層に配置するのは型定義のみ（ロジックなし）。
 */

/** データセットインポート完了 */
export interface DatasetImportedEvent {
  readonly type: 'DatasetImported'
  readonly year: number
  readonly month: number
  readonly timestamp: number
}

/** 設定変更 */
export interface SettingsUpdatedEvent {
  readonly type: 'SettingsUpdated'
  readonly changes: Record<string, unknown>
  readonly timestamp: number
}

/** データ削除 */
export interface DataClearedEvent {
  readonly type: 'DataCleared'
  readonly scope: 'month' | 'all'
  readonly year?: number
  readonly month?: number
  readonly timestamp: number
}

/** DuckDB データ再構築完了 */
export interface DatabaseRebuiltEvent {
  readonly type: 'DatabaseRebuilt'
  readonly monthCount: number
  readonly durationMs: number
  readonly timestamp: number
}

/** 全ドメインイベント共用体 */
export type DomainEvent =
  | DatasetImportedEvent
  | SettingsUpdatedEvent
  | DataClearedEvent
  | DatabaseRebuiltEvent

/** イベントタイプの文字列リテラル */
export type DomainEventType = DomainEvent['type']
