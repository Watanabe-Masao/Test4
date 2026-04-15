/**
 * selectPrevYearSummaryFromFreePeriod — unit + parity tests
 *
 * Phase 6 Step A:
 * 1. selector が `comparisonSummary` から正しい射影を返すことを unit で固定
 * 2. legacy `prevYear` summary と `FreePeriodReadModel.comparisonSummary` の
 *    値が「同じ期間に対する同じ集計」を表しているとき、selector 出力が legacy
 *    抽出と一致することを **parity** で固定 (Step A 差し替えの安全網)
 *
 * 本テストは 2 つの shape の構造変換が一致することを保証するもので、ランタイムの
 * データ source が一致することは保証しない (それは acceptance suite の役割)。
 */
import { describe, it, expect } from 'vitest'
import {
  selectPrevYearSummaryFromFreePeriod,
  type PrevYearSummaryProjection,
} from './selectPrevYearSummaryFromFreePeriod'
import type { FreePeriodReadModel, FreePeriodSummary } from './FreePeriodTypes'

// ── fixture builders ──────────────────────────────────────

function makeSummary(overrides: Partial<FreePeriodSummary> = {}): FreePeriodSummary {
  return {
    storeCount: 3,
    dayCount: 14,
    totalSales: 0,
    totalCustomers: 0,
    totalPurchaseCost: 0,
    totalDiscount: 0,
    averageDailySales: 0,
    transactionValue: 0,
    discountRate: 0,
    proratedBudget: null,
    budgetAchievementRate: null,
    ...overrides,
  }
}

function makeReadModel(
  comparisonOverrides: Partial<FreePeriodSummary> | null,
): FreePeriodReadModel {
  return {
    currentRows: [],
    comparisonRows: [],
    currentSummary: makeSummary({ totalSales: 1_000_000, totalCustomers: 5_000 }),
    comparisonSummary: comparisonOverrides ? makeSummary(comparisonOverrides) : null,
    meta: { usedFallback: false },
  }
}

// ── unit ──────────────────────────────────────────────────

describe('selectPrevYearSummaryFromFreePeriod — unit', () => {
  it('null fact のときは ZERO projection を返す', () => {
    const result = selectPrevYearSummaryFromFreePeriod(null)
    expect(result).toEqual<PrevYearSummaryProjection>({
      hasPrevYear: false,
      totalSales: 0,
      totalCustomers: 0,
      prevYearMonthlySales: 0,
    })
  })

  it('comparisonSummary が null のときは ZERO projection を返す', () => {
    const fact = makeReadModel(null)
    const result = selectPrevYearSummaryFromFreePeriod(fact)
    expect(result.hasPrevYear).toBe(false)
    expect(result.totalSales).toBe(0)
  })

  it('comparisonSummary.totalSales が 0 のときは hasPrevYear=false (前年データ実質なし)', () => {
    const fact = makeReadModel({ totalSales: 0, totalCustomers: 100 })
    const result = selectPrevYearSummaryFromFreePeriod(fact)
    expect(result.hasPrevYear).toBe(false)
    expect(result.totalSales).toBe(0)
    expect(result.totalCustomers).toBe(0)
  })

  it('comparisonSummary が valid のときは 4 フィールドを射影する', () => {
    const fact = makeReadModel({ totalSales: 800_000, totalCustomers: 4_200 })
    const result = selectPrevYearSummaryFromFreePeriod(fact)
    expect(result).toEqual<PrevYearSummaryProjection>({
      hasPrevYear: true,
      totalSales: 800_000,
      totalCustomers: 4_200,
      prevYearMonthlySales: 800_000,
    })
  })

  it('totalSales と prevYearMonthlySales は同じ値を指す (旧命名 alias)', () => {
    const fact = makeReadModel({ totalSales: 1_234_567, totalCustomers: 9_999 })
    const result = selectPrevYearSummaryFromFreePeriod(fact)
    expect(result.prevYearMonthlySales).toBe(result.totalSales)
  })
})

// ── parity ────────────────────────────────────────────────

describe('selectPrevYearSummaryFromFreePeriod — parity with legacy prevYear summary', () => {
  // legacy 側の最小型 (PrevYearData / PrevYearMonthlyKpi の summary 部分)
  interface LegacyPrevYearShape {
    readonly hasPrevYear: boolean
    readonly totalSales: number
    readonly totalCustomers: number
    readonly prevYearMonthlySales: number
  }

  function extractLegacy(legacy: LegacyPrevYearShape): PrevYearSummaryProjection {
    if (!legacy.hasPrevYear || legacy.totalSales <= 0) {
      return {
        hasPrevYear: false,
        totalSales: 0,
        totalCustomers: 0,
        prevYearMonthlySales: 0,
      }
    }
    return {
      hasPrevYear: true,
      totalSales: legacy.totalSales,
      totalCustomers: legacy.totalCustomers,
      prevYearMonthlySales: legacy.prevYearMonthlySales,
    }
  }

  it('同一期間の同一集計値が legacy と freePeriod 両表現で一致する (4 フィールド)', () => {
    const totalSales = 950_000
    const totalCustomers = 4_800

    const legacy: LegacyPrevYearShape = {
      hasPrevYear: true,
      totalSales,
      totalCustomers,
      prevYearMonthlySales: totalSales, // legacy: monthlyTotal.sales が同じ値
    }
    const fact = makeReadModel({ totalSales, totalCustomers })

    const fromLegacy = extractLegacy(legacy)
    const fromFreePeriod = selectPrevYearSummaryFromFreePeriod(fact)

    expect(fromFreePeriod).toEqual(fromLegacy)
  })

  it('hasPrevYear=false の場合も両表現で一致する', () => {
    const legacy: LegacyPrevYearShape = {
      hasPrevYear: false,
      totalSales: 0,
      totalCustomers: 0,
      prevYearMonthlySales: 0,
    }
    const fact = makeReadModel(null)

    expect(selectPrevYearSummaryFromFreePeriod(fact)).toEqual(extractLegacy(legacy))
  })

  it('複数 fixture セットで parity が崩れない (regression matrix)', () => {
    const cases: { sales: number; customers: number }[] = [
      { sales: 100, customers: 1 },
      { sales: 1, customers: 1 },
      { sales: 999_999_999, customers: 1_000_000 },
      { sales: 50_000, customers: 250 },
    ]
    for (const c of cases) {
      const legacy: LegacyPrevYearShape = {
        hasPrevYear: true,
        totalSales: c.sales,
        totalCustomers: c.customers,
        prevYearMonthlySales: c.sales,
      }
      const fact = makeReadModel({ totalSales: c.sales, totalCustomers: c.customers })
      expect(selectPrevYearSummaryFromFreePeriod(fact)).toEqual(extractLegacy(legacy))
    }
  })
})
