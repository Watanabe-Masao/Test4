/**
 * grossProfit Bridge テスト
 *
 * 検証項目:
 * 1. ts-only モード: TS 実装が正しく呼ばれる（8 関数）
 * 2. wasm-only + WASM 未初期化: TS フォールバック
 * 3. wasm-only + state=loading/error: TS フォールバック
 * 4. dual-run-compare + WASM 未初期化: TS フォールバック（compare なし）
 * 5. dual-run-compare + WASM ready + 不一致: console.warn + GrossProfitMismatchLog shape
 * 6. dual-run-compare + WASM ready + 一致: console.warn なし
 * 7. null mismatch 検出: calculateInvMethod の null inventory
 * 8. GP invariants: bridge 経由でも成立
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  calculateInvMethod as calculateInvMethodDirect,
  calculateEstMethod as calculateEstMethodDirect,
  calculateCoreSales as calculateCoreSalesDirect,
  calculateDiscountRate as calculateDiscountRateDirect,
  calculateDiscountImpact as calculateDiscountImpactDirect,
  calculateMarkupRates as calculateMarkupRatesDirect,
  calculateTransferTotals as calculateTransferTotalsDirect,
  calculateInventoryCost as calculateInventoryCostDirect,
} from '@/domain/calculations/grossProfit'
import type {
  InvMethodInput,
  EstMethodInput,
  DiscountImpactInput,
  MarkupRateInput,
  TransferTotalsInput,
} from '@/domain/calculations/grossProfit'
import { setExecutionMode } from '../wasmEngine'
import * as wasmEngine from '../wasmEngine'

/**
 * WASM wrapper をモック。
 * dual-run compare テストで使用する。意図的にずれた値を返す。
 */
vi.mock('../grossProfitWasm', () => ({
  calculateInvMethodWasm: vi.fn(() => ({
    cogs: 99999,
    grossProfit: 99999,
    grossProfitRate: 0.99999,
  })),
  calculateEstMethodWasm: vi.fn(() => ({
    grossSales: 99999,
    cogs: 99999,
    margin: 99999,
    marginRate: 0.99999,
    closingInventory: 99999,
  })),
  calculateCoreSalesWasm: vi.fn(() => ({
    coreSales: 99999,
    isOverDelivery: false,
    overDeliveryAmount: 0,
  })),
  calculateDiscountRateWasm: vi.fn(() => 0.99999),
  calculateDiscountImpactWasm: vi.fn(() => ({
    discountLossCost: 99999,
  })),
  calculateMarkupRatesWasm: vi.fn(() => ({
    averageMarkupRate: 0.99999,
    coreMarkupRate: 0.99999,
  })),
  calculateTransferTotalsWasm: vi.fn(() => ({
    transferPrice: 99999,
    transferCost: 99999,
  })),
  calculateInventoryCostWasm: vi.fn(() => 99999),
}))

import {
  calculateInvMethod,
  calculateEstMethod,
  calculateCoreSales,
  calculateDiscountRate,
  calculateDiscountImpact,
  calculateMarkupRates,
  calculateTransferTotals,
  calculateInventoryCost,
} from '../grossProfitBridge'
import {
  calculateInvMethodWasm,
  calculateEstMethodWasm,
  calculateCoreSalesWasm,
  calculateDiscountRateWasm,
  calculateMarkupRatesWasm,
  calculateInventoryCostWasm,
} from '../grossProfitWasm'

/* ── テストヘルパー ─────────────────────────────── */

function makeInvInput(overrides?: Partial<InvMethodInput>): InvMethodInput {
  return {
    openingInventory: 1_000_000,
    closingInventory: 800_000,
    totalPurchaseCost: 500_000,
    totalSales: 900_000,
    ...overrides,
  }
}

function makeEstInput(overrides?: Partial<EstMethodInput>): EstMethodInput {
  return {
    coreSales: 500_000,
    discountRate: 0.05,
    markupRate: 0.3,
    costInclusionCost: 10_000,
    openingInventory: 1_000_000,
    inventoryPurchaseCost: 300_000,
    ...overrides,
  }
}

function makeDiscountInput(overrides?: Partial<DiscountImpactInput>): DiscountImpactInput {
  return {
    coreSales: 500_000,
    markupRate: 0.3,
    discountRate: 0.05,
    ...overrides,
  }
}

