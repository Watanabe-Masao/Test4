/**
 * selectPrevYearSummaryFromFreePeriod — unit + parity tests
 *
 * Phase 6 Step A:
 * 1. selector が `comparisonSummary` から正しい射影を返すことを unit で固定
 * 2. legacy adapter が旧 prev-year shape から同じ projection 型を返すことを固定
 * 3. composer (`preferFreePeriodPrevYearSummary`) が freePeriod 優先 +
 *    legacy fallback を正しく実装することを固定
 * 4. legacy / freePeriod 両 source の値が「同じ期間に対する同じ集計」を
 *    表しているとき、4 フィールドが完全一致する **parity** を fixture matrix
 *    で固定 (Step A 差し替えの安全網)
 *
 * 本テストは 2 つの shape の構造変換が一致することを保証するもので、ランタイムの
 * データ source が一致することは保証しない (それは acceptance suite の役割)。
 *
 * @taxonomyKind T:null-path
 */
import { describe, it, expect } from 'vitest'
import {
  selectPrevYearSummaryFromFreePeriod,
  selectPrevYearSummaryFromLegacy,
  preferFreePeriodPrevYearSummary,
  type PrevYearSummaryProjection,
  type LegacyPrevYearSummaryInput,
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

// ── unit: selectPrevYearSummaryFromFreePeriod ──────────────

describe('selectPrevYearSummaryFromFreePeriod — unit', () => {
  it('null fact のときは NONE projection を返す (source=none)', () => {
    const result = selectPrevYearSummaryFromFreePeriod(null)
    expect(result).toEqual<PrevYearSummaryProjection>({
      hasPrevYear: false,
      totalSales: 0,
      totalCustomers: 0,
      prevYearMonthlySales: 0,
      source: 'none',
    })
  })

  it('comparisonSummary が null のときは NONE projection を返す', () => {
    const fact = makeReadModel(null)
    const result = selectPrevYearSummaryFromFreePeriod(fact)
    expect(result.hasPrevYear).toBe(false)
    expect(result.source).toBe('none')
  })

  it('comparisonSummary.totalSales が 0 のときは hasPrevYear=false (前年データ実質なし)', () => {
    const fact = makeReadModel({ totalSales: 0, totalCustomers: 100 })
    const result = selectPrevYearSummaryFromFreePeriod(fact)
    expect(result.hasPrevYear).toBe(false)
    expect(result.totalSales).toBe(0)
    expect(result.source).toBe('none')
  })

  it('comparisonSummary が valid のときは 5 フィールドを射影する (source=freePeriod)', () => {
    const fact = makeReadModel({ totalSales: 800_000, totalCustomers: 4_200 })
    const result = selectPrevYearSummaryFromFreePeriod(fact)
    expect(result).toEqual<PrevYearSummaryProjection>({
      hasPrevYear: true,
      totalSales: 800_000,
      totalCustomers: 4_200,
      prevYearMonthlySales: 800_000,
      source: 'freePeriod',
    })
  })

  it('totalSales と prevYearMonthlySales は同じ値を指す (旧命名 alias)', () => {
    const fact = makeReadModel({ totalSales: 1_234_567, totalCustomers: 9_999 })
    const result = selectPrevYearSummaryFromFreePeriod(fact)
    expect(result.prevYearMonthlySales).toBe(result.totalSales)
  })
})

// ── unit: selectPrevYearSummaryFromLegacy ──────────────────

describe('selectPrevYearSummaryFromLegacy — unit', () => {
  it('null input のときは NONE projection を返す', () => {
    const result = selectPrevYearSummaryFromLegacy(null)
    expect(result.source).toBe('none')
    expect(result.hasPrevYear).toBe(false)
  })

  it('hasPrevYear=false のときは NONE projection を返す', () => {
    const result = selectPrevYearSummaryFromLegacy({
      hasPrevYear: false,
      totalSales: 0,
      totalCustomers: 0,
      prevYearMonthlySales: 0,
    })
    expect(result.source).toBe('none')
  })

  it('totalSales=0 のときは NONE projection を返す (空 prev year を排除)', () => {
    const result = selectPrevYearSummaryFromLegacy({
      hasPrevYear: true,
      totalSales: 0,
      totalCustomers: 100,
      prevYearMonthlySales: 0,
    })
    expect(result.source).toBe('none')
  })

  it('valid 入力のときは source=legacy で 5 フィールドを返す', () => {
    const input: LegacyPrevYearSummaryInput = {
      hasPrevYear: true,
      totalSales: 750_000,
      totalCustomers: 3_500,
      prevYearMonthlySales: 750_000,
    }
    const result = selectPrevYearSummaryFromLegacy(input)
    expect(result).toEqual<PrevYearSummaryProjection>({
      hasPrevYear: true,
      totalSales: 750_000,
      totalCustomers: 3_500,
      prevYearMonthlySales: 750_000,
      source: 'legacy',
    })
  })
})

// ── unit: preferFreePeriodPrevYearSummary ──────────────────

describe('preferFreePeriodPrevYearSummary — composer', () => {
  it('fp.hasPrevYear=true のときは fp をそのまま返す (source=freePeriod)', () => {
    const fp = selectPrevYearSummaryFromFreePeriod(
      makeReadModel({ totalSales: 100, totalCustomers: 1 }),
    )
    const legacy = selectPrevYearSummaryFromLegacy({
      hasPrevYear: true,
      totalSales: 999,
      totalCustomers: 9,
      prevYearMonthlySales: 999,
    })
    const result = preferFreePeriodPrevYearSummary(fp, legacy)
    expect(result.source).toBe('freePeriod')
    expect(result.totalSales).toBe(100)
  })

  it('fp.hasPrevYear=false のときは legacy にフォールバック (source=legacy)', () => {
    const fp = selectPrevYearSummaryFromFreePeriod(null)
    const legacy = selectPrevYearSummaryFromLegacy({
      hasPrevYear: true,
      totalSales: 500,
      totalCustomers: 5,
      prevYearMonthlySales: 500,
    })
    const result = preferFreePeriodPrevYearSummary(fp, legacy)
    expect(result.source).toBe('legacy')
    expect(result.totalSales).toBe(500)
  })

  it('両方 NONE のときは NONE を返す (source=none)', () => {
    const fp = selectPrevYearSummaryFromFreePeriod(null)
    const legacy = selectPrevYearSummaryFromLegacy(null)
    const result = preferFreePeriodPrevYearSummary(fp, legacy)
    expect(result.source).toBe('none')
    expect(result.hasPrevYear).toBe(false)
  })
})

// ── parity ────────────────────────────────────────────────

describe('parity — legacy ↔ freePeriod が同一期間で 4 フィールド一致する', () => {
  /** parity 比較で source 以外の 4 フィールドだけ取り出す */
  function valuesOnly(p: PrevYearSummaryProjection) {
    return {
      hasPrevYear: p.hasPrevYear,
      totalSales: p.totalSales,
      totalCustomers: p.totalCustomers,
      prevYearMonthlySales: p.prevYearMonthlySales,
    }
  }

  it('同一期間の同一集計値が legacy と freePeriod 両表現で 4 フィールド一致する', () => {
    const totalSales = 950_000
    const totalCustomers = 4_800

    const fromLegacy = selectPrevYearSummaryFromLegacy({
      hasPrevYear: true,
      totalSales,
      totalCustomers,
      prevYearMonthlySales: totalSales,
    })
    const fromFreePeriod = selectPrevYearSummaryFromFreePeriod(
      makeReadModel({ totalSales, totalCustomers }),
    )

    expect(valuesOnly(fromLegacy)).toEqual(valuesOnly(fromFreePeriod))
    // source タグだけは異なる (debug 用)
    expect(fromLegacy.source).toBe('legacy')
    expect(fromFreePeriod.source).toBe('freePeriod')
  })

  it('hasPrevYear=false の場合も両表現で完全一致 (source=none も含めて等しい)', () => {
    const fromLegacy = selectPrevYearSummaryFromLegacy(null)
    const fromFreePeriod = selectPrevYearSummaryFromFreePeriod(makeReadModel(null))
    expect(fromLegacy).toEqual(fromFreePeriod)
    expect(fromLegacy.source).toBe('none')
  })

  it('複数 fixture セットで parity が崩れない (regression matrix)', () => {
    const cases: { sales: number; customers: number }[] = [
      { sales: 100, customers: 1 },
      { sales: 1, customers: 1 },
      { sales: 999_999_999, customers: 1_000_000 },
      { sales: 50_000, customers: 250 },
    ]
    for (const c of cases) {
      const fromLegacy = selectPrevYearSummaryFromLegacy({
        hasPrevYear: true,
        totalSales: c.sales,
        totalCustomers: c.customers,
        prevYearMonthlySales: c.sales,
      })
      const fromFreePeriod = selectPrevYearSummaryFromFreePeriod(
        makeReadModel({ totalSales: c.sales, totalCustomers: c.customers }),
      )
      expect(valuesOnly(fromLegacy)).toEqual(valuesOnly(fromFreePeriod))
    }
  })
})
