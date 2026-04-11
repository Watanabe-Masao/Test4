/**
 * piValue candidate dual-run compare + rollback テスト
 *
 * candidate WASM 実装と current TS 実装の parity を検証する。
 * Bridge の 4 モード切替と rollback を確認する。
 *
 * @contractId BIZ-012
 * @semanticClass business
 * @authorityKind candidate-authoritative
 *
 * @see references/03-guides/tier1-business-migration-plan.md — Step 6, 7
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  calculateQuantityPI as calculateQuantityPIDirect,
  calculateAmountPI as calculateAmountPIDirect,
  calculatePIValues as calculatePIValuesDirect,
} from '@/domain/calculations/piValue'
import * as wasmEngine from '@/application/services/wasmEngine'

/* ── WASM mock: TS passthrough（candidate WASM を TS で模擬） ── */

vi.mock('@/application/services/piValueWasm', () => ({
  calculateQuantityPIWasm: vi.fn(),
  calculateAmountPIWasm: vi.fn(),
  calculatePIValuesWasm: vi.fn(),
}))

import {
  calculateQuantityPI,
  calculateAmountPI,
  calculatePIValues,
  setPiValueBridgeMode,
  getPiValueBridgeMode,
  getLastDualRunResult,
  rollbackToCurrentOnly,
} from '@/application/services/piValueBridge'
import {
  calculateQuantityPIWasm,
  calculateAmountPIWasm,
  calculatePIValuesWasm,
} from '@/application/services/piValueWasm'

/* ── テストフィクスチャ ── */

const FIXTURES = [
  {
    name: '通常値',
    input: { totalQuantity: 100, totalSales: 50_000, customers: 200 },
    expected: { quantityPI: 500, amountPI: 250_000 },
  },
  {
    name: '客数ゼロ',
    input: { totalQuantity: 100, totalSales: 50_000, customers: 0 },
    expected: { quantityPI: 0, amountPI: 0 },
  },
  {
    name: '売上・点数ゼロ',
    input: { totalQuantity: 0, totalSales: 0, customers: 100 },
    expected: { quantityPI: 0, amountPI: 0 },
  },
  {
    name: '全ゼロ',
    input: { totalQuantity: 0, totalSales: 0, customers: 0 },
    expected: { quantityPI: 0, amountPI: 0 },
  },
  {
    name: '大規模店舗',
    input: { totalQuantity: 10_000, totalSales: 15_000_000, customers: 5_000 },
    expected: { quantityPI: 2_000, amountPI: 3_000_000 },
  },
  {
    name: '端数あり',
    input: { totalQuantity: 1, totalSales: 1, customers: 3 },
    expected: {
      quantityPI: (1 / 3) * 1000,
      amountPI: (1 / 3) * 1000,
    },
  },
] as const

/* ── Mock setup ── */

function setupWasmMocks(): void {
  vi.mocked(calculateQuantityPIWasm).mockImplementation((totalQuantity, customers) =>
    calculateQuantityPIDirect(totalQuantity, customers),
  )
  vi.mocked(calculateAmountPIWasm).mockImplementation((totalSales, customers) =>
    calculateAmountPIDirect(totalSales, customers),
  )
  vi.mocked(calculatePIValuesWasm).mockImplementation((input) => calculatePIValuesDirect(input))
}

function setupWasmReady(): void {
  vi.spyOn(wasmEngine, 'getPiValueWasmExports').mockReturnValue({} as never)
}

function setupWasmNotReady(): void {
  vi.spyOn(wasmEngine, 'getPiValueWasmExports').mockReturnValue(null)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
  setPiValueBridgeMode('current-only')
  setupWasmMocks()
})

/* ── Step 6: Dual-run compare テスト ── */

