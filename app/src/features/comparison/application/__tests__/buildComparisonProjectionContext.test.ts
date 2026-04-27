/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import { buildComparisonProjectionContext } from '../buildComparisonProjectionContext'
import type { PeriodSelection } from '@/domain/models/PeriodSelection'
import type { DateRange } from '@/domain/models/CalendarDate'

function makePeriodSelection(overrides?: Partial<PeriodSelection>): PeriodSelection {
  return {
    period1: {
      from: { year: 2026, month: 4, day: 1 },
      to: { year: 2026, month: 4, day: 30 },
    },
    period2: {
      from: { year: 2025, month: 4, day: 1 },
      to: { year: 2025, month: 4, day: 30 },
    },
    comparisonEnabled: true,
    activePreset: 'prevYearSameMonth' as const,
    ...overrides,
  }
}

describe('buildComparisonProjectionContext', () => {
  it('extracts basisYear and basisMonth from period1.from', () => {
    const ps = makePeriodSelection({
      period1: {
        from: { year: 2026, month: 4, day: 1 },
        to: { year: 2026, month: 4, day: 30 },
      },
    })
    const ctx = buildComparisonProjectionContext(ps)
    expect(ctx.basisYear).toBe(2026)
    expect(ctx.basisMonth).toBe(4)
  })

  it('passes through period2 as-is', () => {
    const period2: DateRange = {
      from: { year: 2025, month: 3, day: 15 },
      to: { year: 2025, month: 4, day: 14 },
    }
    const ps = makePeriodSelection({ period2 })
    const ctx = buildComparisonProjectionContext(ps)
    expect(ctx.period2).toBe(period2)
  })

  it('handles elapsedDays-capped period1 (month not starting from day 1)', () => {
    const ps = makePeriodSelection({
      period1: {
        from: { year: 2026, month: 4, day: 1 },
        to: { year: 2026, month: 4, day: 15 },
      },
    })
    const ctx = buildComparisonProjectionContext(ps)
    expect(ctx.basisYear).toBe(2026)
    expect(ctx.basisMonth).toBe(4)
  })

  it('handles year boundary (December)', () => {
    const ps = makePeriodSelection({
      period1: {
        from: { year: 2025, month: 12, day: 1 },
        to: { year: 2025, month: 12, day: 31 },
      },
      period2: {
        from: { year: 2024, month: 12, day: 1 },
        to: { year: 2024, month: 12, day: 31 },
      },
    })
    const ctx = buildComparisonProjectionContext(ps)
    expect(ctx.basisYear).toBe(2025)
    expect(ctx.basisMonth).toBe(12)
    expect(ctx.period2.from.year).toBe(2024)
  })

  it('handles February leap year', () => {
    const ps = makePeriodSelection({
      period1: {
        from: { year: 2024, month: 2, day: 1 },
        to: { year: 2024, month: 2, day: 29 },
      },
      period2: {
        from: { year: 2023, month: 2, day: 1 },
        to: { year: 2023, month: 2, day: 28 },
      },
    })
    const ctx = buildComparisonProjectionContext(ps)
    expect(ctx.basisYear).toBe(2024)
    expect(ctx.basisMonth).toBe(2)
  })

  it('ignores activePreset (not included in context)', () => {
    const ps = makePeriodSelection({ activePreset: 'prevYearSameDow' })
    const ctx = buildComparisonProjectionContext(ps)
    expect(ctx).not.toHaveProperty('activePreset')
  })

  it('ignores comparisonEnabled (not included in context)', () => {
    const ps = makePeriodSelection({ comparisonEnabled: false })
    const ctx = buildComparisonProjectionContext(ps)
    expect(ctx).not.toHaveProperty('comparisonEnabled')
  })

  it('returns exactly 3 fields (no field creep)', () => {
    const ps = makePeriodSelection()
    const ctx = buildComparisonProjectionContext(ps)
    expect(Object.keys(ctx)).toHaveLength(3)
    expect(Object.keys(ctx).sort()).toEqual(['basisMonth', 'basisYear', 'period2'])
  })
})
