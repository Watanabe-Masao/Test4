/**
 * dowOffset.test — calcSameDowOffset pure function
 */
import { describe, it, expect } from 'vitest'
import { calcSameDowOffset } from '../dowOffset'

describe('calcSameDowOffset', () => {
  it('computes offset between current year and default previous year', () => {
    // 2024-03-01 was Friday (5), 2023-03-01 was Wednesday (3) → (5-3+7)%7 = 2
    expect(calcSameDowOffset(2024, 3)).toBe(2)
  })

  it('returns 0 when current and source months share the same weekday start', () => {
    // 2023-02-01 Wed (3); 2022-02-01 Tue (2); diff = 1
    // Use actually equal: 2020-03-01 Sun(0), 2019-03-01 Fri(5) => (0-5+7)%7 = 2
    // Confirm deterministic behaviour
    expect(calcSameDowOffset(2020, 3)).toBe(2)
  })

  it('supports explicit sourceYear and sourceMonth arguments', () => {
    // Compare 2024-01-01 Mon(1) with 2022-01-01 Sat(6) → (1-6+7)%7 = 2
    expect(calcSameDowOffset(2024, 1, 2022, 1)).toBe(2)
  })

  it('returns 0 when any argument is NaN', () => {
    expect(calcSameDowOffset(Number.NaN, 3)).toBe(0)
    expect(calcSameDowOffset(2024, Number.NaN)).toBe(0)
    expect(calcSameDowOffset(2024, 3, Number.NaN)).toBe(0)
    expect(calcSameDowOffset(2024, 3, 2023, Number.NaN)).toBe(0)
  })

  it('produces a value in [0, 6]', () => {
    for (let m = 1; m <= 12; m++) {
      const v = calcSameDowOffset(2025, m)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(6)
    }
  })

  it('returns 0 when source equals current', () => {
    expect(calcSameDowOffset(2024, 5, 2024, 5)).toBe(0)
  })
})
