/**
 * budgetAnalysis Bridge テスト
 *
 * 検証項目:
 * 1. ts-only モード: TS 実装が正しく呼ばれる（2 関数）
 * 2. wasm-only + WASM 未初期化: TS フォールバック
 * 3. wasm-only + state=loading/error: TS フォールバック
 * 4. dual-run-compare + WASM 未初期化: TS フォールバック（compare なし）
 * 5. dual-run-compare + WASM ready + 不一致: console.warn + BudgetAnalysisMismatchLog shape
 * 6. dual-run-compare + WASM ready + 一致: console.warn なし
 * 7. B-INV invariants: bridge 経由でも成立
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  calculateBudgetAnalysis as calculateBudgetAnalysisDirect,
  calculateGrossProfitBudget as calculateGrossProfitBudgetDirect,
} from '@/domain/calculations/budgetAnalysis'
import type {
  BudgetAnalysisInput,
  GrossProfitBudgetInput,
} from '@/domain/calculations/budgetAnalysis'
import { setExecutionMode } from '../wasmEngine'
import * as wasmEngine from '../wasmEngine'

/**
 * WASM wrapper をモック。意図的にずれた値を返す。
 */
vi.mock('../budgetAnalysisWasm', () => ({
  calculateBudgetAnalysisWasm: vi.fn(() => ({
    budgetAchievementRate: 99999,
    budgetProgressRate: 99999,
    budgetElapsedRate: 99999,
    budgetProgressGap: 99999,
    budgetVariance: 99999,
    averageDailySales: 99999,
    projectedSales: 99999,
    projectedAchievement: 99999,
    requiredDailySales: 99999,
    remainingBudget: 99999,
    dailyCumulative: {},
  })),
  calculateGrossProfitBudgetWasm: vi.fn(() => ({
    grossProfitBudgetVariance: 99999,
    grossProfitProgressGap: 99999,
    requiredDailyGrossProfit: 99999,
    projectedGrossProfit: 99999,
    projectedGPAchievement: 99999,
  })),
}))

import { calculateBudgetAnalysis, calculateGrossProfitBudget } from '../budgetAnalysisBridge'
import {
  calculateBudgetAnalysisWasm,
  calculateGrossProfitBudgetWasm,
} from '../budgetAnalysisWasm'

/* ── テストヘルパー ─────────────────────────────── */

function makeBudgetInput(overrides?: Partial<BudgetAnalysisInput>): BudgetAnalysisInput {
  return {
    totalSales: 3_000_000,
    budget: 10_000_000,
    budgetDaily: { 1: 300_000, 2: 350_000, 3: 320_000, 4: 280_000, 5: 310_000 },
    salesDaily: { 1: 500_000, 2: 600_000, 3: 550_000, 4: 480_000, 5: 870_000 },
    elapsedDays: 5,
    salesDays: 5,
    daysInMonth: 30,
    ...overrides,
  }
}

function makeGPBudgetInput(
  overrides?: Partial<GrossProfitBudgetInput>,
): GrossProfitBudgetInput {
  return {
    grossProfit: 900_000,
    grossProfitBudget: 3_000_000,
    budgetElapsedRate: 0.167,
    elapsedDays: 5,
    salesDays: 5,
    daysInMonth: 30,
    ...overrides,
  }
}

beforeEach(() => {
  setExecutionMode('ts-only')
  vi.restoreAllMocks()
})

/* ── 1. ts-only モード ─────────────────────────── */

describe('bridge ts-only mode: bridge と直接呼び出しの結果一致', () => {
  it('calculateBudgetAnalysis', () => {
    const input = makeBudgetInput()
    const bridge = calculateBudgetAnalysis(input)
    const direct = calculateBudgetAnalysisDirect(input)
    expect(bridge).toEqual(direct)
  })

  it('calculateGrossProfitBudget', () => {
    const input = makeGPBudgetInput()
    const bridge = calculateGrossProfitBudget(input)
    const direct = calculateGrossProfitBudgetDirect(input)
    expect(bridge).toEqual(direct)
  })
})

/* ── 2. wasm-only + WASM 未初期化 (idle) ──────── */

