/**
 * AsyncStateFactories — pure factory + adapter tests
 */
import { describe, it, expect } from 'vitest'
import {
  asyncIdle,
  asyncLoading,
  asyncSuccess,
  asyncStale,
  asyncRetryableError,
  asyncFatalError,
  toAsyncState,
} from '../AsyncStateFactories'

describe('asyncIdle', () => {
  it('idle 状態を返す（data null / error null）', () => {
    const s = asyncIdle<number>()
    expect(s.status).toBe('idle')
    expect(s.data).toBeNull()
    expect(s.error).toBeNull()
  })
})

describe('asyncLoading', () => {
  it('prev なしで loading', () => {
    const s = asyncLoading<number>()
    expect(s.status).toBe('loading')
    expect(s.data).toBeNull()
  })

  it('prev=idle なら loading（usable でないため stale 化しない）', () => {
    const s = asyncLoading<number>(asyncIdle<number>())
    expect(s.status).toBe('loading')
  })

  it('prev=success（usable, data あり）なら stale 遷移（旧データ保持）', () => {
    const prev = asyncSuccess(42)
    const s = asyncLoading<number>(prev)
    expect(s.status).toBe('stale')
    expect(s.data).toBe(42)
    expect(s.diagnostics?.message).toBe('Refetching')
  })

  it('stale 遷移時 staleSince が Date で記録される', () => {
    const s = asyncLoading<number>(asyncSuccess(1))
    expect(s.diagnostics?.staleSince).toBeInstanceOf(Date)
  })
})

describe('asyncSuccess', () => {
  it('data + status=success + updatedAt 設定', () => {
    const s = asyncSuccess({ value: 100 })
    expect(s.status).toBe('success')
    expect(s.data).toEqual({ value: 100 })
    expect(s.diagnostics?.updatedAt).toBeInstanceOf(Date)
  })
})

describe('asyncStale', () => {
  it('既存 data + staleSince で stale 状態', () => {
    const date = new Date('2026-01-01T00:00:00Z')
    const s = asyncStale({ value: 5 }, date)
    expect(s.status).toBe('stale')
    expect(s.data).toEqual({ value: 5 })
    expect(s.diagnostics?.staleSince).toBe(date)
  })
})

describe('asyncRetryableError', () => {
  it('retryable=true / error 保持', () => {
    const err = new Error('temporary failure')
    const s = asyncRetryableError<number>(err)
    expect(s.status).toBe('retryable-error')
    expect(s.error).toBe(err)
    expect(s.diagnostics?.retryable).toBe(true)
    expect(s.diagnostics?.message).toBe('temporary failure')
  })
})

describe('asyncFatalError', () => {
  it('retryable=false / error 保持', () => {
    const err = new Error('fatal')
    const s = asyncFatalError<number>(err)
    expect(s.status).toBe('fatal-error')
    expect(s.error).toBe(err)
    expect(s.diagnostics?.retryable).toBe(false)
  })
})

describe('toAsyncState', () => {
  it('error あり → fatal-error', () => {
    const err = new Error('boom')
    const s = toAsyncState({ data: null, isLoading: false, error: err })
    expect(s.status).toBe('fatal-error')
    expect(s.error).toBe(err)
  })

  it('isLoading + data あり → stale', () => {
    const s = toAsyncState({ data: 10, isLoading: true, error: null })
    expect(s.status).toBe('stale')
    expect(s.data).toBe(10)
  })

  it('isLoading + data なし → loading', () => {
    const s = toAsyncState({ data: null, isLoading: true, error: null })
    expect(s.status).toBe('loading')
  })

  it('not loading + data あり + error なし → success', () => {
    const s = toAsyncState({ data: 42, isLoading: false, error: null })
    expect(s.status).toBe('success')
    expect(s.data).toBe(42)
  })

  it('全て無し（data null + 非ロード + error なし）→ idle', () => {
    const s = toAsyncState({ data: null, isLoading: false, error: null })
    expect(s.status).toBe('idle')
  })

  it('error 優先（isLoading=true でも fatal-error 優先）', () => {
    const s = toAsyncState({ data: 1, isLoading: true, error: new Error('e') })
    expect(s.status).toBe('fatal-error')
  })
})
