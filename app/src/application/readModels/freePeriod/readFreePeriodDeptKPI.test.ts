/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import {
  dateRangeToYearMonths,
  weightedAverageRate,
  buildFreePeriodDeptKPIReadModel,
  type RawDeptKPIInput,
} from './readFreePeriodDeptKPI'

describe('dateRangeToYearMonths', () => {
  it('同月', () => {
    const result = dateRangeToYearMonths('2025-03-01', '2025-03-31')
    expect(result).toEqual([{ year: 2025, month: 3 }])
  })

  it('2ヶ月', () => {
    const result = dateRangeToYearMonths('2025-03-15', '2025-04-10')
    expect(result).toEqual([
      { year: 2025, month: 3 },
      { year: 2025, month: 4 },
    ])
  })

  it('年跨ぎ', () => {
    const result = dateRangeToYearMonths('2024-11-01', '2025-02-28')
    expect(result).toEqual([
      { year: 2024, month: 11 },
      { year: 2024, month: 12 },
      { year: 2025, month: 1 },
      { year: 2025, month: 2 },
    ])
  })

  it('1日だけ', () => {
    const result = dateRangeToYearMonths('2025-06-15', '2025-06-15')
    expect(result).toEqual([{ year: 2025, month: 6 }])
  })
})

// ─────────────────────────────────────────────────────────
// unify-period-analysis Phase 4: 率計算を SQL から JS に剥離
// ─────────────────────────────────────────────────────────

describe('weightedAverageRate (Phase 4 pure helper)', () => {
  it('正常系: weightedSum / totalWeight を返す', () => {
    // 例: Σ(gp_rate × sales) = 30000, Σsales = 100000 → 0.30
    expect(weightedAverageRate(30000, 100000)).toBeCloseTo(0.3, 6)
  })

  it('weightedSum が null なら率も null', () => {
    expect(weightedAverageRate(null, 100000)).toBeNull()
  })

  it('totalWeight が 0 なら null (0 除算回避)', () => {
    expect(weightedAverageRate(30000, 0)).toBeNull()
  })

  it('totalWeight が負なら null (契約外)', () => {
    expect(weightedAverageRate(30000, -100)).toBeNull()
  })

  it('weightedSum が 0 で totalWeight が正なら 0 を返す', () => {
    expect(weightedAverageRate(0, 100000)).toBe(0)
  })
})

describe('buildFreePeriodDeptKPIReadModel (Phase 4: weighted sum → rate conversion)', () => {
  function makeRaw(overrides: Partial<RawDeptKPIInput> = {}): RawDeptKPIInput {
    return {
      deptCode: '01',
      deptName: '青果',
      salesBudget: 0,
      salesActual: 0,
      gpRateBudgetWeighted: null,
      gpRateActualWeighted: null,
      markupRateWeighted: null,
      discountRateWeighted: null,
      ...overrides,
    }
  }

  it('空配列で rows=[], monthCount=0', () => {
    const result = buildFreePeriodDeptKPIReadModel([], 0)
    expect(result.rows).toEqual([])
    expect(result.monthCount).toBe(0)
  })

  it('単一部門の率計算: weighted sum が builder で率に変換される', () => {
    // 加重和 = 率 × salesActual の合計。
    // 例: gp_rate = 0.30, salesActual = 100000 → gpRateBudgetWeighted = 30000
    const raw = makeRaw({
      salesBudget: 120000,
      salesActual: 100000,
      gpRateBudgetWeighted: 30000, // 0.30 × 100000
      gpRateActualWeighted: 27000, // 0.27 × 100000
      markupRateWeighted: 40000, // 0.40 × 100000
      discountRateWeighted: 5000, // 0.05 × 100000
    })
    const result = buildFreePeriodDeptKPIReadModel([raw], 1)

    expect(result.rows).toHaveLength(1)
    const row = result.rows[0]
    expect(row.deptCode).toBe('01')
    expect(row.salesBudget).toBe(120000)
    expect(row.salesActual).toBe(100000)
    expect(row.salesAchievement).toBeCloseTo(100000 / 120000, 6)
    // 率は builder が weightedSum / salesActual で復元
    expect(row.gpRateBudget).toBeCloseTo(0.3, 6)
    expect(row.gpRateActual).toBeCloseTo(0.27, 6)
    expect(row.markupRate).toBeCloseTo(0.4, 6)
    expect(row.discountRate).toBeCloseTo(0.05, 6)
  })

  it('salesActual = 0 の部門: 率は全て null (0 除算回避)', () => {
    const raw = makeRaw({
      salesBudget: 50000,
      salesActual: 0,
      gpRateBudgetWeighted: 0,
      gpRateActualWeighted: 0,
      markupRateWeighted: 0,
      discountRateWeighted: 0,
    })
    const result = buildFreePeriodDeptKPIReadModel([raw], 1)
    expect(result.rows[0].gpRateBudget).toBeNull()
    expect(result.rows[0].gpRateActual).toBeNull()
    expect(result.rows[0].markupRate).toBeNull()
    expect(result.rows[0].discountRate).toBeNull()
    // salesAchievement は salesBudget > 0 なら計算される
    expect(result.rows[0].salesAchievement).toBe(0)
  })

  it('salesBudget = 0 の部門: salesAchievement は null', () => {
    const raw = makeRaw({ salesBudget: 0, salesActual: 100000 })
    const result = buildFreePeriodDeptKPIReadModel([raw], 1)
    expect(result.rows[0].salesAchievement).toBeNull()
  })

  it('weighted 値が null の率は結果も null (null 伝播)', () => {
    const raw = makeRaw({
      salesActual: 100000,
      gpRateBudgetWeighted: null,
      gpRateActualWeighted: 27000,
      markupRateWeighted: null,
      discountRateWeighted: 5000,
    })
    const result = buildFreePeriodDeptKPIReadModel([raw], 1)
    expect(result.rows[0].gpRateBudget).toBeNull()
    expect(result.rows[0].gpRateActual).toBeCloseTo(0.27, 6)
    expect(result.rows[0].markupRate).toBeNull()
    expect(result.rows[0].discountRate).toBeCloseTo(0.05, 6)
  })

  it('複数部門: 部門ごとに独立に率が計算される', () => {
    const r1 = makeRaw({
      deptCode: '01',
      salesActual: 100000,
      gpRateBudgetWeighted: 30000, // 0.30
    })
    const r2 = makeRaw({
      deptCode: '02',
      salesActual: 200000,
      gpRateBudgetWeighted: 50000, // 0.25
    })
    const result = buildFreePeriodDeptKPIReadModel([r1, r2], 1)
    expect(result.rows).toHaveLength(2)
    expect(result.rows[0].gpRateBudget).toBeCloseTo(0.3, 6)
    expect(result.rows[1].gpRateBudget).toBeCloseTo(0.25, 6)
  })

  it('monthCount がそのまま ReadModel に載る', () => {
    const result = buildFreePeriodDeptKPIReadModel([], 3)
    expect(result.monthCount).toBe(3)
  })
})
