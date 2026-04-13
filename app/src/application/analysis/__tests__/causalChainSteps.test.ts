import { describe, it, expect } from 'vitest'
import {
  buildGrossProfitStep,
  buildFactorDecompositionStep,
  buildDiscountBreakdownStep,
  buildSummaryStep,
} from '@/application/analysis/causalChainSteps'
import type { StoreResult } from '@/domain/models/storeTypes'
import type { DiscountEntry } from '@/domain/models/record'
import type { CausalChainPrevInput } from '@/application/analysis/causalChain'

function makeResult(overrides: Partial<StoreResult> = {}): StoreResult {
  return {
    totalSales: 1_000_000,
    totalCustomers: 2000,
    transactionValue: 500,
    grossSales: 1_050_000,
    totalDiscount: 50_000,
    discountRate: 0.05,
    inventoryCost: 700_000,
    deliverySalesCost: 0,
    discountEntries: [] as DiscountEntry[],
    ...overrides,
  } as unknown as StoreResult
}

describe('causalChainSteps', () => {
  describe('buildGrossProfitStep', () => {
    it('builds step with positive delta vs prev', () => {
      const step = buildGrossProfitStep(0.3, 0.25, 0.28, 0.65, 0.05, 0.02)
      expect(step.title).toBe('粗利率の状況')
      expect(step.description).toContain('前年')
      expect(step.description).toContain('今年')
      const prevFactor = step.factors.find((f) => f.label === '前年比変動')
      expect(prevFactor).toBeTruthy()
      expect(prevFactor!.colorHint).toBe('positive')
    })

    it('omits prev factor when prevGPRate is null', () => {
      const step = buildGrossProfitStep(0.3, null, 0, 0.65, 0.05, 0.02)
      expect(step.factors.find((f) => f.label === '前年比変動')).toBeUndefined()
      expect(step.description).not.toContain('前年')
    })

    it('omits budget factor when budgetGPRate is 0', () => {
      const step = buildGrossProfitStep(0.3, 0.25, 0, 0.65, 0.05, 0.02)
      expect(step.factors.find((f) => f.label === '予算比変動')).toBeUndefined()
    })

    it('always includes current gp rate factor', () => {
      const step = buildGrossProfitStep(0.35, null, 0, 0.65, 0.05, 0.02)
      const current = step.factors.find((f) => f.label === '現在の粗利率')
      expect(current).toBeTruthy()
      expect(current!.value).toBe(0.35)
    })
  })

  describe('buildFactorDecompositionStep', () => {
    it('handles missing prev input', () => {
      const step = buildFactorDecompositionStep(0.65, 0.05, 0.02, undefined, makeResult(), null)
      expect(step.title).toBe('粗利率変動の要因分解')
      expect(step.insight).toBe('前年データなし')
      expect(step.factors).toHaveLength(3)
    })

    it('uses shapley insight when provided with prev.totalSales', () => {
      const prev: CausalChainPrevInput = {
        grossProfitRate: 0.25,
        costRate: 0.7,
        discountRate: 0.04,
        costInclusionRate: 0.01,
        discountEntries: [],
        totalSales: 800_000,
        totalCustomers: 1500,
      }
      const shapley = { custEffect: 100_000, ticketEffect: 100_000 }
      const step = buildFactorDecompositionStep(
        0.65,
        0.05,
        0.02,
        prev,
        makeResult({ totalSales: 1_000_000 }),
        shapley,
      )
      expect(step.insight).toContain('客数効果')
      expect(step.insight).toContain('客単価効果')
    })
  })

  describe('buildDiscountBreakdownStep', () => {
    it('returns null when no discount entries', () => {
      const step = buildDiscountBreakdownStep(makeResult({ discountEntries: [] }), undefined)
      expect(step).toBeNull()
    })

    it('builds step with entries', () => {
      const entries: DiscountEntry[] = [
        { type: '71', label: '政策売変', amount: 10_000 },
        { type: '72', label: 'レジ値引', amount: 5_000 },
      ]
      const step = buildDiscountBreakdownStep(
        makeResult({ discountEntries: entries, totalDiscount: 15_000 }),
        undefined,
      )
      expect(step).not.toBeNull()
      expect(step!.factors).toHaveLength(2)
      expect(step!.title).toBe('売変種別内訳')
    })

    it('adds delta info when prev entries provided', () => {
      const entries: DiscountEntry[] = [{ type: '71', label: '政策売変', amount: 10_000 }]
      const prevEntries: DiscountEntry[] = [{ type: '71', label: '政策売変', amount: 6_000 }]
      const step = buildDiscountBreakdownStep(
        makeResult({ discountEntries: entries, totalDiscount: 10_000 }),
        prevEntries,
      )
      expect(step!.factors[0].formatted).toContain('差')
      expect(step!.factors[0].value).toBe(4000)
    })
  })

  describe('buildSummaryStep', () => {
    it('builds summary with current values only', () => {
      const step = buildSummaryStep(makeResult(), undefined, 0.65, 0.05, 0.02, null)
      expect(step.title).toBe('成分サマリー')
      expect(step.factors).toHaveLength(0) // no shapley
      expect(step.insight).toContain('売上')
    })

    it('adds shapley factors when provided', () => {
      const shapley = { custEffect: 50_000, ticketEffect: 30_000 }
      const step = buildSummaryStep(makeResult(), undefined, 0.65, 0.05, 0.02, shapley)
      expect(step.factors).toHaveLength(2)
      expect(step.factors[0].label).toBe('客数効果')
      expect(step.factors[1].label).toBe('客単価効果')
    })

    it('adds delta lines when prev provided', () => {
      const prev: CausalChainPrevInput = {
        grossProfitRate: 0.3,
        costRate: 0.6,
        discountRate: 0.04,
        costInclusionRate: 0.015,
        discountEntries: [],
        totalSales: 900_000,
        totalCustomers: 1800,
      }
      const step = buildSummaryStep(makeResult(), prev, 0.65, 0.05, 0.02, null)
      expect(step.insight).toContain('原価率差')
    })
  })
})
