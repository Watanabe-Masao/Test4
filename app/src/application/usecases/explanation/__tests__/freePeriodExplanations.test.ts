/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import {
  generateFreePeriodExplanations,
  generateDeptKPIExplanation,
} from '@/application/usecases/explanation/freePeriodExplanations'
import type { FreePeriodSummary } from '@/application/readModels/freePeriod'

function makeSummary(overrides: Partial<FreePeriodSummary> = {}): FreePeriodSummary {
  return {
    storeCount: 1,
    dayCount: 30,
    totalSales: 1_000_000,
    totalCustomers: 1000,
    totalDiscount: 50_000,
    averageDailySales: 33_333,
    transactionValue: 1000,
    discountRate: 0.05,
    proratedBudget: 900_000,
    budgetAchievementRate: 1.11,
    ...overrides,
  } as unknown as FreePeriodSummary
}

describe('freePeriodExplanations', () => {
  describe('generateFreePeriodExplanations', () => {
    it('includes totalSales explanation with matching value', () => {
      const summary = makeSummary()
      const map = generateFreePeriodExplanations(summary, '2024-01-01', '2024-01-31')
      const ts = map.get('freePeriodTotalSales')
      expect(ts).toBeTruthy()
      expect(ts!.value).toBe(1_000_000)
      expect(ts!.unit).toBe('yen')
      expect(ts!.formula).toContain('2024-01-01')
      expect(ts!.formula).toContain('2024-01-31')
    })

    it('populates budget achievement when proratedBudget provided', () => {
      const summary = makeSummary({ proratedBudget: 900_000, budgetAchievementRate: 1.11 })
      const map = generateFreePeriodExplanations(summary, '2024-01-01', '2024-01-31')
      const ba = map.get('freePeriodBudgetAchievement')
      expect(ba).toBeTruthy()
      expect(ba!.value).toBe(1.11)
      expect(ba!.unit).toBe('rate')
    })

    it('omits budget achievement when proratedBudget is null', () => {
      const summary = makeSummary({ proratedBudget: null, budgetAchievementRate: null })
      const map = generateFreePeriodExplanations(summary, '2024-01-01', '2024-01-31')
      expect(map.has('freePeriodBudgetAchievement')).toBe(false)
    })

    it('includes discount rate and transaction value', () => {
      const summary = makeSummary()
      const map = generateFreePeriodExplanations(summary, '2024-01-01', '2024-01-31')
      const dr = map.get('freePeriodDiscountRate')
      const tv = map.get('freePeriodTransactionValue')
      expect(dr?.value).toBe(0.05)
      expect(dr?.unit).toBe('rate')
      expect(tv?.value).toBe(1000)
      expect(tv?.unit).toBe('yen')
    })

    it('sets scope storeId to wildcard for aggregate', () => {
      const summary = makeSummary()
      const map = generateFreePeriodExplanations(summary, '2024-01-01', '2024-01-31')
      const ts = map.get('freePeriodTotalSales')!
      expect(ts.scope.storeId).toBe('*')
    })

    it('totalSales inputs include dayCount and storeCount', () => {
      const summary = makeSummary({ dayCount: 15, storeCount: 3 })
      const map = generateFreePeriodExplanations(summary, '2024-01-01', '2024-01-15')
      const ts = map.get('freePeriodTotalSales')!
      const names = ts.inputs.map((i) => i.name)
      expect(names).toContain('対象日数')
      expect(names).toContain('店舗数')
      const dayInput = ts.inputs.find((i) => i.name === '対象日数')!
      expect(dayInput.value).toBe(15)
    })
  })

  describe('generateDeptKPIExplanation', () => {
    it('builds dept KPI explanation with achievement value', () => {
      const exp = generateDeptKPIExplanation('D01', '青果', 500_000, 400_000, 1.25)
      expect(exp.metric).toBe('freePeriodDeptSalesAchievement')
      expect(exp.value).toBe(1.25)
      expect(exp.title).toContain('青果')
      expect(exp.title).toContain('D01')
      expect(exp.unit).toBe('rate')
    })

    it('uses zero when achievement is null', () => {
      const exp = generateDeptKPIExplanation('D02', '鮮魚', 0, 100, null)
      expect(exp.value).toBe(0)
    })

    it('includes actual and budget as inputs', () => {
      const exp = generateDeptKPIExplanation('D01', '青果', 500_000, 400_000, 1.25)
      expect(exp.inputs).toHaveLength(2)
      expect(exp.inputs[0].value).toBe(500_000)
      expect(exp.inputs[1].value).toBe(400_000)
    })
  })
})
