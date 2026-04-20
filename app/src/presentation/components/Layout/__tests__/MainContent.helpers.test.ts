/**
 * MainContent — formatDateRange tests
 *
 * 検証対象:
 * - 同一月内: 'YYYY/M/D〜D'
 * - 月またぎ: 'YYYY/M/D〜YYYY/M/D'
 */
import { describe, it, expect } from 'vitest'
import { formatDateRange } from '../MainContent'

describe('formatDateRange', () => {
  it('同じ月内の範囲を short 形式で返す', () => {
    expect(
      formatDateRange({
        from: { year: 2026, month: 3, day: 1 },
        to: { year: 2026, month: 3, day: 31 },
      }),
    ).toBe('2026/3/1〜31')
  })

  it('月をまたぐ範囲は full 形式', () => {
    expect(
      formatDateRange({
        from: { year: 2026, month: 3, day: 15 },
        to: { year: 2026, month: 4, day: 10 },
      }),
    ).toBe('2026/3/15〜2026/4/10')
  })

  it('年をまたぐ範囲は full 形式', () => {
    expect(
      formatDateRange({
        from: { year: 2025, month: 12, day: 20 },
        to: { year: 2026, month: 1, day: 15 },
      }),
    ).toBe('2025/12/20〜2026/1/15')
  })

  it('同一日の範囲も short 形式（同月同日）', () => {
    expect(
      formatDateRange({
        from: { year: 2026, month: 3, day: 15 },
        to: { year: 2026, month: 3, day: 15 },
      }),
    ).toBe('2026/3/15〜15')
  })

  it('ゼロパディングされない（1 桁の月/日はそのまま）', () => {
    expect(
      formatDateRange({
        from: { year: 2026, month: 1, day: 1 },
        to: { year: 2026, month: 1, day: 9 },
      }),
    ).toBe('2026/1/1〜9')
  })
})
