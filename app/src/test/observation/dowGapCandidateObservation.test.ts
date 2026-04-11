/**
 * dowGapAnalysis candidate dual-run compare + rollback テスト
 * @contractId ANA-007
 * @semanticClass analytic
 * @authorityKind candidate-authoritative
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { analyzeDowGap as analyzeTS } from '@/domain/calculations/dowGapAnalysis'
import * as wasmEngine from '@/application/services/wasmEngine'

vi.mock('@/application/services/dowGapWasm', () => ({
  analyzeDowGapWasm: vi.fn(),
}))

import {
  analyzeDowGap,
  setDowGapBridgeMode,
  getDowGapBridgeMode,
  getLastDualRunResult,
  rollbackToCurrentOnly,
} from '@/application/services/dowGapBridge'
import { analyzeDowGapWasm } from '@/application/services/dowGapWasm'

function setupWasmMocks(): void {
  vi.mocked(analyzeDowGapWasm).mockImplementation((cy, cm, py, pm, avg, prevSales, dailyData) =>
    analyzeTS(cy, cm, py, pm, avg, prevSales, dailyData),
  )
}

function setupWasmReady(): void {
  vi.spyOn(wasmEngine, 'getDowGapWasmExports').mockReturnValue({} as never)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
  setDowGapBridgeMode('current-only')
  setupWasmMocks()
})

describe('dowGapAnalysis candidate dual-run compare', () => {
  it('dual-run match', () => {
    setupWasmReady()
    setDowGapBridgeMode('dual-run-compare')
    analyzeDowGap(
      2025,
      3,
      2024,
      3,
      100_000,
      [700_000, 600_000, 650_000, 680_000, 700_000, 750_000, 500_000],
    )
    const dualRun = getLastDualRunResult()
    expect(dualRun).not.toBeNull()
    expect(dualRun!.match).toBe(true)
  })

  it('fallback on crash', () => {
    setupWasmReady()
    setDowGapBridgeMode('fallback-to-current')
    vi.mocked(analyzeDowGapWasm).mockImplementation(() => {
      throw new Error('crash')
    })
    const result = analyzeDowGap(2025, 3, 2024, 3, 100_000)
    expect(result.dowCounts.length).toBe(7)
  })
})

describe('dowGapAnalysis candidate rollback', () => {
  it('rollback resets', () => {
    setDowGapBridgeMode('dual-run-compare')
    rollbackToCurrentOnly()
    expect(getDowGapBridgeMode()).toBe('current-only')
    expect(getLastDualRunResult()).toBeNull()
  })
})