function makeMarkupInput(overrides?: Partial<MarkupRateInput>): MarkupRateInput {
  return {
    purchasePrice: 100_000,
    purchaseCost: 70_000,
    deliveryPrice: 20_000,
    deliveryCost: 15_000,
    transferPrice: 10_000,
    transferCost: 8_000,
    defaultMarkupRate: 0.25,
    ...overrides,
  }
}

function makeTransferInput(overrides?: Partial<TransferTotalsInput>): TransferTotalsInput {
  return {
    interStoreInPrice: 10_000,
    interStoreInCost: 7_000,
    interStoreOutPrice: 5_000,
    interStoreOutCost: 3_500,
    interDepartmentInPrice: 8_000,
    interDepartmentInCost: 6_000,
    interDepartmentOutPrice: 4_000,
    interDepartmentOutCost: 3_000,
    ...overrides,
  }
}

beforeEach(() => {
  setExecutionMode('ts-only')
  vi.restoreAllMocks()
})

/* ── 1. ts-only モード ─────────────────────────── */

describe('bridge ts-only mode: bridge と直接呼び出しの結果一致', () => {
  it('calculateInvMethod', () => {
    const input = makeInvInput()
    const bridge = calculateInvMethod(input)
    const direct = calculateInvMethodDirect(input)
    expect(bridge).toEqual(direct)
  })

  it('calculateEstMethod', () => {
    const input = makeEstInput()
    const bridge = calculateEstMethod(input)
    const direct = calculateEstMethodDirect(input)
    expect(bridge).toEqual(direct)
  })

  it('calculateCoreSales', () => {
    const bridge = calculateCoreSales(900_000, 50_000, 40_000)
    const direct = calculateCoreSalesDirect(900_000, 50_000, 40_000)
    expect(bridge).toEqual(direct)
  })

  it('calculateDiscountRate', () => {
    const bridge = calculateDiscountRate(25_000, 500_000)
    const direct = calculateDiscountRateDirect(25_000, 500_000)
    expect(bridge).toBe(direct)
  })

  it('calculateDiscountImpact', () => {
    const input = makeDiscountInput()
    const bridge = calculateDiscountImpact(input)
    const direct = calculateDiscountImpactDirect(input)
    // bridge は CalculationResult<DiscountImpactResult> を返す
    expect(bridge.value).toEqual(direct)
  })

  it('calculateMarkupRates', () => {
    const input = makeMarkupInput()
    const bridge = calculateMarkupRates(input)
    const direct = calculateMarkupRatesDirect(input)
    expect(bridge).toEqual(direct)
  })

  it('calculateTransferTotals', () => {
    const input = makeTransferInput()
    const bridge = calculateTransferTotals(input)
    const direct = calculateTransferTotalsDirect(input)
    expect(bridge).toEqual(direct)
  })

  it('calculateInventoryCost', () => {
    const bridge = calculateInventoryCost(500_000, 40_000)
    const direct = calculateInventoryCostDirect(500_000, 40_000)
    expect(bridge).toBe(direct)
  })
})

/* ── 2. wasm-only + WASM 未初期化 (idle) ──────── */

describe('bridge wasm-only mode: WASM 未初期化時は TS フォールバック', () => {
  it('calculateInvMethod falls back to TS', () => {
    setExecutionMode('wasm-only')
    const input = makeInvInput()
    const bridge = calculateInvMethod(input)
    const direct = calculateInvMethodDirect(input)
    expect(bridge).toEqual(direct)
  })

  it('calculateEstMethod falls back to TS', () => {
    setExecutionMode('wasm-only')
    const input = makeEstInput()
    const bridge = calculateEstMethod(input)
    const direct = calculateEstMethodDirect(input)
    expect(bridge).toEqual(direct)
  })

  it('calculateDiscountRate falls back to TS', () => {
    setExecutionMode('wasm-only')
    const bridge = calculateDiscountRate(25_000, 500_000)
    const direct = calculateDiscountRateDirect(25_000, 500_000)
    expect(bridge).toBe(direct)
  })
})

/* ── 3. wasm-only + state=loading/error ────────── */

describe('wasm-only + state=loading/error: TS フォールバック', () => {
  it('loading 中は TS にフォールバック', () => {
    setExecutionMode('wasm-only')
    vi.spyOn(wasmEngine, 'getWasmModuleState').mockReturnValue('loading')
    const input = makeInvInput()
    const bridge = calculateInvMethod(input)
    const direct = calculateInvMethodDirect(input)
    expect(bridge).toEqual(direct)
  })

  it('error 状態でも TS にフォールバック', () => {
    setExecutionMode('wasm-only')
    vi.spyOn(wasmEngine, 'getWasmModuleState').mockReturnValue('error')
    const bridge = calculateInventoryCost(500_000, 40_000)
    const direct = calculateInventoryCostDirect(500_000, 40_000)
    expect(bridge).toBe(direct)
  })
})

