/**
 * forecastToolsLogic.ts — pure forecast tools helper test
 *
 * 検証対象:
 * - deriveBaseValues: StoreResult + PrevYearData → ForecastBaseValues
 * - salesSliderRange / goalSalesSliderRange: min/max/step
 * - computeTool1: landing simulation の各派生値
 * - computeTool2: goal seek の各派生値
 * - getObsWarning: observation status 分岐
 * - stepPercent: clamp + 0.1 刻み丸め
 */
import { describe, it, expect } from 'vitest'
import {
  deriveBaseValues,
  salesSliderRange,
  goalSalesSliderRange,
  computeTool1,
  computeTool2,
  getObsWarning,
  stepPercent,
} from '../forecastToolsLogic'
import type { StoreResult } from '@/domain/models/storeTypes'
import type { PrevYearData } from '@/application/hooks/analytics'
import type { ForecastBaseValues } from '../forecastToolsLogic'

function makeStoreResult(overrides: Partial<StoreResult> = {}): StoreResult {
  return {
    totalSales: 1000000,
    budget: 1200000,
    remainingBudget: 200000,
    grossProfit: 300000,
    grossProfitRate: 0.3,
    grossProfitRateBudget: 0.32,
    grossProfitBudget: 384000,
    projectedSales: 1100000,
    ...overrides,
  } as unknown as StoreResult
}

function makePrevYear(hasPrevYear: boolean, totalSales: number): PrevYearData {
  return { hasPrevYear, totalSales } as unknown as PrevYearData
}

const base: ForecastBaseValues = {
  actualSales: 1000000,
  actualGP: 300000,
  actualGPRate: 0.3,
  remainingBudget: 200000,
  hasBudget: true,
  hasRemainingBudget: true,
  budget: 1200000,
  hasPrevYear: true,
  prevYearTotalSales: 900000,
  defaultSalesLanding: 1100000,
  defaultRemainGPRate: 0.3,
  defaultTargetGPRate: 0.32,
}

// ─── deriveBaseValues ──────────────────────────────

describe('deriveBaseValues', () => {
  it('StoreResult と PrevYearData から base values を構築', () => {
    const r = makeStoreResult()
    const prev = makePrevYear(true, 900000)
    const result = deriveBaseValues(r, prev)
    expect(result.actualSales).toBe(1000000)
    expect(result.budget).toBe(1200000)
    expect(result.remainingBudget).toBe(200000)
    expect(result.hasPrevYear).toBe(true)
    expect(result.prevYearTotalSales).toBe(900000)
  })

  it('hasBudget: budget>0 → true', () => {
    const r = makeStoreResult({ budget: 0 })
    const result = deriveBaseValues(r, makePrevYear(false, 0))
    expect(result.hasBudget).toBe(false)
  })

  it('hasRemainingBudget: remainingBudget>0 → true', () => {
    const r = makeStoreResult({ remainingBudget: 0 })
    const result = deriveBaseValues(r, makePrevYear(false, 0))
    expect(result.hasRemainingBudget).toBe(false)
  })

  it('hasPrevYear=false: prev.totalSales 関係なく hasPrevYear false', () => {
    const r = makeStoreResult()
    const prev = makePrevYear(false, 900000)
    const result = deriveBaseValues(r, prev)
    expect(result.hasPrevYear).toBe(false)
  })

  it('prev.totalSales=0: hasPrevYear は false', () => {
    const r = makeStoreResult()
    const prev = makePrevYear(true, 0)
    const result = deriveBaseValues(r, prev)
    expect(result.hasPrevYear).toBe(false)
  })
})

// ─── salesSliderRange / goalSalesSliderRange ───────

describe('salesSliderRange', () => {
  it('min = actualSales, max = round(defaultLanding * 1.5)', () => {
    const range = salesSliderRange(1000000, 1100000)
    expect(range.min).toBe(1000000)
    expect(range.max).toBe(1650000)
  })

  it('step = round((max-min)/100) or 1000', () => {
    const range = salesSliderRange(1000000, 1100000)
    // (1650000-1000000)/100 = 6500
    expect(range.step).toBe(6500)
  })

  it('max === min なら step = 1000 (fallback)', () => {
    // actualSales = defaultLanding * 1.5 → max == min → step fallback
    const range = salesSliderRange(1500, 1000)
    expect(range.step).toBe(1000)
  })
})

describe('goalSalesSliderRange', () => {
  it('同じ式 (min=actualSales, max=target*1.5)', () => {
    const range = goalSalesSliderRange(1000000, 1200000)
    expect(range.min).toBe(1000000)
    expect(range.max).toBe(1800000)
  })
})

