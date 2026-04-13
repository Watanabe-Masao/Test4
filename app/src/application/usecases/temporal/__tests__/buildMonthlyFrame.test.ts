import { describe, it, expect } from 'vitest'
import { buildMonthlyFrame } from '../buildMonthlyFrame'
import type { MonthlyContext } from '@/domain/models/temporal'

describe('buildMonthlyFrame', () => {
  it('generates a monthly frame with first to last day (31-day month)', () => {
    const ctx: MonthlyContext = {
      kind: 'monthly' as const,
      year: 2024,
      month: 1,
      storeIds: ['s1', 's2'],
    }
    const frame = buildMonthlyFrame(ctx)
    expect(frame.kind).toBe('monthly-frame')
    expect(frame.monthRange.from).toEqual({ year: 2024, month: 1, day: 1 })
    expect(frame.monthRange.to).toEqual({ year: 2024, month: 1, day: 31 })
    expect(frame.storeIds).toEqual(['s1', 's2'])
    expect(frame.missingnessPolicy).toBe('strict')
  })

  it('handles 30-day month (April)', () => {
    const frame = buildMonthlyFrame({ kind: 'monthly' as const, year: 2024, month: 4, storeIds: [] })
    expect(frame.monthRange.to.day).toBe(30)
    expect(frame.storeIds).toEqual([])
  })

  it('handles February leap year', () => {
    const frame = buildMonthlyFrame({ kind: 'monthly' as const, year: 2024, month: 2, storeIds: ['x'] })
    expect(frame.monthRange.to.day).toBe(29)
  })

  it('handles February non-leap year', () => {
    const frame = buildMonthlyFrame({ kind: 'monthly' as const, year: 2023, month: 2, storeIds: ['x'] })
    expect(frame.monthRange.to.day).toBe(28)
  })

  it('handles December (month 12)', () => {
    const frame = buildMonthlyFrame({ kind: 'monthly' as const, year: 2024, month: 12, storeIds: [] })
    expect(frame.monthRange.from.month).toBe(12)
    expect(frame.monthRange.to.month).toBe(12)
    expect(frame.monthRange.to.day).toBe(31)
  })
})
