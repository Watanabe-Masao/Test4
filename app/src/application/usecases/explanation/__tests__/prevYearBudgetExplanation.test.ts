/**
 * generatePrevYearBudgetExplanations 不変条件テスト
 *
 * 検証する不変条件:
 *   1. breakdown の日別売上合計 === entry.sales（ドリルダウンと合計の一致）
 *   2. evidenceRefs にすべての storeContribution が含まれる
 *   3. evidenceRefs に budget 参照が含まれる
 *   4. explanation.value === sales / budget（計算の再現性）
 *   5. hasPrevYear=false または budget≤0 → 空 Map
 */
import { describe, it, expect } from 'vitest'
import { generatePrevYearBudgetExplanations } from '../prevYearBudgetExplanation'
import type {
  PrevYearMonthlyKpi,
  PrevYearMonthlyKpiEntry,
} from '@/application/hooks/usePrevYearMonthlyKpi'
import { safeDivide } from '@/domain/calculations/utils'

// ── テストデータ ──

function makeEntry(overrides?: Partial<PrevYearMonthlyKpiEntry>): PrevYearMonthlyKpiEntry {
  return {
    sales: 500000,
    customers: 250,
    transactionValue: 2000,
    dailyMapping: [
      { prevDay: 1, currentDay: 1, prevSales: 100000, prevCustomers: 50 },
      { prevDay: 2, currentDay: 2, prevSales: 120000, prevCustomers: 60 },
      { prevDay: 3, currentDay: 3, prevSales: 80000, prevCustomers: 40 },
      { prevDay: 15, currentDay: 15, prevSales: 200000, prevCustomers: 100 },
    ],
    storeContributions: [
      { storeId: 'S1', originalDay: 1, mappedDay: 1, sales: 60000, customers: 30 },
      { storeId: 'S2', originalDay: 1, mappedDay: 1, sales: 40000, customers: 20 },
      { storeId: 'S1', originalDay: 2, mappedDay: 2, sales: 120000, customers: 60 },
      { storeId: 'S1', originalDay: 3, mappedDay: 3, sales: 80000, customers: 40 },
      { storeId: 'S1', originalDay: 15, mappedDay: 15, sales: 200000, customers: 100 },
    ],
    ...overrides,
  }
}

function makePk(
  sameDow?: PrevYearMonthlyKpiEntry,
  sameDate?: PrevYearMonthlyKpiEntry,
): PrevYearMonthlyKpi {
  const entry = makeEntry()
  return {
    hasPrevYear: true,
    sameDow: sameDow ?? entry,
    sameDate: sameDate ?? entry,
    sourceYear: 2025,
    sourceMonth: 3,
    dowOffset: 1,
  }
}

const BUDGET = 600000
const BUDGET_DAILY = new Map<number, number>([
  [1, 20000],
  [2, 20000],
  [3, 20000],
  [15, 20000],
])

