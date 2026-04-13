import { describe, it, expect } from 'vitest'
import { prorateGpBudget } from '../conditionPanelProfitability.vm'
import type { StoreResult } from '@/domain/models/storeTypes'

function makeStoreResult(overrides: Partial<StoreResult> = {}): StoreResult {
  const base = {
    grossProfitBudget: 1000,
    budget: 10000,
    budgetDaily: new Map<number, number>([
      [1, 1000],
      [2, 1000],
      [3, 1000],
      [4, 1000],
      [5, 1000],
      [6, 1000],
      [7, 1000],
      [8, 1000],
      [9, 1000],
      [10, 1000],
    ]),
    ...overrides,
  }
  return base as unknown as StoreResult
}

describe('prorateGpBudget', () => {
  it('returns full grossProfitBudget when elapsedDays is undefined (non-partial)', () => {
    const sr = makeStoreResult({ grossProfitBudget: 1234 })
    expect(prorateGpBudget(sr, undefined, 31)).toBe(1234)
  })

  it('returns full grossProfitBudget when elapsedDays equals daysInMonth', () => {
    const sr = makeStoreResult({ grossProfitBudget: 5000 })
    expect(prorateGpBudget(sr, 30, 30)).toBe(5000)
  })

  it('returns full grossProfitBudget when elapsedDays is greater than daysInMonth', () => {
    const sr = makeStoreResult({ grossProfitBudget: 5000 })
    expect(prorateGpBudget(sr, 32, 31)).toBe(5000)
  })

  it('defaults daysInMonth to 31 when undefined — returns full when elapsed undefined', () => {
    const sr = makeStoreResult({ grossProfitBudget: 777 })
    expect(prorateGpBudget(sr, undefined, undefined)).toBe(777)
  })

  it('prorates the budget when elapsedDays is partial', () => {
    const sr = makeStoreResult({ grossProfitBudget: 1000 })
    // 5 out of 10 days → half of grossProfitBudget = 500
    const result = prorateGpBudget(sr, 5, 10)
    expect(result).toBe(500)
  })

  it('prorates linearly for a single elapsed day out of 10', () => {
    const sr = makeStoreResult({ grossProfitBudget: 1000 })
    const result = prorateGpBudget(sr, 1, 10)
    expect(result).toBe(100)
  })
})
