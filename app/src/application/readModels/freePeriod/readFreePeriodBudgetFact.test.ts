/**
 * @taxonomyKind T:zod-contract
 */

import { describe, it, expect } from 'vitest'
import { prorateBudgetForPeriod } from './readFreePeriodBudgetFact'

describe('prorateBudgetForPeriod', () => {
  it('月全体なら按分なし（100%）', () => {
    const result = prorateBudgetForPeriod(310000, 2025, 3, '2025-03-01', '2025-03-31')
    expect(result.proratedBudget).toBeCloseTo(310000, 0)
    expect(result.dayCount).toBe(31)
  })

  it('月の前半10日のみ', () => {
    const result = prorateBudgetForPeriod(310000, 2025, 3, '2025-03-01', '2025-03-10')
    // 310000 / 31 * 10 = 100000
    expect(result.proratedBudget).toBeCloseTo(100000, 0)
    expect(result.dayCount).toBe(10)
  })

  it('月跨ぎ — 3月分のみ抽出', () => {
    // 期間: 3/25〜4/5 のうち、3月分だけ
    const result = prorateBudgetForPeriod(310000, 2025, 3, '2025-03-25', '2025-04-05')
    // 310000 / 31 * 7 (25-31) = 70000
    expect(result.proratedBudget).toBeCloseTo(70000, 0)
    expect(result.dayCount).toBe(7)
  })

  it('月跨ぎ — 4月分のみ抽出', () => {
    const result = prorateBudgetForPeriod(300000, 2025, 4, '2025-03-25', '2025-04-05')
    // 300000 / 30 * 5 (1-5) = 50000
    expect(result.proratedBudget).toBeCloseTo(50000, 0)
    expect(result.dayCount).toBe(5)
  })

  it('対象外の月は 0', () => {
    const result = prorateBudgetForPeriod(310000, 2025, 5, '2025-03-01', '2025-03-31')
    expect(result.proratedBudget).toBe(0)
    expect(result.dayCount).toBe(0)
  })

  it('2月（28日）の按分', () => {
    const result = prorateBudgetForPeriod(280000, 2025, 2, '2025-02-01', '2025-02-14')
    // 280000 / 28 * 14 = 140000
    expect(result.proratedBudget).toBeCloseTo(140000, 0)
    expect(result.dayCount).toBe(14)
  })

  it('leap year 2月（29日）の按分', () => {
    const result = prorateBudgetForPeriod(290000, 2024, 2, '2024-02-01', '2024-02-29')
    expect(result.proratedBudget).toBeCloseTo(290000, 0)
    expect(result.dayCount).toBe(29)
  })

  it('予算 0 なら按分も 0', () => {
    const result = prorateBudgetForPeriod(0, 2025, 3, '2025-03-01', '2025-03-31')
    expect(result.proratedBudget).toBe(0)
    expect(result.dayCount).toBe(31)
  })
})