describe('bridge wasm-only mode: WASM 未初期化時は TS フォールバック', () => {
  it('calculateBudgetAnalysis falls back to TS', () => {
    setExecutionMode('wasm-only')
    const input = makeBudgetInput()
    const bridge = calculateBudgetAnalysis(input)
    const direct = calculateBudgetAnalysisDirect(input)
    expect(bridge).toEqual(direct)
  })

  it('calculateGrossProfitBudget falls back to TS', () => {
    setExecutionMode('wasm-only')
    const input = makeGPBudgetInput()
    const bridge = calculateGrossProfitBudget(input)
    const direct = calculateGrossProfitBudgetDirect(input)
    expect(bridge).toEqual(direct)
  })
})

/* ── 3. wasm-only + state=loading/error ────────── */

describe('wasm-only + state=loading/error: TS フォールバック', () => {
  it('loading 中は TS にフォールバック', () => {
    setExecutionMode('wasm-only')
    vi.spyOn(wasmEngine, 'getWasmState').mockReturnValue('loading')
    const input = makeBudgetInput()
    const bridge = calculateBudgetAnalysis(input)
    const direct = calculateBudgetAnalysisDirect(input)
    expect(bridge).toEqual(direct)
  })

  it('error 状態でも TS にフォールバック', () => {
    setExecutionMode('wasm-only')
    vi.spyOn(wasmEngine, 'getWasmState').mockReturnValue('error')
    const input = makeGPBudgetInput()
    const bridge = calculateGrossProfitBudget(input)
    const direct = calculateGrossProfitBudgetDirect(input)
    expect(bridge).toEqual(direct)
  })
})

/* ── 4. dual-run-compare + WASM 未初期化 ─────── */

describe('dual-run-compare + WASM idle: TS フォールバック（compare なし）', () => {
  it('WASM 未初期化時は TS 結果のみ、compare は発生しない', () => {
    setExecutionMode('dual-run-compare')
    const spy = vi.spyOn(console, 'warn')
    const input = makeBudgetInput()
    const bridge = calculateBudgetAnalysis(input)
    const direct = calculateBudgetAnalysisDirect(input)
    expect(bridge).toEqual(direct)
    expect(spy).not.toHaveBeenCalled()
  })
})

/* ── 5. BudgetAnalysisMismatchLog shape ─────── */

describe('BudgetAnalysisMismatchLog shape（モック WASM で差分検出）', () => {
  beforeEach(() => {
    setExecutionMode('dual-run-compare')
    vi.spyOn(wasmEngine, 'getWasmState').mockReturnValue('ready')
    vi.spyOn(wasmEngine, 'getBudgetAnalysisWasmExports').mockReturnValue(
      {} as unknown as ReturnType<typeof wasmEngine.getBudgetAnalysisWasmExports>,
    )
  })

  it('calculateBudgetAnalysis: 不一致時に console.warn + 正しい log shape', () => {
    const spy = vi.spyOn(console, 'warn')
    const input = makeBudgetInput()
    const result = calculateBudgetAnalysis(input)
    const direct = calculateBudgetAnalysisDirect(input)

    // TS 結果を返すこと（authoritative は TS）
    expect(result).toEqual(direct)

    // mismatch log が出力されること
    expect(spy).toHaveBeenCalledTimes(1)
    const [label, log] = spy.mock.calls[0]
    expect(label).toBe('[budgetAnalysis dual-run mismatch]')
    expect(log).toMatchObject({
      function: 'calculateBudgetAnalysis',
      wasmState: 'ready',
      executionMode: 'dual-run-compare',
    })
    expect(typeof log.maxAbsDiff).toBe('number')
    expect(log.maxAbsDiff).toBeGreaterThan(0)
    expect(log.diffs).toBeDefined()
    expect(log.tsResult).toHaveProperty('budgetAchievementRate')
    expect(log.tsResult).toHaveProperty('remainingBudget')
    expect(log.wasmResult.budgetAchievementRate).toBe(99999)
  })

  it('calculateGrossProfitBudget: 不一致時に mismatch log', () => {
    const spy = vi.spyOn(console, 'warn')
    const input = makeGPBudgetInput()
    calculateGrossProfitBudget(input)

    expect(spy).toHaveBeenCalledTimes(1)
    const [, log] = spy.mock.calls[0]
    expect(log.function).toBe('calculateGrossProfitBudget')
    expect(log.wasmResult).toMatchObject({
      grossProfitBudgetVariance: 99999,
      grossProfitProgressGap: 99999,
      requiredDailyGrossProfit: 99999,
      projectedGrossProfit: 99999,
      projectedGPAchievement: 99999,
    })
  })
})

