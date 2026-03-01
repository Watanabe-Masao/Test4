/**
 * EventBus のユニットテスト
 *
 * pub/sub パターンの購読・発行・解除・エラーハンドリングをテストする。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { eventBus } from '../eventBus'

describe('EventBus', () => {
  beforeEach(() => {
    eventBus.clear()
  })

  describe('on / emit', () => {
    it('購読したイベントを受信する', () => {
      const handler = vi.fn()
      eventBus.on('DatasetImported', handler)

      const event = {
        type: 'DatasetImported' as const,
        year: 2025,
        month: 6,
        timestamp: Date.now(),
      }
      eventBus.emit(event)

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(event)
    })

    it('異なるタイプのイベントは受信しない', () => {
      const handler = vi.fn()
      eventBus.on('DatasetImported', handler)

      eventBus.emit({
        type: 'DataCleared',
        scope: 'all',
        timestamp: Date.now(),
      })

      expect(handler).not.toHaveBeenCalled()
    })

    it('複数ハンドラが登録できる', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      eventBus.on('DatasetImported', handler1)
      eventBus.on('DatasetImported', handler2)

      const event = {
        type: 'DatasetImported' as const,
        year: 2025,
        month: 6,
        timestamp: Date.now(),
      }
      eventBus.emit(event)

      expect(handler1).toHaveBeenCalledTimes(1)
      expect(handler2).toHaveBeenCalledTimes(1)
    })
  })

  describe('購読解除', () => {
    it('unsubscribe 後はイベントを受信しない', () => {
      const handler = vi.fn()
      const unsubscribe = eventBus.on('DatasetImported', handler)

      unsubscribe()

      eventBus.emit({ type: 'DatasetImported', year: 2025, month: 6, timestamp: Date.now() })
      expect(handler).not.toHaveBeenCalled()
    })

    it('一つのハンドラの解除は他のハンドラに影響しない', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      const unsub1 = eventBus.on('DatasetImported', handler1)
      eventBus.on('DatasetImported', handler2)

      unsub1()

      eventBus.emit({ type: 'DatasetImported', year: 2025, month: 6, timestamp: Date.now() })
      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).toHaveBeenCalledTimes(1)
    })
  })

  describe('エラーハンドリング', () => {
    it('ハンドラがエラーを投げても他のハンドラは実行される', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const handler1 = vi.fn(() => {
        throw new Error('handler error')
      })
      const handler2 = vi.fn()
      eventBus.on('DatasetImported', handler1)
      eventBus.on('DatasetImported', handler2)

      eventBus.emit({ type: 'DatasetImported', year: 2025, month: 6, timestamp: Date.now() })

      expect(handler1).toHaveBeenCalledTimes(1)
      expect(handler2).toHaveBeenCalledTimes(1)
      expect(consoleError).toHaveBeenCalledTimes(1)

      consoleError.mockRestore()
    })
  })

  describe('clear', () => {
    it('全ハンドラが解除される', () => {
      const handler = vi.fn()
      eventBus.on('DatasetImported', handler)
      eventBus.on('DataCleared', handler)

      eventBus.clear()

      eventBus.emit({ type: 'DatasetImported', year: 2025, month: 6, timestamp: Date.now() })
      eventBus.emit({ type: 'DataCleared', scope: 'all', timestamp: Date.now() })

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('SettingsUpdated イベント', () => {
    it('設定変更イベントを購読できる', () => {
      const handler = vi.fn()
      eventBus.on('SettingsUpdated', handler)

      const event = {
        type: 'SettingsUpdated' as const,
        changes: { defaultBudget: 1000000 },
        timestamp: Date.now(),
      }
      eventBus.emit(event)

      expect(handler).toHaveBeenCalledWith(event)
    })
  })

  describe('DatabaseRebuilt イベント', () => {
    it('再構築完了イベントを購読できる', () => {
      const handler = vi.fn()
      eventBus.on('DatabaseRebuilt', handler)

      const event = {
        type: 'DatabaseRebuilt' as const,
        monthCount: 3,
        durationMs: 1500,
        timestamp: Date.now(),
      }
      eventBus.emit(event)

      expect(handler).toHaveBeenCalledWith(event)
    })
  })
})
