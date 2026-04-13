import { describe, it, expect } from 'vitest'
import {
  markupRateFromAmounts,
  elapsedBudget,
  elapsedGpBudget,
  extractMetric,
  computeAchievement,
  computeYoY,
} from '@/presentation/pages/Dashboard/widgets/conditionSummaryHelpers'
import type { StoreResult } from '@/domain/models/storeTypes'

const makeSr = (overrides: Partial<StoreResult> = {}): StoreResult =>
  ({
    budget: 1000,
    totalSales: 800,
    grossProfitBudget: 200,
    grossProfitRateBudget: 0.3,
    averageMarkupRate: 0.25,
    discountRate: 0.02,
    budgetDaily: new Map<number, number>(),
    ...overrides,
  }) as unknown as StoreResult

describe('markupRateFromAmounts', () => {
  it('returns 0 when totalPrice <= 0', () => {
    expect(markupRateFromAmounts(0, 0)).toBe(0)
    expect(markupRateFromAmounts(100, -10)).toBe(0)
  })

  it('computes a numeric markup rate for positive totals', () => {
    const result = markupRateFromAmounts(80, 100)
    expect(typeof result).toBe('number')
    expect(Number.isFinite(result)).toBe(true)
  })
})

describe('elapsedBudget', () => {
  it('sums budgetDaily from day 1 to elapsedDays', () => {
    const sr = makeSr({
      budgetDaily: new Map<number, number>([
        [1, 100],
        [2, 200],
        [3, 300],
        [4, 400],
      ]),
    })
    expect(elapsedBudget(sr, 3)).toBe(600)
    expect(elapsedBudget(sr, 4)).toBe(1000)
  })

  it('returns 0 when elapsedDays is 0', () => {
    const sr = makeSr({ budgetDaily: new Map([[1, 100]]) })
    expect(elapsedBudget(sr, 0)).toBe(0)
  })

  it('treats missing days as 0', () => {
    const sr = makeSr({
      budgetDaily: new Map([
        [1, 100],
        [3, 300],
      ]),
    })
    // day 2 missing
    expect(elapsedBudget(sr, 3)).toBe(400)
  })
})

describe('elapsedGpBudget', () => {
  it('returns 0 when budget <= 0', () => {
    const sr = makeSr({ budget: 0, grossProfitBudget: 100 })
    expect(elapsedGpBudget(sr, 10)).toBe(0)
  })

  it('scales grossProfitBudget by elapsed share', () => {
    const sr = makeSr({
      budget: 1000,
      grossProfitBudget: 300,
      budgetDaily: new Map([
        [1, 100],
        [2, 100],
        [3, 100],
        [4, 100],
        [5, 100],
      ]),
    })
    // elapsed budget = 300, ratio = 300/1000 = 0.3 → 300*0.3 = 90
    expect(elapsedGpBudget(sr, 3)).toBeCloseTo(90, 5)
  })
})

describe('extractMetric', () => {
  it('extracts sales with monthly tab', () => {
    const sr = makeSr({ budget: 1000, totalSales: 800 })
    const result = extractMetric(sr, 'sales', 'monthly', undefined, 30)
    expect(result.budget).toBe(1000)
    expect(result.actual).toBe(800)
  })

  it('extracts sales with elapsed tab', () => {
    const sr = makeSr({
      budget: 3000,
      totalSales: 500,
      budgetDaily: new Map([
        [1, 100],
        [2, 100],
        [3, 100],
      ]),
    })
    const result = extractMetric(sr, 'sales', 'elapsed', 3, 30)
    expect(result.budget).toBe(300)
    expect(result.actual).toBe(500)
  })

  it('falls back to monthly budget when elapsedDays >= daysInMonth', () => {
    const sr = makeSr({ budget: 1000, totalSales: 1100 })
    const result = extractMetric(sr, 'sales', 'elapsed', 30, 30)
    expect(result.budget).toBe(1000)
  })

  it('extracts markupRate as percentage', () => {
    const sr = makeSr({ averageMarkupRate: 0.25, grossProfitRateBudget: 0.3 })
    const result = extractMetric(sr, 'markupRate', 'monthly', undefined, 30)
    expect(result.actual).toBeCloseTo(25, 5)
    expect(result.budget).toBeCloseTo(30, 5)
  })

  it('extracts discountRate with budget = 0', () => {
    const sr = makeSr({ discountRate: 0.015 })
    const result = extractMetric(sr, 'discountRate', 'monthly', undefined, 30)
    expect(result.budget).toBe(0)
    expect(result.actual).toBeCloseTo(1.5, 5)
  })
})

describe('computeAchievement', () => {
  it('returns actual - budget for rate metrics (pp diff)', () => {
    expect(computeAchievement(30, 28, true)).toBe(2)
    expect(computeAchievement(25, 30, true)).toBe(-5)
  })

  it('returns achievement rate * 100 for non-rate', () => {
    // When budget=1000, actual=800 → 80%
    expect(computeAchievement(800, 1000, false)).toBeCloseTo(80, 5)
  })

  it('handles 100% achievement', () => {
    expect(computeAchievement(1000, 1000, false)).toBeCloseTo(100, 5)
  })
})

describe('computeYoY', () => {
  it('returns null when ly is null', () => {
    expect(computeYoY(100, null, false)).toBeNull()
  })

  it('returns null when ly is zero', () => {
    expect(computeYoY(100, 0, false)).toBeNull()
  })

  it('returns pp diff for rate metrics', () => {
    expect(computeYoY(30, 28, true)).toBe(2)
  })

  it('returns YoY ratio * 100 for non-rate metrics', () => {
    // 800 vs 500 → 160%
    expect(computeYoY(800, 500, false)).toBeCloseTo(160, 5)
  })

  it('returns 100 when actual equals ly', () => {
    expect(computeYoY(500, 500, false)).toBeCloseTo(100, 5)
  })
})
