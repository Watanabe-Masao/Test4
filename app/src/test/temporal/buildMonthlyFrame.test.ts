/**
 * buildMonthlyFrame テスト
 *
 * PeriodSelection.lastDayOfMonth と同一規則（new Date(year, month, 0).getDate()）で
 * inclusive DateRange を生成することを検証する。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { buildMonthlyFrame } from '@/application/usecases/temporal'
import type { MonthlyContext } from '@/domain/models/temporal'

describe('buildMonthlyFrame', () => {
  it('2026-03 → 2026-03-01..2026-03-31（31日月）', () => {
    const ctx: MonthlyContext = { kind: 'monthly', year: 2026, month: 3, storeIds: ['S001'] }
    const frame = buildMonthlyFrame(ctx)

    expect(frame.kind).toBe('monthly-frame')
    expect(frame.monthRange.from).toEqual({ year: 2026, month: 3, day: 1 })
    expect(frame.monthRange.to).toEqual({ year: 2026, month: 3, day: 31 })
  })

  it('2028-02（閏年）→ 2028-02-01..2028-02-29', () => {
    const ctx: MonthlyContext = { kind: 'monthly', year: 2028, month: 2, storeIds: [] }
    const frame = buildMonthlyFrame(ctx)

    expect(frame.monthRange.to).toEqual({ year: 2028, month: 2, day: 29 })
  })

  it('storeIds が保持される', () => {
    const ctx: MonthlyContext = { kind: 'monthly', year: 2026, month: 1, storeIds: ['A', 'B', 'C'] }
    const frame = buildMonthlyFrame(ctx)

    expect(frame.storeIds).toEqual(['A', 'B', 'C'])
  })

  it('missingnessPolicy が strict である', () => {
    const ctx: MonthlyContext = { kind: 'monthly', year: 2026, month: 6, storeIds: [] }
    const frame = buildMonthlyFrame(ctx)

    expect(frame.missingnessPolicy).toBe('strict')
  })
})
