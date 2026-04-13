import { describe, it, expect } from 'vitest'
import { registerBudgetExplanations } from '@/application/usecases/explanation/budgetExplanations'
import type { MetricId, Explanation } from '@/domain/models/analysis'
import type { StoreResult } from '@/domain/models/storeTypes'

function makeResult(overrides: Partial<StoreResult> = {}): StoreResult {
  return {
    budget: 1_000_000,
    budgetAchievementRate: 0.95,
    budgetProgressRate: 0.9,
    budgetElapsedRate: 1.0,
    budgetProgressGap: -0.1,
    budgetVariance: -50_000,
    projectedSales: 950_000,
    projectedAchievement: 0.95,
    remainingBudget: 50_000,
    requiredDailySales: 10_000,
    averageDailySales: 30_000,
    totalSales: 950_000,
    salesDays: 28,
    elapsedDays: 15,
    grossProfitBudget: 0,
    grossProfitRateBudget: 0,
    grossProfitBudgetVariance: 0,
    grossProfitProgressGap: 0,
    requiredDailyGrossProfit: 0,
    projectedGrossProfit: 0,
    projectedGPAchievement: 0,
    invMethodGrossProfit: 200_000,
    estMethodMargin: 180_000,
    ...overrides,
  } as unknown as StoreResult
}

describe('registerBudgetExplanations', () => {
  const scope = { storeId: 's1', year: 2024, month: 3 }

  it('registers all core budget metrics', () => {
    const map = new Map<MetricId, Explanation>()
    registerBudgetExplanations(map, makeResult(), scope, 's1')
    const expectedKeys: MetricId[] = [
      'budget',
      'budgetAchievementRate',
      'budgetProgressRate',
      'projectedSales',
      'remainingBudget',
      'budgetElapsedRate',
      'budgetProgressGap',
      'budgetVariance',
      'requiredDailySales',
      'averageDailySales',
      'projectedAchievement',
      'grossProfitBudget',
      'grossProfitRateBudget',
    ]
    for (const k of expectedKeys) {
      expect(map.has(k)).toBe(true)
    }
  })

  it('populates budget explanation with correct value', () => {
    const map = new Map<MetricId, Explanation>()
    registerBudgetExplanations(map, makeResult({ budget: 1_500_000 }), scope, 's1')
    const exp = map.get('budget')!
    expect(exp.value).toBe(1_500_000)
    expect(exp.unit).toBe('yen')
    expect(exp.scope).toEqual(scope)
  })

  it('remainingBudget is present with yen unit', () => {
    const map = new Map<MetricId, Explanation>()
    registerBudgetExplanations(map, makeResult({ remainingBudget: 75_000 }), scope, 's1')
    const exp = map.get('remainingBudget')!
    expect(exp.value).toBe(75_000)
    expect(exp.unit).toBe('yen')
  })

  it('skips gross profit achievement metrics when grossProfitBudget is 0', () => {
    const map = new Map<MetricId, Explanation>()
    registerBudgetExplanations(map, makeResult({ grossProfitBudget: 0 }), scope, 's1')
    expect(map.has('grossProfitBudgetAchievement')).toBe(false)
    expect(map.has('grossProfitBudgetVariance')).toBe(false)
    expect(map.has('requiredDailyGrossProfit')).toBe(false)
    expect(map.has('projectedGrossProfit')).toBe(false)
    expect(map.has('projectedGPAchievement')).toBe(false)
    expect(map.has('grossProfitProgressGap')).toBe(false)
  })

  it('includes gross profit achievement metrics when grossProfitBudget > 0', () => {
    const map = new Map<MetricId, Explanation>()
    registerBudgetExplanations(
      map,
      makeResult({ grossProfitBudget: 200_000, invMethodGrossProfit: 150_000 }),
      scope,
      's1',
    )
    const ach = map.get('grossProfitBudgetAchievement')!
    expect(ach).toBeTruthy()
    // 150000 / 200000 = 0.75
    expect(ach.value).toBeCloseTo(0.75, 5)
    expect(ach.unit).toBe('rate')
  })

  it('uses estMethodMargin when invMethodGrossProfit is null', () => {
    const map = new Map<MetricId, Explanation>()
    registerBudgetExplanations(
      map,
      makeResult({
        grossProfitBudget: 200_000,
        invMethodGrossProfit: null as unknown as number,
        estMethodMargin: 100_000,
      }),
      scope,
      's1',
    )
    const ach = map.get('grossProfitBudgetAchievement')!
    // 100000 / 200000 = 0.5
    expect(ach.value).toBeCloseTo(0.5, 5)
  })

  it('averageDailySales explanation has rate/count input linkage', () => {
    const map = new Map<MetricId, Explanation>()
    registerBudgetExplanations(map, makeResult({ averageDailySales: 42_000 }), scope, 's1')
    const exp = map.get('averageDailySales')!
    expect(exp.value).toBe(42_000)
    expect(exp.inputs.some((i) => i.metric === 'salesTotal')).toBe(true)
  })

  it('budgetProgressRate explanation has rate unit', () => {
    const map = new Map<MetricId, Explanation>()
    registerBudgetExplanations(map, makeResult({ budgetProgressRate: 0.85 }), scope, 's1')
    const exp = map.get('budgetProgressRate')!
    expect(exp.unit).toBe('rate')
    expect(exp.value).toBe(0.85)
  })
})
