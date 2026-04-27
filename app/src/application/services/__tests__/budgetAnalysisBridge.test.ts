/**
 * budgetAnalysisBridge — calculateBudgetAnalysis / calculateGrossProfitBudget tests
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { calculateBudgetAnalysis, calculateGrossProfitBudget } from '../budgetAnalysisBridge'

function budgetInput(overrides: Partial<Parameters<typeof calculateBudgetAnalysis>[0]> = {}) {
  const budgetDaily: Record<number, number> = {}
  const salesDaily: Record<number, number> = {}
  for (let d = 1; d <= 31; d++) {
    budgetDaily[d] = 10000
    salesDaily[d] = d <= 10 ? 10000 : 0
  }
  return {
    totalSales: 100_000,
    budget: 310_000,
    budgetDaily,
    salesDaily,
    elapsedDays: 10,
    salesDays: 10,
    daysInMonth: 31,
    ...overrides,
  }
}

describe('calculateBudgetAnalysis', () => {
  it('結果オブジェクトを返す', () => {
    const r = calculateBudgetAnalysis(budgetInput())
    expect(r).toHaveProperty('budgetAchievementRate')
    expect(r).toHaveProperty('budgetProgressRate')
    expect(r).toHaveProperty('dailyCumulative')
  })

  it('予算達成率 = totalSales / budget', () => {
    const r = calculateBudgetAnalysis(budgetInput({ totalSales: 100_000, budget: 1_000_000 }))
    expect(r.budgetAchievementRate).toBeCloseTo(0.1, 5)
  })

  it('dailyCumulative は TS から補完される（Record 型の非 null オブジェクト）', () => {
    const r = calculateBudgetAnalysis(budgetInput())
    expect(r.dailyCumulative).not.toBeNull()
    expect(typeof r.dailyCumulative).toBe('object')
  })

  it('totalSales=0 で budgetAchievementRate=0', () => {
    const r = calculateBudgetAnalysis(budgetInput({ totalSales: 0 }))
    expect(r.budgetAchievementRate).toBe(0)
  })

  it('budget=0 でもクラッシュしない（ガード）', () => {
    const r = calculateBudgetAnalysis(budgetInput({ budget: 0 }))
    expect(typeof r.budgetAchievementRate).toBe('number')
  })
})

describe('calculateGrossProfitBudget', () => {
  function gpInput(overrides = {}) {
    return {
      grossProfit: 300_000,
      grossProfitBudget: 330_000,
      budgetElapsedRate: 0.33,
      elapsedDays: 10,
      salesDays: 10,
      daysInMonth: 31,
      ...overrides,
    }
  }

  it('結果オブジェクトを返す', () => {
    const r = calculateGrossProfitBudget(gpInput())
    expect(r).toHaveProperty('grossProfitBudgetVariance')
    expect(r).toHaveProperty('requiredDailyGrossProfit')
  })

  it('grossProfit が予算超過なら variance > 0', () => {
    const r = calculateGrossProfitBudget(
      gpInput({ grossProfit: 400_000, grossProfitBudget: 300_000 }),
    )
    expect(r.grossProfitBudgetVariance).toBeGreaterThan(0)
  })

  it('予算=0 でもクラッシュしない', () => {
    const r = calculateGrossProfitBudget(gpInput({ grossProfitBudget: 0 }))
    expect(typeof r.grossProfitBudgetVariance).toBe('number')
  })

  it('必要日次粗利は数値', () => {
    const r = calculateGrossProfitBudget(gpInput())
    expect(typeof r.requiredDailyGrossProfit).toBe('number')
  })
})
