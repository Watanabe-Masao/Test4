/**
 * ComparisonScopeSchema — runtime 契約 tests
 */
import { describe, it, expect } from 'vitest'
import { ComparisonScopeSchema } from '../ComparisonScopeSchema'

const validScope = {
  period1: {
    from: { year: 2026, month: 3, day: 1 },
    to: { year: 2026, month: 3, day: 31 },
  },
  period2: {
    from: { year: 2025, month: 3, day: 1 },
    to: { year: 2025, month: 3, day: 31 },
  },
  preset: 'prevYearSameMonth',
  alignmentMode: 'sameDate',
  dowOffset: 0,
  effectivePeriod1: {
    from: { year: 2026, month: 3, day: 1 },
    to: { year: 2026, month: 3, day: 31 },
  },
  effectivePeriod2: {
    from: { year: 2025, month: 3, day: 1 },
    to: { year: 2025, month: 3, day: 31 },
  },
  queryRanges: [{ year: 2025, month: 3 }],
  alignmentMap: [
    {
      currentDate: { year: 2026, month: 3, day: 1 },
      sourceDate: { year: 2025, month: 3, day: 1 },
    },
  ],
  sourceMonth: { year: 2025, month: 3 },
}

describe('ComparisonScopeSchema', () => {
  it('有効な ComparisonScope を受け入れる', () => {
    const r = ComparisonScopeSchema.safeParse(validScope)
    expect(r.success).toBe(true)
  })

  it("alignmentMode が 'sameDate' / 'sameDayOfWeek' 以外を拒否", () => {
    const r = ComparisonScopeSchema.safeParse({ ...validScope, alignmentMode: 'invalid' })
    expect(r.success).toBe(false)
  })

  it('dowOffset < 0 を拒否', () => {
    const r = ComparisonScopeSchema.safeParse({ ...validScope, dowOffset: -1 })
    expect(r.success).toBe(false)
  })

  it('dowOffset > 6 を拒否', () => {
    const r = ComparisonScopeSchema.safeParse({ ...validScope, dowOffset: 7 })
    expect(r.success).toBe(false)
  })

  it('month < 1 を拒否', () => {
    const r = ComparisonScopeSchema.safeParse({
      ...validScope,
      period1: {
        from: { year: 2026, month: 0, day: 1 },
        to: { year: 2026, month: 3, day: 31 },
      },
    })
    expect(r.success).toBe(false)
  })

  it('month > 12 を拒否', () => {
    const r = ComparisonScopeSchema.safeParse({
      ...validScope,
      period1: {
        from: { year: 2026, month: 13, day: 1 },
        to: { year: 2026, month: 3, day: 31 },
      },
    })
    expect(r.success).toBe(false)
  })

  it('day > 31 を拒否', () => {
    const r = ComparisonScopeSchema.safeParse({
      ...validScope,
      period1: {
        from: { year: 2026, month: 3, day: 32 },
        to: { year: 2026, month: 3, day: 31 },
      },
    })
    expect(r.success).toBe(false)
  })

  it('必須フィールド欠落を拒否', () => {
    const rest = { ...validScope } as Partial<typeof validScope>
    delete rest.alignmentMode
    expect(ComparisonScopeSchema.safeParse(rest).success).toBe(false)
  })

  it('sameDayOfWeek も有効', () => {
    const r = ComparisonScopeSchema.safeParse({ ...validScope, alignmentMode: 'sameDayOfWeek' })
    expect(r.success).toBe(true)
  })

  it('alignmentMap 空配列も有効', () => {
    const r = ComparisonScopeSchema.safeParse({ ...validScope, alignmentMap: [] })
    expect(r.success).toBe(true)
  })

  it('queryRanges 複数月を受け入れる', () => {
    const r = ComparisonScopeSchema.safeParse({
      ...validScope,
      queryRanges: [
        { year: 2025, month: 2 },
        { year: 2025, month: 3 },
      ],
    })
    expect(r.success).toBe(true)
  })
})
