import { describe, it, expect } from 'vitest'
import { currentResultToMonthlyPoint } from '../useMonthlyHistory'

// ── Helper ──────────────────────────────────────────

/** Build a StoreResult-like input for currentResultToMonthlyPoint */
function makeStoreResultInput(
  overrides: Partial<{
    totalSales: number
    totalCustomers: number
    invMethodGrossProfit: number | null
    invMethodGrossProfitRate: number | null
    estMethodMargin: number
    estMethodMarginRate: number
    budget: number
    budgetAchievementRate: number
    discountRate: number
    inventoryCost: number
    deliverySalesCost: number
    grossSales: number
    costInclusionRate: number
    averageMarkupRate: number
  }> = {},
) {
  return {
    totalSales: 10_000_000,
    totalCustomers: 5000,
    invMethodGrossProfit: 2_500_000,
    invMethodGrossProfitRate: 0.25,
    estMethodMargin: 2_400_000,
    estMethodMarginRate: 0.24,
    budget: 12_000_000,
    budgetAchievementRate: 0.833,
    discountRate: 0.02,
    inventoryCost: 4_000_000,
    deliverySalesCost: 1_000_000,
    grossSales: 11_000_000,
    costInclusionRate: 0.01,
    averageMarkupRate: 0.26,
    ...overrides,
  } as const
}

// ── Tests ───────────────────────────────────────────

describe('currentResultToMonthlyPoint', () => {
  it('converts a StoreResult-like object to MonthlyDataPoint with basic fields', () => {
    const result = currentResultToMonthlyPoint(2025, 3, makeStoreResultInput(), 5)

    expect(result.year).toBe(2025)
    expect(result.month).toBe(3)
    expect(result.totalSales).toBe(10_000_000)
    expect(result.totalCustomers).toBe(5000)
    expect(result.storeCount).toBe(5)
  })

  it('uses invMethodGrossProfit when available', () => {
    const result = currentResultToMonthlyPoint(
      2025,
      6,
      makeStoreResultInput({ invMethodGrossProfit: 3_000_000, estMethodMargin: 2_800_000 }),
      1,
    )

    expect(result.grossProfit).toBe(3_000_000)
  })

  it('falls back to estMethodMargin when invMethodGrossProfit is null', () => {
    const result = currentResultToMonthlyPoint(
      2025,
      6,
      makeStoreResultInput({ invMethodGrossProfit: null, estMethodMargin: 2_800_000 }),
      1,
    )

    expect(result.grossProfit).toBe(2_800_000)
  })

  it('uses invMethodGrossProfitRate when available (via getEffectiveGrossProfitRate)', () => {
    const result = currentResultToMonthlyPoint(
      2025,
      1,
      makeStoreResultInput({ invMethodGrossProfitRate: 0.28, estMethodMarginRate: 0.22 }),
      2,
    )

    // getEffectiveGrossProfitRate returns invMethodGrossProfitRate when not null
    expect(result.grossProfitRate).toBe(0.28)
  })

  it('falls back to estMethodMarginRate when invMethodGrossProfitRate is null', () => {
    const result = currentResultToMonthlyPoint(
      2025,
      1,
      makeStoreResultInput({ invMethodGrossProfitRate: null, estMethodMarginRate: 0.22 }),
      2,
    )

    expect(result.grossProfitRate).toBe(0.22)
  })

  it('sets budget when > 0', () => {
    const result = currentResultToMonthlyPoint(
      2025,
      4,
      makeStoreResultInput({ budget: 8_000_000 }),
      1,
    )

    expect(result.budget).toBe(8_000_000)
  })

  it('sets budget to null when budget is 0', () => {
    const result = currentResultToMonthlyPoint(2025, 4, makeStoreResultInput({ budget: 0 }), 1)

    expect(result.budget).toBeNull()
  })

  it('passes budgetAchievementRate directly', () => {
    const result = currentResultToMonthlyPoint(
      2025,
      4,
      makeStoreResultInput({ budgetAchievementRate: 1.05 }),
      1,
    )

    expect(result.budgetAchievement).toBe(1.05)
  })

  it('passes discountRate directly', () => {
    const result = currentResultToMonthlyPoint(
      2025,
      5,
      makeStoreResultInput({ discountRate: 0.035 }),
      1,
    )

    expect(result.discountRate).toBe(0.035)
  })

  it('calculates costRate as (inventoryCost + deliverySalesCost) / grossSales', () => {
    const result = currentResultToMonthlyPoint(
      2025,
      7,
      makeStoreResultInput({
        inventoryCost: 3_000_000,
        deliverySalesCost: 1_500_000,
        grossSales: 9_000_000,
      }),
      1,
    )

    // (3_000_000 + 1_500_000) / 9_000_000 = 0.5
    expect(result.costRate).toBe(0.5)
  })

  it('sets costRate to null when grossSales is 0', () => {
    const result = currentResultToMonthlyPoint(
      2025,
      7,
      makeStoreResultInput({
        inventoryCost: 100,
        deliverySalesCost: 200,
        grossSales: 0,
      }),
      1,
    )

    expect(result.costRate).toBeNull()
  })

  it('passes costInclusionRate and averageMarkupRate directly', () => {
    const result = currentResultToMonthlyPoint(
      2025,
      8,
      makeStoreResultInput({ costInclusionRate: 0.015, averageMarkupRate: 0.3 }),
      3,
    )

    expect(result.costInclusionRate).toBe(0.015)
    expect(result.averageMarkupRate).toBe(0.3)
  })

  it('handles single store', () => {
    const result = currentResultToMonthlyPoint(2025, 1, makeStoreResultInput(), 1)
    expect(result.storeCount).toBe(1)
  })

  it('handles zero customers', () => {
    const result = currentResultToMonthlyPoint(
      2025,
      1,
      makeStoreResultInput({ totalCustomers: 0 }),
      1,
    )
    expect(result.totalCustomers).toBe(0)
  })
})
