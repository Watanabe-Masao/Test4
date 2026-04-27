/**
 * inventoryCalc candidate dual-run compare + rollback テスト
 * @contractId BIZ-009
 * @semanticClass business
 * @authorityKind candidate-authoritative
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { computeEstimatedInventoryDetails as computeTS } from '@/domain/calculations/inventoryCalc'
import type { DailyRecord } from '@/domain/models/record'
import * as wasmEngine from '@/application/services/wasmEngine'

vi.mock('@/application/services/inventoryCalcWasm', () => ({
  computeEstimatedInventoryDetailsWasm: vi.fn(),
  normalizeInventoryCalcInput: vi.fn(),
}))

import {
  computeEstimatedInventoryDetails,
  setInventoryCalcBridgeMode,
  getInventoryCalcBridgeMode,
  getLastDualRunResult,
  rollbackToCurrentOnly,
} from '@/application/services/inventoryCalcBridge'
import { computeEstimatedInventoryDetailsWasm } from '@/application/services/inventoryCalcWasm'

function makeDaily(days: number): ReadonlyMap<number, DailyRecord> {
  const m = new Map<number, DailyRecord>()
  for (let d = 1; d <= days; d++) {
    m.set(d, {
      day: d,
      sales: 1000,
      purchase: { cost: 700, price: 0 },
      interStoreIn: { cost: 50, price: 0 },
      interStoreOut: { cost: 0, price: 0 },
      interDepartmentIn: { cost: 50, price: 0 },
      interDepartmentOut: { cost: 0, price: 0 },
      flowers: { cost: 0, price: 100 },
      directProduce: { cost: 0, price: 50 },
      costInclusion: { cost: 10 },
      discountAmount: 0,
      discountEntries: [],
      supplierBreakdown: new Map(),
      coreSales: 850,
      grossSales: 850,
      totalCost: 800,
      deliverySales: { cost: 0, price: 150 },
      discountAbsolute: 0,
    } as unknown as DailyRecord)
  }
  return m
}

function setupWasmMocks(): void {
  vi.mocked(computeEstimatedInventoryDetailsWasm).mockImplementation(
    (daily, days, opening, closing, markup, discount) =>
      computeTS(daily, days, opening, closing, markup, discount),
  )
}

function setupWasmReady(): void {
  vi.spyOn(wasmEngine, 'getInventoryCalcWasmExports').mockReturnValue({} as never)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
  setInventoryCalcBridgeMode('current-only')
  setupWasmMocks()
})

describe('inventoryCalc candidate dual-run compare', () => {
  it('dual-run match with closing', () => {
    setupWasmReady()
    setInventoryCalcBridgeMode('dual-run-compare')
    computeEstimatedInventoryDetails(makeDaily(10), 10, 50000, 48000, 0.3, 0.05)
    const dualRun = getLastDualRunResult()
    expect(dualRun).not.toBeNull()
    expect(dualRun!.match).toBe(true)
  })

  it('dual-run match without closing', () => {
    setupWasmReady()
    setInventoryCalcBridgeMode('dual-run-compare')
    computeEstimatedInventoryDetails(makeDaily(10), 10, 50000, null, 0.3, 0.05)
    const dualRun = getLastDualRunResult()
    expect(dualRun!.match).toBe(true)
  })

  it('fallback on WASM crash', () => {
    setupWasmReady()
    setInventoryCalcBridgeMode('fallback-to-current')
    vi.mocked(computeEstimatedInventoryDetailsWasm).mockImplementation(() => {
      throw new Error('crash')
    })
    const result = computeEstimatedInventoryDetails(makeDaily(5), 5, 10000, null, 0.3, 0.05)
    expect(result.length).toBe(5)
  })
})

describe('inventoryCalc candidate rollback', () => {
  it('rollback resets mode and result', () => {
    setInventoryCalcBridgeMode('dual-run-compare')
    rollbackToCurrentOnly()
    expect(getInventoryCalcBridgeMode()).toBe('current-only')
    expect(getLastDualRunResult()).toBeNull()
  })
})