/* ── 4. dual-run-compare + WASM 未初期化 ─────── */

describe('dual-run-compare + WASM idle: TS フォールバック（compare なし）', () => {
  it('WASM 未初期化時は TS 結果のみ、compare は発生しない', () => {
    setExecutionMode('dual-run-compare')
    const spy = vi.spyOn(console, 'warn')
    const input = makeInvInput()
    const bridge = calculateInvMethod(input)
    const direct = calculateInvMethodDirect(input)
    expect(bridge).toEqual(direct)
    expect(spy).not.toHaveBeenCalled()
  })
})

/* ── 5. GrossProfitMismatchLog shape ─────────── */

describe('GrossProfitMismatchLog shape（モック WASM で差分検出）', () => {
  beforeEach(() => {
    setExecutionMode('dual-run-compare')
    vi.spyOn(wasmEngine, 'getWasmModuleState').mockReturnValue('ready')
    vi.spyOn(wasmEngine, 'getGrossProfitWasmExports').mockReturnValue(
      {} as ReturnType<typeof wasmEngine.getGrossProfitWasmExports>,
    )
  })

  it('calculateInvMethod: 不一致時に console.warn + 正しい log shape', () => {
    const spy = vi.spyOn(console, 'warn')
    const input = makeInvInput()
    const result = calculateInvMethod(input)
    const direct = calculateInvMethodDirect(input)

    // TS 結果を返すこと（authoritative は TS）
    expect(result).toEqual(direct)

    // mismatch log が出力されること
    expect(spy).toHaveBeenCalledTimes(1)
    const [label, log] = spy.mock.calls[0]
    expect(label).toBe('[grossProfit dual-run mismatch]')
    expect(log).toMatchObject({
      function: 'calculateInvMethod',
      wasmState: 'ready',
      executionMode: 'dual-run-compare',
    })
    expect(typeof log.maxAbsDiff).toBe('number')
    expect(log.maxAbsDiff).toBeGreaterThan(0)
    expect(log.diffs).toBeDefined()
  })

  it('calculateEstMethod: 不一致時に mismatch log', () => {
    const spy = vi.spyOn(console, 'warn')
    const input = makeEstInput()
    calculateEstMethod(input)

    expect(spy).toHaveBeenCalledTimes(1)
    const [, log] = spy.mock.calls[0]
    expect(log.function).toBe('calculateEstMethod')
    expect(log.wasmResult).toMatchObject({
      grossSales: 99999,
      cogs: 99999,
    })
  })

  it('calculateCoreSales: 不一致時に mismatch log', () => {
    const spy = vi.spyOn(console, 'warn')
    calculateCoreSales(900_000, 50_000, 40_000)

    expect(spy).toHaveBeenCalledTimes(1)
    const [, log] = spy.mock.calls[0]
    expect(log.function).toBe('calculateCoreSales')
  })

  it('calculateDiscountRate: 不一致時に mismatch log', () => {
    const spy = vi.spyOn(console, 'warn')
    calculateDiscountRate(25_000, 500_000)

    expect(spy).toHaveBeenCalledTimes(1)
    const [, log] = spy.mock.calls[0]
    expect(log.function).toBe('calculateDiscountRate')
  })

  it('calculateDiscountImpact: 不一致時に mismatch log', () => {
    const spy = vi.spyOn(console, 'warn')
    calculateDiscountImpact(makeDiscountInput())

    expect(spy).toHaveBeenCalledTimes(1)
    const [, log] = spy.mock.calls[0]
    expect(log.function).toBe('calculateDiscountImpact')
  })

  it('calculateMarkupRates: 不一致時に mismatch log', () => {
    const spy = vi.spyOn(console, 'warn')
    calculateMarkupRates(makeMarkupInput())

    expect(spy).toHaveBeenCalledTimes(1)
    const [, log] = spy.mock.calls[0]
    expect(log.function).toBe('calculateMarkupRates')
  })

  it('calculateTransferTotals: 不一致時に mismatch log', () => {
    const spy = vi.spyOn(console, 'warn')
    calculateTransferTotals(makeTransferInput())

    expect(spy).toHaveBeenCalledTimes(1)
    const [, log] = spy.mock.calls[0]
    expect(log.function).toBe('calculateTransferTotals')
  })

  it('calculateInventoryCost: 不一致時に mismatch log', () => {
    const spy = vi.spyOn(console, 'warn')
    calculateInventoryCost(500_000, 40_000)

    expect(spy).toHaveBeenCalledTimes(1)
    const [, log] = spy.mock.calls[0]
    expect(log.function).toBe('calculateInventoryCost')
  })
})

