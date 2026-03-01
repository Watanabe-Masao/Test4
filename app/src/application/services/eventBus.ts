/**
 * ドメインイベントバス
 *
 * 同期 pub/sub パターンでコンポーネント間の疎結合な連携を実現する。
 * 主な用途:
 * - データインポート完了 → DuckDB 増分ロードトリガー
 * - データ削除 → DuckDB テーブルクリーン
 *
 * 使い方:
 * ```
 * import { eventBus } from '@/application/services/eventBus'
 *
 * // 購読
 * const unsub = eventBus.on('DatasetImported', (event) => {
 *   console.log(`${event.year}-${event.month} imported`)
 * })
 *
 * // 発行
 * eventBus.emit({ type: 'DatasetImported', year: 2025, month: 6, timestamp: Date.now() })
 *
 * // 購読解除
 * unsub()
 * ```
 */
import type { DomainEvent, DomainEventType } from '@/domain/models'

type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => void

/** イベントタイプから対応するイベント型を抽出 */
type EventByType<T extends DomainEventType> = Extract<DomainEvent, { type: T }>

class EventBus {
  private readonly _handlers = new Map<DomainEventType, Set<EventHandler>>()

  /**
   * 指定タイプのイベントを購読する。
   * @returns 購読解除関数
   */
  on<T extends DomainEventType>(
    type: T,
    handler: EventHandler<EventByType<T>>,
  ): () => void {
    if (!this._handlers.has(type)) {
      this._handlers.set(type, new Set())
    }
    const handlers = this._handlers.get(type)!
    handlers.add(handler as EventHandler)

    return () => {
      handlers.delete(handler as EventHandler)
      if (handlers.size === 0) {
        this._handlers.delete(type)
      }
    }
  }

  /**
   * イベントを発行する。登録済みの全ハンドラに同期的に通知する。
   */
  emit(event: DomainEvent): void {
    const handlers = this._handlers.get(event.type)
    if (!handlers) return

    for (const handler of handlers) {
      try {
        handler(event)
      } catch (err) {
        console.error(`EventBus: handler error for ${event.type}`, err)
      }
    }
  }

  /**
   * 全ハンドラを解除する（テスト用）。
   */
  clear(): void {
    this._handlers.clear()
  }
}

/** グローバルシングルトン */
export const eventBus = new EventBus()
