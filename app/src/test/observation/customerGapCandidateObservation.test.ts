/**
 * customerGap candidate dual-run compare + rollback テスト
 * @contractId BIZ-013
 * @semanticClass business
 * @authorityKind candidate-authoritative
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { calculateCustomerGap as calculateCustomerGapDirect } from '@/domain/calculations/customerGap'
import * as wasmEngine from '@/application/services/wasmEngine'

vi.mock('@/application/services/customerGapWasm', () => ({
  calculateCustomerGapWasm: vi.fn(),
}))

import {
  calculateCustomerGap,
  setCustomerGapBridgeMode,
  getCustomerGapBridgeMode,
  getLastDualRunResult,
  rollbackToCurrentOnly,
} from '@/application/services/customerGapBridge'
import { calculateCustomerGapWasm } from '@/application/services/customerGapWasm'

const FIXTURES = [
  {
    name: '通常値（全同率）',
    input: {
      curCustomers: 220,
      prevCustomers: 200,
      curQuantity: 550,
      prevQuantity: 500,
      curSales: 110_000,
      prevSales: 100_000,
    },
    expectedNull: false,
  },
  {
    name: '客数GAP あり',
    input: {
      curCustomers: 200,
      prevCustomers: 200,
      curQuantity: 600,
      prevQuantity: 500,
      curSales: 130_000,
      prevSales: 100_000,
    },
    expectedNull: false,
  },
  {
    name: '前期客数ゼロ → null',
    input: {
      curCustomers: 100,
      prevCustomers: 0,
      curQuantity: 100,
      prevQuantity: 100,
      curSales: 10_000,
      prevSales: 10_000,
    },
    expectedNull: true,
  },
  {
    name: '前期点数負値 → null',
    input: {
      curCustomers: 100,
      prevCustomers: 100,
      curQuantity: 100,
      prevQuantity: -1,
      curSales: 10_000,
      prevSales: 10_000,
    },
    expectedNull: true,
  },
  {
    name: '当期ゼロ',
    input: {
      curCustomers: 0,
      prevCustomers: 100,
      curQuantity: 0,
      prevQuantity: 100,
      curSales: 0,
      prevSales: 100_000,
    },
    expectedNull: false,
  },
] as const

function setupWasmMocks(): void {
  vi.mocked(calculateCustomerGapWasm).mockImplementation((input) =>
    calculateCustomerGapDirect(input),
  )
}

function setupWasmReady(): void {
  vi.spyOn(wasmEngine, 'getCustomerGapWasmExports').mockReturnValue({} as never)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
  rollbackToCurrentOnly()
  setupWasmMocks()
})

describe('customerGap candidate dual-run compare', () => {
  describe('dual-run-compare モード', () => {
    it.each(FIXTURES)('$name: current と candidate が一致する', ({ input, expectedNull }) => {
      setupWasmReady()
      setCustomerGapBridgeMode('dual-run-compare')
      const result = calculateCustomerGap(input)
      expect(result === null).toBe(expectedNull)
      const dualRun = getLastDualRunResult()
      expect(dualRun).not.toBeNull()
      expect(dualRun!.match).toBe(true)
    })
  })

  describe('fallback-to-current モード', () => {
    it('WASM 例外時は current にフォールバック', () => {
      setupWasmReady()
      setCustomerGapBridgeMode('fallback-to-current')
      vi.mocked(calculateCustomerGapWasm).mockImplementation(() => {
        throw new Error('WASM crash')
      })
      const result = calculateCustomerGap(FIXTURES[0].input)
      expect(result).not.toBeNull()
    })
  })
})

describe('customerGap candidate rollback', () => {
  it('rollbackToCurrentOnly でモード復帰', () => {
    setCustomerGapBridgeMode('dual-run-compare')
    rollbackToCurrentOnly()
    expect(getCustomerGapBridgeMode()).toBe('current-only')
    expect(getLastDualRunResult()).toBeNull()
  })
})
