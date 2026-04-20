/**
 * prevYearAlignment — alignPrevYearDay tests
 */
import { describe, it, expect } from 'vitest'
import { alignPrevYearDay } from '../prevYearAlignment'

describe('alignPrevYearDay', () => {
  it('前年の同日（経過日数 0）は curFromDay と同じ', () => {
    expect(
      alignPrevYearDay('2025-03-01', { year: 2025, month: 3, day: 1 }, 1),
    ).toBe(1)
  })

  it('前年から経過日数だけ進めた当年日番号を返す', () => {
    // prev=2025-03-15, prevFrom=2025-03-01 → 経過14日 → curFromDay=1 + 14 = 15
    expect(
      alignPrevYearDay('2025-03-15', { year: 2025, month: 3, day: 1 }, 1),
    ).toBe(15)
  })

  it('curFromDay を加算する', () => {
    expect(
      alignPrevYearDay('2025-03-01', { year: 2025, month: 3, day: 1 }, 5),
    ).toBe(5)
    expect(
      alignPrevYearDay('2025-03-10', { year: 2025, month: 3, day: 1 }, 5),
    ).toBe(14) // 5 + 9
  })

  it('月をまたぐ前年範囲も日数差で算出', () => {
    // 2025-04-05 - 2025-03-25 = 11日
    expect(
      alignPrevYearDay('2025-04-05', { year: 2025, month: 3, day: 25 }, 1),
    ).toBe(12) // 1 + 11
  })

  it('うるう年（2028-02-29）も正しく扱う', () => {
    // 2028-02-29 - 2028-02-01 = 28日
    expect(
      alignPrevYearDay('2028-02-29', { year: 2028, month: 2, day: 1 }, 1),
    ).toBe(29)
  })

  it('範囲外の日付（負の経過日数）も外挿される', () => {
    // 2025-02-25 < 2025-03-01 → 経過 -4日 → curFromDay=1 + -4 = -3
    expect(
      alignPrevYearDay('2025-02-25', { year: 2025, month: 3, day: 1 }, 1),
    ).toBe(-3)
  })
})
