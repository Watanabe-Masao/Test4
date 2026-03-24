/**
 * useAppLifecycle 状態遷移テスト
 *
 * 各入力の組み合わせに対して正しい AppLifecyclePhase が導出されることを検証する。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { PersistenceStatusInfo } from '@/application/hooks/usePersistence'
import { resetSwUpdateSignal, notifySwUpdate } from '../swUpdateSignal'

// ── DuckDB engine mock ─────────────────────────────────

type DuckDBEngineState = 'idle' | 'initializing' | 'ready' | 'error' | 'disposed'

let mockEngineState: DuckDBEngineState = 'idle'
let mockEngineError: Error | null = null
const mockOnStateChange = vi.fn(() => vi.fn())

vi.mock('@/infrastructure/duckdb/engine', () => ({
  getDuckDBEngine: () => ({
    get state() {
      return mockEngineState
    },
    get error() {
      return mockEngineError
    },
    onStateChange: mockOnStateChange,
  }),
}))

import { useAppLifecycle } from '../useAppLifecycle'

// ── Helpers ────────────────────────────────────────────

function makePersistence(overrides?: Partial<PersistenceStatusInfo>): PersistenceStatusInfo {
  return {
    isRestoring: false,
    autoRestored: false,
    restoreError: null,
    ...overrides,
  }
}

// ── Setup ──────────────────────────────────────────────

beforeEach(() => {
  mockEngineState = 'idle'
  mockEngineError = null
  mockOnStateChange.mockImplementation(() => vi.fn())
  resetSwUpdateSignal()
})

// ── Tests ──────────────────────────────────────────────

describe('useAppLifecycle', () => {
  describe('phase derivation', () => {
    it('returns error when persistence has restoreError', () => {
      mockEngineState = 'ready'
      const { result } = renderHook(() =>
        useAppLifecycle({
          persistence: makePersistence({ restoreError: 'DB error', autoRestored: false }),
        }),
      )
      expect(result.current.phase).toBe('error')
      expect(result.current.error).toBe('DB error')
      expect(result.current.blocking).toBe(false)
    })

    it('returns error when engine state is error', () => {
      mockEngineState = 'error'
      mockEngineError = new Error('WASM failed')
      const { result } = renderHook(() =>
        useAppLifecycle({
          persistence: makePersistence({ autoRestored: true }),
        }),
      )
      expect(result.current.phase).toBe('error')
      expect(result.current.error).toBe('WASM failed')
    })

    it('returns applying_update when SW update is notified', () => {
      mockEngineState = 'ready'
      act(() => {
        notifySwUpdate()
      })
      const { result } = renderHook(() =>
        useAppLifecycle({
          persistence: makePersistence({ autoRestored: true }),
        }),
      )
      expect(result.current.phase).toBe('applying_update')
      expect(result.current.blocking).toBe(true)
    })

    it('returns restoring when persistence is restoring', () => {
      mockEngineState = 'ready'
      const { result } = renderHook(() =>
        useAppLifecycle({
          persistence: makePersistence({ isRestoring: true }),
        }),
      )
      expect(result.current.phase).toBe('restoring')
      expect(result.current.blocking).toBe(true)
    })

    it('returns initializing_engine when engine is idle', () => {
      mockEngineState = 'idle'
      const { result } = renderHook(() =>
        useAppLifecycle({
          persistence: makePersistence({ autoRestored: true }),
        }),
      )
      expect(result.current.phase).toBe('initializing_engine')
      expect(result.current.blocking).toBe(true)
    })

    it('returns initializing_engine when engine is initializing', () => {
      mockEngineState = 'initializing'
      const { result } = renderHook(() =>
        useAppLifecycle({
          persistence: makePersistence({ autoRestored: true }),
        }),
      )
      expect(result.current.phase).toBe('initializing_engine')
    })

    it('returns booting when autoRestored is false and engine is ready', () => {
      mockEngineState = 'ready'
      const { result } = renderHook(() =>
        useAppLifecycle({
          persistence: makePersistence({ autoRestored: false }),
        }),
      )
      expect(result.current.phase).toBe('booting')
      expect(result.current.blocking).toBe(true)
    })

    it('returns ready when all conditions are met', () => {
      mockEngineState = 'ready'
      const { result } = renderHook(() =>
        useAppLifecycle({
          persistence: makePersistence({ autoRestored: true }),
        }),
      )
      expect(result.current.phase).toBe('ready')
      expect(result.current.blocking).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  describe('priority order', () => {
    it('error takes precedence over applying_update', () => {
      mockEngineState = 'ready'
      act(() => {
        notifySwUpdate()
      })
      const { result } = renderHook(() =>
        useAppLifecycle({
          persistence: makePersistence({ restoreError: 'fail' }),
        }),
      )
      expect(result.current.phase).toBe('error')
    })

    it('applying_update takes precedence over restoring', () => {
      mockEngineState = 'ready'
      act(() => {
        notifySwUpdate()
      })
      const { result } = renderHook(() =>
        useAppLifecycle({
          persistence: makePersistence({ isRestoring: true }),
        }),
      )
      expect(result.current.phase).toBe('applying_update')
    })

    it('restoring takes precedence over initializing_engine', () => {
      mockEngineState = 'idle'
      const { result } = renderHook(() =>
        useAppLifecycle({
          persistence: makePersistence({ isRestoring: true }),
        }),
      )
      expect(result.current.phase).toBe('restoring')
    })
  })
})