/* ── 6. dual-run-compare + 一致時は silent ────── */

describe('dual-run-compare + WASM 一致時は console.warn しない', () => {
  it('calculateBudgetAnalysis: TS と WASM が一致すれば warn なし', () => {
    setExecutionMode('dual-run-compare')
    vi.spyOn(wasmEngine, 'getWasmState').mockReturnValue('ready')
    vi.spyOn(wasmEngine, 'getBudgetAnalysisWasmExports').mockReturnValue(
      {} as unknown as ReturnType<typeof wasmEngine.getBudgetAnalysisWasmExports>,
    )

    const input = makeBudgetInput()
    const direct = calculateBudgetAnalysisDirect(input)
    vi.mocked(calculateBudgetAnalysisWasm).mockReturnValueOnce({ ...direct })

    const spy = vi.spyOn(console, 'warn')
    const result = calculateBudgetAnalysis(input)

    expect(result).toEqual(direct)
    expect(spy).not.toHaveBeenCalled()
  })

  it('calculateGrossProfitBudget: TS と WASM が一致すれば warn なし', () => {
    setExecutionMode('dual-run-compare')
    vi.spyOn(wasmEngine, 'getWasmState').mockReturnValue('ready')
    vi.spyOn(wasmEngine, 'getBudgetAnalysisWasmExports').mockReturnValue(
      {} as unknown as ReturnType<typeof wasmEngine.getBudgetAnalysisWasmExports>,
    )

    const input = makeGPBudgetInput()
    const direct = calculateGrossProfitBudgetDirect(input)
    vi.mocked(calculateGrossProfitBudgetWasm).mockReturnValueOnce({ ...direct })

    const spy = vi.spyOn(console, 'warn')
    const result = calculateGrossProfitBudget(input)

    expect(result).toEqual(direct)
    expect(spy).not.toHaveBeenCalled()
  })
})

/* ── 7. B-INV invariants: bridge 経由でも成立 ── */

describe('B-INV invariants: bridge 経由でも成立', () => {
  it('B-INV-1: remainingBudget == budget - totalSales', () => {
    const input = makeBudgetInput()
    const result = calculateBudgetAnalysis(input)
    expect(result.remainingBudget).toBe(input.budget - input.totalSales)
  })

  it('B-INV-2: budgetProgressGap == progressRate - elapsedRate', () => {
    const input = makeBudgetInput()
    const result = calculateBudgetAnalysis(input)
    expect(result.budgetProgressGap).toBeCloseTo(
      result.budgetProgressRate - result.budgetElapsedRate,
      10,
    )
  })

  it('B-INV-4: 0 予算でも全フィールドが finite', () => {
    const input = makeBudgetInput({ budget: 0 })
    const result = calculateBudgetAnalysis(input)
    expect(Number.isFinite(result.budgetAchievementRate)).toBe(true)
    expect(Number.isFinite(result.budgetProgressRate)).toBe(true)
    expect(Number.isFinite(result.budgetElapsedRate)).toBe(true)
    expect(Number.isFinite(result.projectedAchievement)).toBe(true)
  })

  it('B-INV-6: elapsedDays == daysInMonth → requiredDailySales == 0', () => {
    const input = makeBudgetInput({ elapsedDays: 30, daysInMonth: 30 })
    const result = calculateBudgetAnalysis(input)
    expect(result.requiredDailySales).toBe(0)
  })

  it('B-INV-7: projectedGPAchievement == projectedGrossProfit / grossProfitBudget', () => {
    const input = makeGPBudgetInput()
    const result = calculateGrossProfitBudget(input)
    const expected = result.projectedGrossProfit / input.grossProfitBudget
    expect(result.projectedGPAchievement).toBeCloseTo(expected, 10)
  })
})
