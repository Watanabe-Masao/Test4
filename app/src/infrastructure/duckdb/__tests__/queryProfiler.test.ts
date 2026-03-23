/**
 * queryProfiler のユニットテスト
 *
 * QueryProfiler のリングバッファ、統計計算、リスナー通知をテストする。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// シングルトンではなくクラスを直接テストするため、モジュール経由でインポート
// queryProfiler はシングルトンなので、テスト間の干渉を避けるため clear() を使う
import { queryProfiler } from '@/application/services/QueryProfiler'

describe('QueryProfiler', () => {
  beforeEach(() => {
    queryProfiler.clear()
  })

  describe('start / end', () => {
    it('クエリ開始→完了でエントリが記録される', () => {
      const profile = queryProfiler.start('SELECT 1')
      profile.end(10)

      const entries = queryProfiler.getEntries()
      expect(entries).toHaveLength(1)
      expect(entries[0].sql).toBe('SELECT 1')
      expect(entries[0].status).toBe('success')
      expect(entries[0].rowCount).toBe(10)
      expect(entries[0].durationMs).toBeGreaterThanOrEqual(0)
      expect(entries[0].endTime).not.toBeNull()
      expect(entries[0].errorMessage).toBeNull()
    })

    it('rowCount 省略時は null', () => {
      const profile = queryProfiler.start('SELECT 1')
      profile.end()

      const entries = queryProfiler.getEntries()
      expect(entries[0].rowCount).toBeNull()
    })

    it('source が記録される', () => {
      const profile = queryProfiler.start('SELECT 1', 'useDuckDBQuery')
      profile.end()

      expect(queryProfiler.getEntries()[0].source).toBe('useDuckDBQuery')
    })

    it('source 省略時は null', () => {
      const profile = queryProfiler.start('SELECT 1')
      profile.end()

      expect(queryProfiler.getEntries()[0].source).toBeNull()
    })
  })

  describe('start / fail', () => {
    it('クエリ失敗でエラーが記録される', () => {
      const profile = queryProfiler.start('SELECT bad')
      profile.fail(new Error('syntax error'))

      const entries = queryProfiler.getEntries()
      expect(entries).toHaveLength(1)
      expect(entries[0].status).toBe('error')
      expect(entries[0].errorMessage).toBe('syntax error')
      expect(entries[0].durationMs).toBeGreaterThanOrEqual(0)
    })

    it('Error 以外の値も文字列化される', () => {
      const profile = queryProfiler.start('SELECT bad')
      profile.fail('string error')

      expect(queryProfiler.getEntries()[0].errorMessage).toBe('string error')
    })
  })

  describe('getEntries', () => {
    it('新しい順に返される', () => {
      const p1 = queryProfiler.start('SELECT 1')
      p1.end()
      const p2 = queryProfiler.start('SELECT 2')
      p2.end()
      const p3 = queryProfiler.start('SELECT 3')
      p3.end()

      const entries = queryProfiler.getEntries()
      expect(entries).toHaveLength(3)
      expect(entries[0].sql).toBe('SELECT 3')
      expect(entries[1].sql).toBe('SELECT 2')
      expect(entries[2].sql).toBe('SELECT 1')
    })

    it('running 状態のエントリも含まれる', () => {
      queryProfiler.start('SELECT running')

      const entries = queryProfiler.getEntries()
      expect(entries).toHaveLength(1)
      expect(entries[0].status).toBe('running')
      expect(entries[0].endTime).toBeNull()
      expect(entries[0].durationMs).toBeNull()
    })
  })

  describe('getStats', () => {
    it('空の場合はゼロ値', () => {
      const stats = queryProfiler.getStats()
      expect(stats.totalQueries).toBe(0)
      expect(stats.successCount).toBe(0)
      expect(stats.errorCount).toBe(0)
      expect(stats.avgDurationMs).toBe(0)
      expect(stats.maxDurationMs).toBe(0)
      expect(stats.totalDurationMs).toBe(0)
    })

    it('成功とエラーがカウントされる', () => {
      const p1 = queryProfiler.start('SELECT 1')
      p1.end()
      const p2 = queryProfiler.start('SELECT 2')
      p2.end()
      const p3 = queryProfiler.start('SELECT bad')
      p3.fail(new Error('err'))

      const stats = queryProfiler.getStats()
      expect(stats.totalQueries).toBe(3)
      expect(stats.successCount).toBe(2)
      expect(stats.errorCount).toBe(1)
    })

    it('running はカウントに含まれない', () => {
      queryProfiler.start('SELECT running')

      const stats = queryProfiler.getStats()
      expect(stats.totalQueries).toBe(1)
      expect(stats.successCount).toBe(0)
      expect(stats.errorCount).toBe(0)
    })
  })

  describe('clear', () => {
    it('全エントリが削除される', () => {
      const p1 = queryProfiler.start('SELECT 1')
      p1.end()
      expect(queryProfiler.getEntries()).toHaveLength(1)

      queryProfiler.clear()
      expect(queryProfiler.getEntries()).toHaveLength(0)
      expect(queryProfiler.getStats().totalQueries).toBe(0)
    })
  })

  describe('onChange', () => {
    it('エントリ追加でリスナーが呼ばれる', () => {
      const listener = vi.fn()
      queryProfiler.onChange(listener)

      queryProfiler.start('SELECT 1')
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('エントリ更新でリスナーが呼ばれる', () => {
      const listener = vi.fn()
      queryProfiler.onChange(listener)

      const profile = queryProfiler.start('SELECT 1')
      expect(listener).toHaveBeenCalledTimes(1)

      profile.end()
      expect(listener).toHaveBeenCalledTimes(2)
    })

    it('clear でリスナーが呼ばれる', () => {
      const listener = vi.fn()
      queryProfiler.onChange(listener)

      queryProfiler.clear()
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('購読解除後はリスナーが呼ばれない', () => {
      const listener = vi.fn()
      const unsubscribe = queryProfiler.onChange(listener)

      queryProfiler.start('SELECT 1')
      expect(listener).toHaveBeenCalledTimes(1)

      unsubscribe()
      queryProfiler.start('SELECT 2')
      expect(listener).toHaveBeenCalledTimes(1) // 増えない
    })
  })

  describe('ID の一意性', () => {
    it('各エントリのIDは連番で一意', () => {
      const p1 = queryProfiler.start('SELECT 1')
      p1.end()
      const p2 = queryProfiler.start('SELECT 2')
      p2.end()

      const entries = queryProfiler.getEntries()
      const ids = entries.map((e) => e.id)
      expect(new Set(ids).size).toBe(ids.length)
      // 新しい順なので id が降順
      expect(ids[0]).toBeGreaterThan(ids[1])
    })
  })
})