// ─── computeTool1 ──────────────────────────────────

describe('computeTool1', () => {
  it('remainingSales1 = salesLanding - actualSales', () => {
    const result = computeTool1(1100000, 0.3, base)
    expect(result.remainingSales1).toBe(100000)
  })

  it('remainingGP1 = remainingSales1 * remainGPRateDecimal', () => {
    const result = computeTool1(1100000, 0.3, base)
    expect(result.remainingGP1).toBe(30000)
  })

  it('totalGP1 = actualGP + remainingGP1', () => {
    const result = computeTool1(1100000, 0.3, base)
    expect(result.totalGP1).toBe(330000)
  })

  it('tool1Valid: salesLanding>0 && remainGPRate>0 → true', () => {
    const result = computeTool1(1100000, 0.3, base)
    expect(result.tool1Valid).toBe(true)
  })

  it('tool1Valid: salesLanding=0 → false', () => {
    const result = computeTool1(0, 0.3, base)
    expect(result.tool1Valid).toBe(false)
  })

  it('tool1Valid: remainGPRate=0 → false', () => {
    const result = computeTool1(1100000, 0, base)
    expect(result.tool1Valid).toBe(false)
  })

  it('salesDiff = salesLanding - defaultSalesLanding', () => {
    const result = computeTool1(1200000, 0.3, base)
    expect(result.salesDiff).toBe(100000)
  })

  it('gpRateDiff = remainGPRate - defaultRemainGPRate', () => {
    const result = computeTool1(1100000, 0.35, base)
    expect(result.gpRateDiff).toBeCloseTo(0.05, 2)
  })
})

// ─── computeTool2 ──────────────────────────────────

describe('computeTool2', () => {
  const r = makeStoreResult()

  it('targetTotalSales2 = targetMonthlySales', () => {
    const result = computeTool2(1500000, 0.32, 1500000, r, base)
    expect(result.targetTotalSales2).toBe(1500000)
  })

  it('targetTotalGP2 = targetGPRate * targetTotalSales', () => {
    const result = computeTool2(1000000, 0.3, 1000000, r, base)
    expect(result.targetTotalGP2).toBe(300000)
  })

  it('remainingSales2 = targetTotalSales2 - actualSales', () => {
    const result = computeTool2(1500000, 0.32, 1500000, r, base)
    expect(result.remainingSales2).toBe(500000)
  })

  it('tool2Valid: targetGPRate>0 → true', () => {
    const result = computeTool2(1500000, 0.32, 1500000, r, base)
    expect(result.tool2Valid).toBe(true)
  })

  it('tool2Valid: targetGPRate=0 → false', () => {
    const result = computeTool2(1500000, 0, 1500000, r, base)
    expect(result.tool2Valid).toBe(false)
  })

  it('goalDiff = targetGPRate - defaultTargetGPRate', () => {
    const result = computeTool2(1500000, 0.35, 1500000, r, base)
    expect(result.goalDiff).toBeCloseTo(0.03, 2)
  })
})

// ─── getObsWarning ─────────────────────────────────

describe('getObsWarning', () => {
  it("obsStatus='partial' → 観測日数 警告文", () => {
    const result = getObsWarning('partial')
    expect(result).toContain('観測日数')
  })

  it("obsStatus='invalid' → 観測期間 不十分 警告文", () => {
    const result = getObsWarning('invalid')
    expect(result).toContain('観測期間が不十分')
  })

  it("obsStatus='undefined' → 観測期間 不十分 警告文", () => {
    const result = getObsWarning('undefined')
    expect(result).toContain('観測期間が不十分')
  })

  it("obsStatus='ok' → null", () => {
    const result = getObsWarning('ok')
    expect(result).toBeNull()
  })
})

// ─── stepPercent ───────────────────────────────────

describe('stepPercent', () => {
  it('current + delta を 0.1 刻みに丸める', () => {
    expect(stepPercent(0.3, 0.05, 0, 1)).toBeCloseTo(0.4, 2)
  })

  it('max を超える場合は max を返す', () => {
    expect(stepPercent(0.95, 0.1, 0, 1)).toBe(1)
  })

  it('min を下回る場合は min を返す', () => {
    expect(stepPercent(0.05, -0.1, 0, 1)).toBe(0)
  })

  it('境界内なら round(val * 10) / 10', () => {
    expect(stepPercent(0.3, 0.03, 0, 1)).toBeCloseTo(0.3, 2)
    expect(stepPercent(0.3, 0.06, 0, 1)).toBeCloseTo(0.4, 2)
  })
})
