import { describe, it, expect } from 'vitest'
import { buildMappingPreview, buildSourceOptions } from '../PrevYearMappingTab.vm'

describe('buildMappingPreview', () => {
  it('maps each target day to prev day with offset 0', () => {
    const prevData = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    const preview = buildMappingPreview(2024, 3, 0, 2023, 3, prevData)
    expect(preview.daysInTarget).toBe(31)
    expect(preview.daysInSource).toBe(31)
    expect(preview.rows).toHaveLength(31)
    expect(preview.rows[0]).toMatchObject({
      currentDay: 1,
      prevDay: 1,
      isOverflow: false,
      prevDisplayMonth: 3,
      prevDisplayDay: 1,
      hasData: true,
    })
    expect(preview.matchedCount).toBe(10)
    expect(preview.unmatchedCount).toBe(21)
  })

  it('applies positive offset (shifting prevDay)', () => {
    const preview = buildMappingPreview(2024, 2, 2, 2023, 2, new Set([3, 4, 5]))
    expect(preview.rows[0].prevDay).toBe(3)
    expect(preview.rows[0].hasData).toBe(true)
    expect(preview.rows[1].prevDay).toBe(4)
    expect(preview.rows[2].prevDay).toBe(5)
    expect(preview.rows[3].prevDay).toBe(6)
    expect(preview.rows[3].hasData).toBe(false)
  })

  it('marks overflow rows when prevDay exceeds source days', () => {
    // Target Mar (31 days), source Feb 2023 (28 days), offset 0 → days 29-31 overflow
    const preview = buildMappingPreview(2024, 3, 0, 2023, 2, new Set())
    expect(preview.daysInSource).toBe(28)
    const row28 = preview.rows[27]
    expect(row28.isOverflow).toBe(false)
    expect(row28.prevDisplayMonth).toBe(2)
    const row29 = preview.rows[28]
    expect(row29.isOverflow).toBe(true)
    expect(row29.prevDisplayMonth).toBe(3) // nextSourceMonth
    expect(row29.prevDisplayDay).toBe(1) // 29 - 28
  })

  it('wraps source month 12 to 1 on overflow', () => {
    // Target Jan 2024 (31), source Dec 2023 (31), offset 0 → no overflow
    // But with offset 1: day 31 → prevDay 32, overflow to Jan
    const preview = buildMappingPreview(2024, 1, 1, 2023, 12, new Set())
    const row31 = preview.rows[30]
    expect(row31.prevDay).toBe(32)
    expect(row31.isOverflow).toBe(true)
    expect(row31.prevDisplayMonth).toBe(1)
    expect(row31.prevDisplayDay).toBe(1)
  })

  it('computes firstDow from Date', () => {
    // 2024-03-01 is Friday (dow 5)
    const preview = buildMappingPreview(2024, 3, 0, 2023, 3, new Set())
    expect(preview.firstDow).toBe(5)
    expect(preview.rows[0].dow).toBe(5)
    expect(preview.rows[1].dow).toBe(6)
    expect(preview.rows[2].dow).toBe(0) // Sunday
  })

  it('counts matched and unmatched separately', () => {
    const preview = buildMappingPreview(2024, 1, 0, 2023, 1, new Set([1, 2]))
    expect(preview.matchedCount).toBe(2)
    expect(preview.unmatchedCount).toBe(29)
  })
})

describe('buildSourceOptions', () => {
  it('always includes auto option at start', () => {
    const opts = buildSourceOptions([], 2024, 3)
    expect(opts).toHaveLength(1)
    expect(opts[0]).toEqual({ value: 'auto', label: '自動 (2023年3月)' })
  })

  it('appends each available month as year-month value', () => {
    const months = [
      { year: 2023, month: 1 },
      { year: 2023, month: 2 },
    ]
    const opts = buildSourceOptions(months, 2024, 3)
    expect(opts).toHaveLength(3)
    expect(opts[1]).toEqual({ value: '2023-1', label: '2023年1月' })
    expect(opts[2]).toEqual({ value: '2023-2', label: '2023年2月' })
  })

  it('excludes target year-month from the list', () => {
    const months = [
      { year: 2024, month: 3 }, // same as target
      { year: 2023, month: 3 },
    ]
    const opts = buildSourceOptions(months, 2024, 3)
    expect(opts.map((o) => o.value)).not.toContain('2024-3')
    expect(opts.map((o) => o.value)).toContain('2023-3')
  })
})