/* ── 6. dual-run-compare + 一致時は silent ────── */

describe('dual-run-compare + WASM 一致時は console.warn しない', () => {
  it('calculateInvMethod: TS と WASM が一致すれば warn なし', () => {
    setExecutionMode('dual-run-compare')
    vi.spyOn(wasmEngine, 'getWasmModuleState').mockReturnValue('ready')
    vi.spyOn(wasmEngine, 'getGrossProfitWasmExports').mockReturnValue(
      {} as ReturnType<typeof wasmEngine.getGrossProfitWasmExports>,
    )

    const input = makeInvInput()
    const direct = calculateInvMethodDirect(input)
    vi.mocked(calculateInvMethodWasm).mockReturnValueOnce({
      cogs: direct.cogs,
      grossProfit: direct.grossProfit,
      grossProfitRate: direct.grossProfitRate,
    })

    const spy = vi.spyOn(console, 'warn')
    const result = calculateInvMethod(input)

    expect(result).toEqual(direct)
    expect(spy).not.toHaveBeenCalled()
  })

  it('calculateDiscountRate: TS と WASM が一致すれば warn なし', () => {
    setExecutionMode('dual-run-compare')
    vi.spyOn(wasmEngine, 'getWasmModuleState').mockReturnValue('ready')
    vi.spyOn(wasmEngine, 'getGrossProfitWasmExports').mockReturnValue(
      {} as ReturnType<typeof wasmEngine.getGrossProfitWasmExports>,
    )

    const direct = calculateDiscountRateDirect(25_000, 500_000)
    vi.mocked(calculateDiscountRateWasm).mockReturnValueOnce(direct)

    const spy = vi.spyOn(console, 'warn')
    const result = calculateDiscountRate(25_000, 500_000)

    expect(result).toBe(direct)
    expect(spy).not.toHaveBeenCalled()
  })

  it('calculateEstMethod: closingInventory 含め全一致なら warn なし', () => {
    setExecutionMode('dual-run-compare')
    vi.spyOn(wasmEngine, 'getWasmModuleState').mockReturnValue('ready')
    vi.spyOn(wasmEngine, 'getGrossProfitWasmExports').mockReturnValue(
      {} as ReturnType<typeof wasmEngine.getGrossProfitWasmExports>,
    )

    const input = makeEstInput()
    const direct = calculateEstMethodDirect(input)
    vi.mocked(calculateEstMethodWasm).mockReturnValueOnce({ ...direct })

    const spy = vi.spyOn(console, 'warn')
    const result = calculateEstMethod(input)

    expect(result).toEqual(direct)
    expect(spy).not.toHaveBeenCalled()
  })

  it('calculateMarkupRates: TS と WASM が一致すれば warn なし', () => {
    setExecutionMode('dual-run-compare')
    vi.spyOn(wasmEngine, 'getWasmModuleState').mockReturnValue('ready')
    vi.spyOn(wasmEngine, 'getGrossProfitWasmExports').mockReturnValue(
      {} as ReturnType<typeof wasmEngine.getGrossProfitWasmExports>,
    )

    const input = makeMarkupInput()
    const direct = calculateMarkupRatesDirect(input)
    vi.mocked(calculateMarkupRatesWasm).mockReturnValueOnce({ ...direct })

    const spy = vi.spyOn(console, 'warn')
    const result = calculateMarkupRates(input)

    expect(result).toEqual(direct)
    expect(spy).not.toHaveBeenCalled()
  })

  it('calculateInventoryCost: TS と WASM が一致すれば warn なし', () => {
    setExecutionMode('dual-run-compare')
    vi.spyOn(wasmEngine, 'getWasmModuleState').mockReturnValue('ready')
    vi.spyOn(wasmEngine, 'getGrossProfitWasmExports').mockReturnValue(
      {} as ReturnType<typeof wasmEngine.getGrossProfitWasmExports>,
    )

    const direct = calculateInventoryCostDirect(500_000, 40_000)
    vi.mocked(calculateInventoryCostWasm).mockReturnValueOnce(direct)

    const spy = vi.spyOn(console, 'warn')
    const result = calculateInventoryCost(500_000, 40_000)

    expect(result).toBe(direct)
    expect(spy).not.toHaveBeenCalled()
  })
})

