/**
 * computeMovingAverage candidate dual-run compare + rollback テスト
 * @contractId ANA-009
 * @semanticClass analytic
 * @authorityKind candidate-authoritative
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { computeMovingAverage as computeTS } from '@/domain/calculations/temporal/computeMovingAverage'
import * as wasmEngine from '@/application/services/wasmEngine'

vi.mock('@/application/services/movingAverageWasm', () => ({
  computeMovingAverageWasm: vi.fn(),
}))

import {
  computeMovingAverage,
  setMovingAverageBridgeMode,
  getMovingAverageBridgeMode,
  getLastDualRunResult,
  rollbackToCurrentOnly,
} from '@/application/services/movingAverageBridge'
import { computeMovingAverageWasm } from '@/application/services/movingAverageWasm'

function setupWasmMocks(): void {
  vi.mocked(computeMovingAverageWasm).mockImplementation((s, w, p) => computeTS(s, w, p))
}

function setupWasmReady(): void {
  vi.spyOn(wasmEngine, 'getMovingAverageWasmExports').mockReturnValue({} as never)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
  setMovingAverageBridgeMode('current-only')
  setupWasmMocks()
})

const SERIES = [
  { value: 100, status: 'ok' as const },
  { value: 200, status: 'ok' as const },
  { value: 300, status: 'ok' as const },
  { value: null, status: 'missing' as const },
  { value: 500, status: 'ok' as const },
]

describe('movingAverage candidate dual-run compare', () => {
  it('dual-run match strict', () => {
    setupWasmReady()
    setMovingAverageBridgeMode('dual-run-compare')
    computeMovingAverage(SERIES, 3, 'strict')
    expect(getLastDualRunResult()!.match).toBe(true)
  })

  it('dual-run match partial', () => {
    setupWasmReady()
    setMovingAverageBridgeMode('dual-run-compare')
    computeMovingAverage(SERIES, 3, 'partial')
    expect(getLastDualRunResult()!.match).toBe(true)
  })

  it('fallback on crash', () => {
    setupWasmReady()
    setMovingAverageBridgeMode('fallback-to-current')
    vi.mocked(computeMovingAverageWasm).mockImplementation(() => {
      throw new Error('crash')
    })
    const result = computeMovingAverage(SERIES, 3, 'strict')
    expect(result.length).toBe(5)
  })
})

describe('movingAverage candidate rollback', () => {
  it('rollback resets', () => {
    setMovingAverageBridgeMode('dual-run-compare')
    rollbackToCurrentOnly()
    expect(getMovingAverageBridgeMode()).toBe('current-only')
    expect(getLastDualRunResult()).toBeNull()
  })
})
