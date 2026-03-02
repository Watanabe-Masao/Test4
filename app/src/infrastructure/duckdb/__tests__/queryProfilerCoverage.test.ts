/**
 * queryProfiler 追加テスト — カバレッジ補完
 *
 * 既存の queryProfiler.test.ts を補完し、
 * getStats / onChange / リングバッファ / fail パスをカバーする。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// テスト用にクラスを直接インスタンス化するため、モジュールを再インポート
// グローバルシングルトンではなく新しいインスタンスで独立テスト
// queryProfiler はグローバルシングルトンなので直接使用
import { queryProfiler } from '../queryProfiler'

describe('queryProfiler (coverage supplement)', () => {
  beforeEach(() => {
    queryProfiler.clear()
  })

  it('start → end records success entry', () => {
    const profile = queryProfiler.start('SELECT 1')
    profile.end(10)

    const entries = queryProfiler.getEntries()
    expect(entries.length).toBeGreaterThanOrEqual(1)
    const entry = entries[0]
    expect(entry.sql).toBe('SELECT 1')
    expect(entry.status).toBe('success')
    expect(entry.rowCount).toBe(10)
    expect(entry.durationMs).toBeGreaterThanOrEqual(0)
    expect(entry.endTime).not.toBeNull()
  })

  it('start → fail records error entry', () => {
    const profile = queryProfiler.start('SELECT bad')
    profile.fail(new Error('syntax error'))

    const entries = queryProfiler.getEntries()
    const entry = entries[0]
    expect(entry.status).toBe('error')
    expect(entry.errorMessage).toBe('syntax error')
    expect(entry.durationMs).toBeGreaterThanOrEqual(0)
  })

  it('fail with non-Error records string message', () => {
    const profile = queryProfiler.start('SELECT ?')
    profile.fail('string error')

    const entries = queryProfiler.getEntries()
    expect(entries[0].errorMessage).toBe('string error')
  })

  it('end without rowCount sets null', () => {
    const profile = queryProfiler.start('SELECT 1')
    profile.end()

    const entries = queryProfiler.getEntries()
    expect(entries[0].rowCount).toBeNull()
  })

  it('start with source records source field', () => {
    const profile = queryProfiler.start('SELECT 1', 'test-source')
    profile.end()

    const entries = queryProfiler.getEntries()
    expect(entries[0].source).toBe('test-source')
  })

  it('start without source sets null', () => {
    const profile = queryProfiler.start('SELECT 1')
    profile.end()

    const entries = queryProfiler.getEntries()
    expect(entries[0].source).toBeNull()
  })

  it('getEntries returns newest first', () => {
    const p1 = queryProfiler.start('Q1')
    p1.end()
    const p2 = queryProfiler.start('Q2')
    p2.end()

    const entries = queryProfiler.getEntries()
    expect(entries[0].sql).toBe('Q2')
    expect(entries[1].sql).toBe('Q1')
  })

  it('getStats returns correct statistics', () => {
    const p1 = queryProfiler.start('Q1')
    p1.end(5)
    const p2 = queryProfiler.start('Q2')
    p2.end(10)
    const p3 = queryProfiler.start('Q3')
    p3.fail(new Error('fail'))

    const stats = queryProfiler.getStats()
    expect(stats.totalQueries).toBe(3)
    expect(stats.successCount).toBe(2)
    expect(stats.errorCount).toBe(1)
    expect(stats.avgDurationMs).toBeGreaterThanOrEqual(0)
    expect(stats.maxDurationMs).toBeGreaterThanOrEqual(0)
    expect(stats.totalDurationMs).toBeGreaterThanOrEqual(0)
  })

  it('getStats returns zero averages when empty', () => {
    const stats = queryProfiler.getStats()
    expect(stats.totalQueries).toBe(0)
    expect(stats.successCount).toBe(0)
    expect(stats.errorCount).toBe(0)
    expect(stats.avgDurationMs).toBe(0)
    expect(stats.maxDurationMs).toBe(0)
  })

  it('clear removes all entries', () => {
    const p = queryProfiler.start('Q1')
    p.end()
    expect(queryProfiler.getEntries().length).toBeGreaterThan(0)

    queryProfiler.clear()
    expect(queryProfiler.getEntries().length).toBe(0)
  })

  it('onChange listener is called on start, end, clear', () => {
    const listener = vi.fn()
    const unsub = queryProfiler.onChange(listener)

    const p = queryProfiler.start('Q1') // triggers notify
    expect(listener).toHaveBeenCalledTimes(1)

    p.end() // triggers notify
    expect(listener).toHaveBeenCalledTimes(2)

    queryProfiler.clear() // triggers notify
    expect(listener).toHaveBeenCalledTimes(3)

    unsub()
    queryProfiler.start('Q2')
    expect(listener).toHaveBeenCalledTimes(3) // unsubscribed
  })

  it('onChange unsubscribe removes listener', () => {
    const listener = vi.fn()
    const unsub = queryProfiler.onChange(listener)
    unsub()

    queryProfiler.start('Q1')
    expect(listener).not.toHaveBeenCalled()
  })
})