describe('piValue candidate dual-run compare', () => {
  describe('current-only モード（デフォルト）', () => {
    it.each(FIXTURES)('$name: TS 実装のみ使用', ({ input, expected }) => {
      setupWasmReady()
      setPiValueBridgeMode('current-only')

      const result = calculatePIValues(input)
      expect(result.quantityPI).toBe(expected.quantityPI)
      expect(result.amountPI).toBe(expected.amountPI)
      expect(calculatePIValuesWasm).not.toHaveBeenCalled()
    })
  })

  describe('candidate-only モード', () => {
    it.each(FIXTURES)('$name: WASM 実装のみ使用', ({ input, expected }) => {
      setupWasmReady()
      setPiValueBridgeMode('candidate-only')

      const result = calculatePIValues(input)
      expect(result.quantityPI).toBe(expected.quantityPI)
      expect(result.amountPI).toBe(expected.amountPI)
      expect(calculatePIValuesWasm).toHaveBeenCalledOnce()
    })
  })

  describe('dual-run-compare モード', () => {
    it.each(FIXTURES)('$name: current と candidate が一致する', ({ input, expected }) => {
      setupWasmReady()
      setPiValueBridgeMode('dual-run-compare')

      const result = calculatePIValues(input)
      expect(result.quantityPI).toBe(expected.quantityPI)
      expect(result.amountPI).toBe(expected.amountPI)

      // dual-run 結果が保存されている
      const dualRun = getLastDualRunResult()
      expect(dualRun).not.toBeNull()
      expect(dualRun!.match).toBe(true)
      expect(dualRun!.current).toEqual(dualRun!.candidate)
    })

    it('current の値が返される（candidate が primary ではない）', () => {
      setupWasmReady()
      setPiValueBridgeMode('dual-run-compare')

      // WASM mock に意図的に異なる値を返させる
      vi.mocked(calculatePIValuesWasm).mockReturnValue({ quantityPI: 999, amountPI: 999 })

      const result = calculatePIValues({ totalQuantity: 100, totalSales: 50_000, customers: 200 })
      // current (TS) の値が返される
      expect(result.quantityPI).toBe(500)
      expect(result.amountPI).toBe(250_000)

      // 不一致が記録される
      const dualRun = getLastDualRunResult()
      expect(dualRun!.match).toBe(false)
    })

    it('WASM 未 ready の場合は current のみ実行', () => {
      setupWasmNotReady()
      setPiValueBridgeMode('dual-run-compare')

      const result = calculatePIValues({ totalQuantity: 100, totalSales: 50_000, customers: 200 })
      expect(result.quantityPI).toBe(500)
      expect(calculatePIValuesWasm).not.toHaveBeenCalled()
    })

    it('個別関数でも dual-run が動作する', () => {
      setupWasmReady()
      setPiValueBridgeMode('dual-run-compare')

      const qty = calculateQuantityPI(100, 200)
      expect(qty).toBe(500)
      expect(calculateQuantityPIWasm).toHaveBeenCalledOnce()

      const amt = calculateAmountPI(50_000, 200)
      expect(amt).toBe(250_000)
      expect(calculateAmountPIWasm).toHaveBeenCalledOnce()
    })
  })

  describe('fallback-to-current モード', () => {
    it('WASM ready 時は candidate を使用', () => {
      setupWasmReady()
      setPiValueBridgeMode('fallback-to-current')

      const result = calculatePIValues({ totalQuantity: 100, totalSales: 50_000, customers: 200 })
      expect(result.quantityPI).toBe(500)
      expect(calculatePIValuesWasm).toHaveBeenCalledOnce()
    })

    it('WASM 未 ready 時は current にフォールバック', () => {
      setupWasmNotReady()
      setPiValueBridgeMode('fallback-to-current')

      const result = calculatePIValues({ totalQuantity: 100, totalSales: 50_000, customers: 200 })
      expect(result.quantityPI).toBe(500)
      expect(calculatePIValuesWasm).not.toHaveBeenCalled()
    })

    it('WASM 例外時は current にフォールバック', () => {
      setupWasmReady()
      setPiValueBridgeMode('fallback-to-current')
      vi.mocked(calculatePIValuesWasm).mockImplementation(() => {
        throw new Error('WASM crash')
      })

      const result = calculatePIValues({ totalQuantity: 100, totalSales: 50_000, customers: 200 })
      expect(result.quantityPI).toBe(500)
      expect(result.amountPI).toBe(250_000)
    })
  })
})

/* ── Step 7: Rollback テスト ── */

describe('piValue candidate rollback', () => {
  it('rollbackToCurrentOnly でモードが current-only に戻る', () => {
    setPiValueBridgeMode('dual-run-compare')
    expect(getPiValueBridgeMode()).toBe('dual-run-compare')

    rollbackToCurrentOnly()
    expect(getPiValueBridgeMode()).toBe('current-only')
  })

  it('rollback 後は dual-run 結果がクリアされる', () => {
    setupWasmReady()
    setPiValueBridgeMode('dual-run-compare')
    calculatePIValues({ totalQuantity: 100, totalSales: 50_000, customers: 200 })
    expect(getLastDualRunResult()).not.toBeNull()

    rollbackToCurrentOnly()
    expect(getLastDualRunResult()).toBeNull()
  })

  it('rollback 後は TS 実装のみ使用される', () => {
    setupWasmReady()
    setPiValueBridgeMode('candidate-only')

    // candidate モードで WASM 使用
    calculatePIValues({ totalQuantity: 100, totalSales: 50_000, customers: 200 })
    expect(calculatePIValuesWasm).toHaveBeenCalledOnce()

    // rollback
    rollbackToCurrentOnly()
    vi.clearAllMocks()
    setupWasmMocks()

    // current-only に戻った
    calculatePIValues({ totalQuantity: 100, totalSales: 50_000, customers: 200 })
    expect(calculatePIValuesWasm).not.toHaveBeenCalled()
  })

  it('全モードから rollback 可能', () => {
    for (const mode of ['candidate-only', 'dual-run-compare', 'fallback-to-current'] as const) {
      setPiValueBridgeMode(mode)
      expect(getPiValueBridgeMode()).toBe(mode)
      rollbackToCurrentOnly()
      expect(getPiValueBridgeMode()).toBe('current-only')
    }
  })
})
