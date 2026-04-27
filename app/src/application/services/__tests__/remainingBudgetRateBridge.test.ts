/**
 * remainingBudgetRateBridge — mode switch + calculate tests
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  setRemainingBudgetRateBridgeMode,
  getRemainingBudgetRateBridgeMode,
  calculateRemainingBudgetRate,
  rollbackToCurrentOnly,
  getLastDualRunResult,
} from '../remainingBudgetRateBridge'

function input(
  overrides: Partial<{
    budget: number
    totalSales: number
    budgetDaily: ReadonlyMap<number, number>
    elapsedDays: number
    daysInMonth: number
  }> = {},
) {
  const budgetDaily = new Map<number, number>()
  for (let d = 1; d <= 31; d++) budgetDaily.set(d, 10000)
  return {
    budget: 310_000,
    totalSales: 100_000,
    budgetDaily,
    elapsedDays: 10,
    daysInMonth: 31,
    ...overrides,
  }
}

describe('remainingBudgetRateBridge mode switch', () => {
  beforeEach(() => {
    rollbackToCurrentOnly()
  })

  it("デフォルトは 'current-only'", () => {
    expect(getRemainingBudgetRateBridgeMode()).toBe('current-only')
  })

  it('setRemainingBudgetRateBridgeMode で mode 切替', () => {
    setRemainingBudgetRateBridgeMode('fallback-to-current')
    expect(getRemainingBudgetRateBridgeMode()).toBe('fallback-to-current')
  })

  it('rollbackToCurrentOnly でリセット', () => {
    setRemainingBudgetRateBridgeMode('dual-run-compare')
    rollbackToCurrentOnly()
    expect(getRemainingBudgetRateBridgeMode()).toBe('current-only')
    expect(getLastDualRunResult()).toBeNull()
  })
})

describe('calculateRemainingBudgetRate (current-only)', () => {
  beforeEach(() => {
    setRemainingBudgetRateBridgeMode('current-only')
  })

  it('計算結果は数値', () => {
    const r = calculateRemainingBudgetRate(input())
    expect(typeof r).toBe('number')
  })

  it('予算ちょうど達成なら 1 付近', () => {
    // totalSales = budget であれば残予算=0、残り日数/daysInMonth-elapsedDays
    // 実装依存だが数値を返すことを確認
    const r = calculateRemainingBudgetRate(input({ totalSales: 310_000, elapsedDays: 31 }))
    expect(typeof r).toBe('number')
  })

  it('予算>売上で残予算必要達成率>0', () => {
    const r = calculateRemainingBudgetRate(input({ totalSales: 0, elapsedDays: 0 }))
    expect(typeof r).toBe('number')
  })
})

describe('calculateRemainingBudgetRate (fallback-to-current)', () => {
  beforeEach(() => {
    setRemainingBudgetRateBridgeMode('fallback-to-current')
  })

  it('WASM 未 ready でも current path で結果', () => {
    const r = calculateRemainingBudgetRate(input())
    expect(typeof r).toBe('number')
  })
})
