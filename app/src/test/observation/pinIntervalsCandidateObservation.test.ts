/**
 * pinIntervals candidate dual-run compare + rollback テスト
 * @contractId BIZ-011
 * @semanticClass business
 * @authorityKind candidate-authoritative
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { calculatePinIntervals as calculateTS } from '@/domain/calculations/pinIntervals'
import type { DailyRecord } from '@/domain/models/record'
import * as wasmEngine from '@/application/services/wasmEngine'

vi.mock('@/application/services/pinIntervalsWasm', () => ({
  calculatePinIntervalsWasm: vi.fn(),
  normalizePinIntervalsInput: vi.fn(),
  normalizePins: vi.fn(),
}))

import {
  calculatePinIntervals,
  setPinIntervalsBridgeMode,
  getPinIntervalsBridgeMode,
  getLastDualRunResult,
  rollbackToCurrentOnly,
} from '@/application/services/pinIntervalsBridge'
import { calculatePinIntervalsWasm } from '@/application/services/pinIntervalsWasm'

function makeDaily(
  salesPerDay: number,
  costPerDay: number,
  days: number,
): ReadonlyMap<number, DailyRecord> {
  const m = new Map<number, DailyRecord>()
  for (let d = 1; d <= days; d++) {
    m.set(d, {
      day: d,
      sales: salesPerDay,
      purchase: { cost: costPerDay, price: 0 },
      interStoreIn: { cost: 0, price: 0 },
      interStoreOut: { cost: 0, price: 0 },
      interDepartmentIn: { cost: 0, price: 0 },
      interDepartmentOut: { cost: 0, price: 0 },
      flowers: { cost: 0, price: 0 },
      directProduce: { cost: 0, price: 0 },
      costInclusion: { cost: 0 },
      discountAmount: 0,
      discountEntries: [],
      supplierBreakdown: new Map(),
      coreSales: salesPerDay,
      grossSales: salesPerDay,
      totalCost: costPerDay,
      deliverySales: { cost: 0, price: 0 },
      discountAbsolute: 0,
    } as unknown as DailyRecord)
  }
  return m
}

const FIXTURES = [
  {
    name: '単一区間',
    daily: makeDaily(1000, 700, 30),
    opening: 50000 as number | null,
    pins: [[30, 62000]] as [number, number][],
  },
  {
    name: '2区間',
    daily: makeDaily(1000, 700, 30),
    opening: 50000 as number | null,
    pins: [
      [15, 55000],
      [30, 62000],
    ] as [number, number][],
  },
  {
    name: 'opening null',
    daily: makeDaily(100, 80, 10),
    opening: null,
    pins: [[10, 500]] as [number, number][],
  },
] as const

function setupWasmMocks(): void {
  vi.mocked(calculatePinIntervalsWasm).mockImplementation((daily, opening, pins) =>
    calculateTS(daily, opening, pins),
  )
}

function setupWasmReady(): void {
  vi.spyOn(wasmEngine, 'getPinIntervalsWasmExports').mockReturnValue({} as never)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
  setPinIntervalsBridgeMode('current-only')
  setupWasmMocks()
})

describe('pinIntervals candidate dual-run compare', () => {
  it.each(FIXTURES)('$name: dual-run match', ({ daily, opening, pins }) => {
    setupWasmReady()
    setPinIntervalsBridgeMode('dual-run-compare')
    calculatePinIntervals(daily, opening, pins)
    const dualRun = getLastDualRunResult()
    expect(dualRun).not.toBeNull()
    expect(dualRun!.match).toBe(true)
  })

  it('fallback on WASM crash', () => {
    setupWasmReady()
    setPinIntervalsBridgeMode('fallback-to-current')
    vi.mocked(calculatePinIntervalsWasm).mockImplementation(() => {
      throw new Error('crash')
    })
    const result = calculatePinIntervals(FIXTURES[0].daily, 50000, [[30, 62000]])
    expect(result.length).toBe(1)
  })
})

describe('pinIntervals candidate rollback', () => {
  it('rollback resets mode and result', () => {
    setPinIntervalsBridgeMode('dual-run-compare')
    rollbackToCurrentOnly()
    expect(getPinIntervalsBridgeMode()).toBe('current-only')
    expect(getLastDualRunResult()).toBeNull()
  })
})
