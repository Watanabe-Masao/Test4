/**
 * sensitivity candidate dual-run compare + rollback テスト
 * @contractId ANA-003
 * @semanticClass analytic
 * @authorityKind candidate-authoritative
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { calculateSensitivity as calculateTS } from '@/domain/calculations/algorithms/sensitivity'
import * as wasmEngine from '@/application/services/wasmEngine'

vi.mock('@/application/services/sensitivityWasm', () => ({
  calculateSensitivityWasm: vi.fn(),
  calculateElasticityWasm: vi.fn(),
}))

import {
  calculateSensitivity,
  setSensitivityBridgeMode,
  getSensitivityBridgeMode,
  getLastDualRunResult,
  rollbackToCurrentOnly,
} from '@/application/services/sensitivityBridge'
import { calculateSensitivityWasm } from '@/application/services/sensitivityWasm'

const BASE = {
  totalSales: 1_000_000,
  totalCost: 600_000,
  totalDiscount: 50_000,
  grossSales: 1_050_000,
  totalCustomers: 5_000,
  totalCostInclusion: 20_000,
  averageMarkupRate: 0.3,
  budget: 1_200_000,
  elapsedDays: 15,
  salesDays: 30,
}

const ZERO_DELTAS = {
  discountRateDelta: 0,
  customersDelta: 0,
  transactionValueDelta: 0,
  costRateDelta: 0,
}

function setupWasmMocks(): void {
  vi.mocked(calculateSensitivityWasm).mockImplementation((base, deltas) =>
    calculateTS(base, deltas),
  )
}

function setupWasmReady(): void {
  vi.spyOn(wasmEngine, 'getSensitivityWasmExports').mockReturnValue({} as never)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
  setSensitivityBridgeMode('current-only')
  setupWasmMocks()
})

describe('sensitivity candidate dual-run compare', () => {
  it('dual-run match with zero deltas', () => {
    setupWasmReady()
    setSensitivityBridgeMode('dual-run-compare')
    calculateSensitivity(BASE, ZERO_DELTAS)
    const dualRun = getLastDualRunResult()
    expect(dualRun).not.toBeNull()
    expect(dualRun!.match).toBe(true)
  })

  it('dual-run match with mixed deltas', () => {
    setupWasmReady()
    setSensitivityBridgeMode('dual-run-compare')
    calculateSensitivity(BASE, {
      discountRateDelta: -0.01,
      customersDelta: 0.05,
      transactionValueDelta: 0.02,
      costRateDelta: -0.01,
    })
    expect(getLastDualRunResult()!.match).toBe(true)
  })

  it('fallback on WASM crash', () => {
    setupWasmReady()
    setSensitivityBridgeMode('fallback-to-current')
    vi.mocked(calculateSensitivityWasm).mockImplementation(() => {
      throw new Error('crash')
    })
    const result = calculateSensitivity(BASE, ZERO_DELTAS)
    expect(result.baseGrossProfit).toBe(380_000)
  })
})

describe('sensitivity candidate rollback', () => {
  it('rollback resets mode and result', () => {
    setSensitivityBridgeMode('dual-run-compare')
    rollbackToCurrentOnly()
    expect(getSensitivityBridgeMode()).toBe('current-only')
    expect(getLastDualRunResult()).toBeNull()
  })
})
