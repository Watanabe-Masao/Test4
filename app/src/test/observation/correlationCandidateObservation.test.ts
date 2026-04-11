/**
 * correlation candidate dual-run compare + rollback テスト
 * @contractId ANA-005
 * @semanticClass analytic
 * @authorityKind candidate-authoritative
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { pearsonCorrelation as pearsonTS } from '@/domain/calculations/algorithms/correlation'
import * as wasmEngine from '@/application/services/wasmEngine'

vi.mock('@/application/services/correlationWasm', () => ({
  pearsonCorrelationWasm: vi.fn(),
  cosineSimilarityWasm: vi.fn(),
  normalizeMinMaxWasm: vi.fn(),
  detectDivergenceWasm: vi.fn(),
  movingAverageWasm: vi.fn(),
  calculateZScoresWasm: vi.fn(),
}))

import {
  pearsonCorrelation,
  setCorrelationBridgeMode,
  getCorrelationBridgeMode,
  getLastDualRunResult,
  rollbackToCurrentOnly,
} from '@/application/services/correlationBridge'
import { pearsonCorrelationWasm } from '@/application/services/correlationWasm'

function setupWasmMocks(): void {
  vi.mocked(pearsonCorrelationWasm).mockImplementation((xs, ys) => pearsonTS(xs, ys))
}

function setupWasmReady(): void {
  vi.spyOn(wasmEngine, 'getCorrelationWasmExports').mockReturnValue({} as never)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
  setCorrelationBridgeMode('current-only')
  setupWasmMocks()
})

describe('correlation candidate dual-run compare', () => {
  it('dual-run match: perfect positive correlation', () => {
    setupWasmReady()
    setCorrelationBridgeMode('dual-run-compare')
    pearsonCorrelation([1, 2, 3, 4, 5], [2, 4, 6, 8, 10])
    const dualRun = getLastDualRunResult()
    expect(dualRun).not.toBeNull()
    expect(dualRun!.match).toBe(true)
  })

  it('fallback on WASM crash', () => {
    setupWasmReady()
    setCorrelationBridgeMode('fallback-to-current')
    vi.mocked(pearsonCorrelationWasm).mockImplementation(() => {
      throw new Error('crash')
    })
    const result = pearsonCorrelation([1, 2, 3], [4, 5, 6])
    expect(result.r).toBeDefined()
    expect(result.n).toBe(3)
  })
})

describe('correlation candidate rollback', () => {
  it('rollback resets mode and result', () => {
    setCorrelationBridgeMode('dual-run-compare')
    rollbackToCurrentOnly()
    expect(getCorrelationBridgeMode()).toBe('current-only')
    expect(getLastDualRunResult()).toBeNull()
  })
})