/* ── 7. null mismatch 検出 ────────────────────── */

describe('null mismatch 検出', () => {
  beforeEach(() => {
    setExecutionMode('dual-run-compare')
    vi.spyOn(wasmEngine, 'getWasmModuleState').mockReturnValue('ready')
    vi.spyOn(wasmEngine, 'getGrossProfitWasmExports').mockReturnValue(
      {} as ReturnType<typeof wasmEngine.getGrossProfitWasmExports>,
    )
  })

  it('calculateInvMethod: TS=null / WASM=non-null の null mismatch', () => {
    const spy = vi.spyOn(console, 'warn')
    // null inventory → TS returns nulls, mock WASM returns numbers
    const input = makeInvInput({ openingInventory: null })
    calculateInvMethod(input)

    expect(spy).toHaveBeenCalledTimes(1)
    const [label] = spy.mock.calls[0]
    expect(label).toBe('[grossProfit dual-run null mismatch] calculateInvMethod:')
  })

  it('calculateEstMethod: closingInventory TS=null / WASM=non-null', () => {
    const spy = vi.spyOn(console, 'warn')
    const input = makeEstInput({ openingInventory: null })
    calculateEstMethod(input)

    // closingInventory: TS=null, WASM=99999 → null mismatch
    expect(spy).toHaveBeenCalled()
    const nullMismatchCall = spy.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('null mismatch'),
    )
    expect(nullMismatchCall).toBeDefined()
  })

  it('calculateInvMethod: 両方 null なら null mismatch にならない', () => {
    const spy = vi.spyOn(console, 'warn')
    const input = makeInvInput({ openingInventory: null })

    // WASM も null を返すようモック
    vi.mocked(calculateInvMethodWasm).mockReturnValueOnce({
      cogs: null,
      grossProfit: null,
      grossProfitRate: null,
    })

    calculateInvMethod(input)
    expect(spy).not.toHaveBeenCalled()
  })

  it('calculateCoreSales: isOverDelivery boolean 不一致', () => {
    const spy = vi.spyOn(console, 'warn')
    // 通常は isOverDelivery=false, モック WASM も false なので一致するケースを
    // isOverDelivery=true になるテストに変更
    vi.mocked(calculateCoreSalesWasm).mockReturnValueOnce({
      coreSales: 99999,
      isOverDelivery: true, // TS は false のはず → boolean mismatch
      overDeliveryAmount: 0,
    })
    calculateCoreSales(900_000, 50_000, 40_000)

    const boolMismatchCall = spy.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('null mismatch'),
    )
    expect(boolMismatchCall).toBeDefined()
  })
})

/* ── 8. GP invariants: bridge 経由でも成立 ──── */

describe('GP invariants: bridge 経由でも成立', () => {
  it('GP-INV-1: COGS = opening + purchases - closing', () => {
    const input = makeInvInput()
    const result = calculateInvMethod(input)
    expect(result.cogs).toBe(
      input.openingInventory! + input.totalPurchaseCost - input.closingInventory!,
    )
  })

  it('GP-INV-2: grossProfit = sales - COGS', () => {
    const input = makeInvInput()
    const result = calculateInvMethod(input)
    expect(result.grossProfit).toBe(input.totalSales - result.cogs!)
  })

  it('GP-INV-4: null inventory → null outputs', () => {
    const input = makeInvInput({ openingInventory: null })
    const result = calculateInvMethod(input)
    expect(result.cogs).toBeNull()
    expect(result.grossProfit).toBeNull()
    expect(result.grossProfitRate).toBeNull()
  })

  it('GP-INV-11: transferTotals = sum of 4 directions', () => {
    const input = makeTransferInput()
    const result = calculateTransferTotals(input)
    expect(result.transferPrice).toBe(
      input.interStoreInPrice +
        input.interStoreOutPrice +
        input.interDepartmentInPrice +
        input.interDepartmentOutPrice,
    )
    expect(result.transferCost).toBe(
      input.interStoreInCost +
        input.interStoreOutCost +
        input.interDepartmentInCost +
        input.interDepartmentOutCost,
    )
  })

  it('inventoryCost = totalCost - deliverySalesCost', () => {
    const result = calculateInventoryCost(500_000, 40_000)
    expect(result).toBe(460_000)
  })
})
