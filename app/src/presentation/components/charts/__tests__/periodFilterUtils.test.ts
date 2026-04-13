/**
 * periodFilterUtils.ts — countDowInRange tests
 *
 * Other exports are re-exports from domain/calculations/divisor and are
 * tested in their canonical location.
 */
import { describe, it, expect } from 'vitest'
import { countDowInRange } from '../periodFilterUtils'

describe('countDowInRange', () => {
  it('counts each DOW 4 times for a standard 28-day February (2026)', () => {
    // 2026年2月は非閏年で28日。全DOWは4回ずつ。
    const m = countDowInRange(2026, 2, 1, 28)
    expect(m.size).toBe(7)
    for (const v of m.values()) expect(v).toBe(4)
  })

  it('handles leap-year Feb 2024 with one DOW having 5 occurrences', () => {
    const m = countDowInRange(2024, 2, 1, 29)
    const total = [...m.values()].reduce((s, v) => s + v, 0)
    expect(total).toBe(29)
    // ちょうど1つの曜日だけ5回
    const fives = [...m.values()].filter((v) => v === 5).length
    expect(fives).toBe(1)
  })

  it('respects from/to bounds', () => {
    const m = countDowInRange(2026, 1, 1, 7)
    const total = [...m.values()].reduce((s, v) => s + v, 0)
    expect(total).toBe(7)
  })

  it('returns single-day map when from=to', () => {
    const m = countDowInRange(2026, 1, 1, 1)
    const total = [...m.values()].reduce((s, v) => s + v, 0)
    expect(total).toBe(1)
  })

  it('returns empty map when from > to', () => {
    const m = countDowInRange(2026, 1, 10, 5)
    expect(m.size).toBe(0)
  })

  it('computes real DOW (2026-01-01 is Thursday = 4)', () => {
    const m = countDowInRange(2026, 1, 1, 1)
    expect(m.get(4)).toBe(1)
  })
})
