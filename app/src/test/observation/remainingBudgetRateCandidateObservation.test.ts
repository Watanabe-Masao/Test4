/**
 * remainingBudgetRate candidate dual-run compare + rollback テスト
 * @contractId BIZ-008
 * @semanticClass business
 * @authorityKind candidate-authoritative
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { calculateRemainingBudgetRate as calculateDirect } from '@/domain/calculations/remainingBudgetRate'
import * as wasmEngine from '@/application/services/wasmEngine'

vi.mock('@/application/services/remainingBudgetRateWasm', () => ({
  calculateRemainingBudgetRateWasm: vi.fn(),
}))

import {
  calculateRemainingBudgetRate,
  setRemainingBudgetRateBridgeMode,
  getRemainingBudgetRateBridgeMode,
  getLastDualRunResult,
  rollbackToCurrentOnly,
} from '@/application/services/remainingBudgetRateBridge'
import { calculateRemainingBudgetRateWasm } from '@/application/services/remainingBudgetRateWasm'

function makeDaily(perDay: number, days: number): ReadonlyMap<number, number> {
  const m = new Map<number, number>()
  for (let d = 1; d <= days; d++) m.set(d, perDay)
  return m
}

const FIXTURES = [
  {
    name: '計画通り',
    input: {
      budget: 300,
      totalSales: 100,
      budgetDaily: makeDaily(10, 30),
      elapsedDays: 10,
      daysInMonth: 30,
    },
    expected: 100,
  },
  {
    name: '巻き返し必要',
    input: {
      budget: 300,
      totalSales: 50,
      budgetDaily: makeDaily(10, 30),
      elapsedDays: 10,
      daysInMonth: 30,
    },
    expected: 125,
  },
  {
    name: '全日経過',
    input: {
      budget: 300,
      totalSales: 200,
      budgetDaily: makeDaily(10, 30),
      elapsedDays: 30,
      daysInMonth: 30,
    },
    expected: 0,
  },
] as const

function setupWasmMocks(): void {
  vi.mocked(calculateRemainingBudgetRateWasm).mockImplementation((input) => calculateDirect(input))
}

function setupWasmReady(): void {
  vi.spyOn(wasmEngine, 'getRemainingBudgetRateWasmExports').mockReturnValue({} as never)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
  setRemainingBudgetRateBridgeMode('current-only')
  setupWasmMocks()
})

describe('remainingBudgetRate candidate dual-run compare', () => {
  it.each(FIXTURES)('$name: dual-run match', ({ input, expected }) => {
    setupWasmReady()
    setRemainingBudgetRateBridgeMode('dual-run-compare')
    const result = calculateRemainingBudgetRate(input)
    expect(result).toBe(expected)
    expect(getLastDualRunResult()!.match).toBe(true)
  })

  it('fallback on WASM crash', () => {
    setupWasmReady()
    setRemainingBudgetRateBridgeMode('fallback-to-current')
    vi.mocked(calculateRemainingBudgetRateWasm).mockImplementation(() => {
      throw new Error('crash')
    })
    const result = calculateRemainingBudgetRate(FIXTURES[0].input)
    expect(result).toBe(100)
  })
})

describe('remainingBudgetRate candidate rollback', () => {
  it('rollback resets mode and result', () => {
    setRemainingBudgetRateBridgeMode('dual-run-compare')
    rollbackToCurrentOnly()
    expect(getRemainingBudgetRateBridgeMode()).toBe('current-only')
    expect(getLastDualRunResult()).toBeNull()
  })
})