describe('generatePrevYearBudgetExplanations 不変条件', () => {
  it('不変条件1: breakdown の details 内「前年売上実績」合計 === entry.sales（同曜日）', () => {
    const result = generatePrevYearBudgetExplanations({
      prevYearMonthlyKpi: makePk(),
      budget: BUDGET,
      budgetDaily: BUDGET_DAILY,
      storeId: 'S1',
      year: 2026,
      month: 3,
    })
    const explanation = result.get('prevYearSameDowBudgetRatio')!
    const breakdownSum = explanation.breakdown!.reduce((s, b) => {
      const salesDetail = b.details?.find((d) => d.label === '前年売上実績')
      return s + (salesDetail?.value ?? 0)
    }, 0)
    expect(breakdownSum).toBe(makeEntry().sales)
  })

  it('不変条件1: breakdown の details 内「前年売上実績」合計 === entry.sales（同日）', () => {
    const result = generatePrevYearBudgetExplanations({
      prevYearMonthlyKpi: makePk(),
      budget: BUDGET,
      budgetDaily: BUDGET_DAILY,
      storeId: 'S1',
      year: 2026,
      month: 3,
    })
    const explanation = result.get('prevYearSameDateBudgetRatio')!
    const breakdownSum = explanation.breakdown!.reduce((s, b) => {
      const salesDetail = b.details?.find((d) => d.label === '前年売上実績')
      return s + (salesDetail?.value ?? 0)
    }, 0)
    expect(breakdownSum).toBe(makeEntry().sales)
  })

  it('不変条件2: evidenceRefs に全 storeContribution が含まれる', () => {
    const entry = makeEntry()
    const result = generatePrevYearBudgetExplanations({
      prevYearMonthlyKpi: makePk(entry),
      budget: BUDGET,
      budgetDaily: BUDGET_DAILY,
      storeId: 'S1',
      year: 2026,
      month: 3,
    })
    const explanation = result.get('prevYearSameDowBudgetRatio')!
    const dailyRefs = explanation.evidenceRefs.filter((r) => r.kind === 'daily')
    // storeContributions の数と一致
    expect(dailyRefs).toHaveLength(entry.storeContributions.length)
    // 各 contribution の storeId + originalDay が evidenceRef に存在
    for (const c of entry.storeContributions) {
      const found = dailyRefs.some(
        (r) => r.kind === 'daily' && r.storeId === c.storeId && r.day === c.originalDay,
      )
      expect(found).toBe(true)
    }
  })

  it('不変条件3: evidenceRefs に budget 参照が含まれる', () => {
    const result = generatePrevYearBudgetExplanations({
      prevYearMonthlyKpi: makePk(),
      budget: BUDGET,
      budgetDaily: BUDGET_DAILY,
      storeId: 'S1',
      year: 2026,
      month: 3,
    })
    for (const metricId of ['prevYearSameDowBudgetRatio', 'prevYearSameDateBudgetRatio'] as const) {
      const explanation = result.get(metricId)!
      const budgetRefs = explanation.evidenceRefs.filter(
        (r) => r.kind === 'aggregate' && r.dataType === 'budget',
      )
      expect(budgetRefs.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('不変条件4: explanation.value === safeDivide(sales, budget)', () => {
    const entry = makeEntry()
    const result = generatePrevYearBudgetExplanations({
      prevYearMonthlyKpi: makePk(entry),
      budget: BUDGET,
      budgetDaily: BUDGET_DAILY,
      storeId: 'S1',
      year: 2026,
      month: 3,
    })
    const explanation = result.get('prevYearSameDowBudgetRatio')!
    expect(explanation.value).toBe(safeDivide(entry.sales, BUDGET, 0))
  })

  it('不変条件5: hasPrevYear=false → 空 Map', () => {
    const pk: PrevYearMonthlyKpi = {
      ...makePk(),
      hasPrevYear: false,
    }
    const result = generatePrevYearBudgetExplanations({
      prevYearMonthlyKpi: pk,
      budget: BUDGET,
      budgetDaily: BUDGET_DAILY,
      storeId: 'S1',
      year: 2026,
      month: 3,
    })
    expect(result.size).toBe(0)
  })

  it('不変条件5: budget=0 → 空 Map', () => {
    const result = generatePrevYearBudgetExplanations({
      prevYearMonthlyKpi: makePk(),
      budget: 0,
      budgetDaily: BUDGET_DAILY,
      storeId: 'S1',
      year: 2026,
      month: 3,
    })
    expect(result.size).toBe(0)
  })

  it('breakdown の各 details に前年売上・客数・客単価・当年予算が含まれる', () => {
    const result = generatePrevYearBudgetExplanations({
      prevYearMonthlyKpi: makePk(),
      budget: BUDGET,
      budgetDaily: BUDGET_DAILY,
      storeId: 'S1',
      year: 2026,
      month: 3,
    })
    const explanation = result.get('prevYearSameDowBudgetRatio')!
    for (const b of explanation.breakdown!) {
      expect(b.details).toBeDefined()
      const labels = b.details!.map((d) => d.label)
      expect(labels).toContain('前年売上実績')
      expect(labels).toContain('前年客数')
      expect(labels).toContain('前年客単価')
      expect(labels).toContain('対象日当年予算')
      expect(labels).toContain('予算対比')
    }
  })

  it('2つの MetricId が正しく生成される', () => {
    const result = generatePrevYearBudgetExplanations({
      prevYearMonthlyKpi: makePk(),
      budget: BUDGET,
      budgetDaily: BUDGET_DAILY,
      storeId: 'S1',
      year: 2026,
      month: 3,
    })
    expect(result.has('prevYearSameDowBudgetRatio')).toBe(true)
    expect(result.has('prevYearSameDateBudgetRatio')).toBe(true)
    expect(result.size).toBe(2)
  })
})
