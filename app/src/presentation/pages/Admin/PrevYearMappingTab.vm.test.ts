/**
 * PrevYearMappingTab ViewModel tests
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { buildMappingPreview, buildSourceOptions } from './PrevYearMappingTab.vm'

describe('buildMappingPreview', () => {
  it('maps target days to previous days with zero offset and no data', () => {
    const preview = buildMappingPreview(2025, 2, 0, 2024, 2, new Set<number>())
    expect(preview.daysInTarget).toBe(28)
    expect(preview.daysInSource).toBe(29) // 2024-02 is leap
    expect(preview.rows).toHaveLength(28)
    expect(preview.matchedCount).toBe(0)
    expect(preview.unmatchedCount).toBe(28)
    expect(preview.rows[0].currentDay).toBe(1)
    expect(preview.rows[0].prevDay).toBe(1)
    expect(preview.rows[0].isOverflow).toBe(false)
    expect(preview.rows[0].prevDisplayMonth).toBe(2)
    expect(preview.rows[0].prevDisplayDay).toBe(1)
    // 2025-02-01 is Saturday (dow=6)
    expect(preview.firstDow).toBe(6)
    expect(preview.rows[0].dow).toBe(6)
    expect(preview.rows[1].dow).toBe(0)
  })

  it('counts matched when prevDayHasData contains the prev day', () => {
    const preview = buildMappingPreview(2025, 1, 0, 2024, 1, new Set([1, 2, 3]))
    expect(preview.matchedCount).toBe(3)
    expect(preview.unmatchedCount).toBe(28)
    expect(preview.rows[0].hasData).toBe(true)
    expect(preview.rows[3].hasData).toBe(false)
  })

  it('handles positive offset causing overflow to the next source month', () => {
    // target: 2025-03 (31 days), source: 2024-02 (29 days), offset +1
    // day 29 -> prevDay 30, overflow true -> prevDisplayMonth = 3, prevDisplayDay = 1
    const preview = buildMappingPreview(2025, 3, 1, 2024, 2, new Set<number>())
    expect(preview.daysInTarget).toBe(31)
    expect(preview.daysInSource).toBe(29)
    const row29 = preview.rows[28] // currentDay=29
    expect(row29.currentDay).toBe(29)
    expect(row29.prevDay).toBe(30)
    expect(row29.isOverflow).toBe(true)
    expect(row29.prevDisplayMonth).toBe(3)
    expect(row29.prevDisplayDay).toBe(1)
  })

  it('wraps source month 12 to 1 when overflowing', () => {
    // source = December; overflow should wrap to month 1
    const preview = buildMappingPreview(2025, 1, 5, 2024, 12, new Set<number>())
    const overflowing = preview.rows.filter((r) => r.isOverflow)
    expect(overflowing.length).toBeGreaterThan(0)
    expect(overflowing[0].prevDisplayMonth).toBe(1)
  })
})

describe('buildSourceOptions', () => {
  it('always includes the auto option first with prior year label', () => {
    const opts = buildSourceOptions([], 2025, 3)
    expect(opts).toHaveLength(1)
    expect(opts[0]).toEqual({ value: 'auto', label: '自動 (2024年3月)' })
  })

  it('includes available months excluding the target month', () => {
    const available = [
      { year: 2024, month: 1 },
      { year: 2024, month: 2 },
      { year: 2025, month: 3 }, // excluded (same as target)
      { year: 2025, month: 4 },
    ]
    const opts = buildSourceOptions(available, 2025, 3)
    expect(opts).toHaveLength(4) // auto + 3 months
    expect(opts[0].value).toBe('auto')
    expect(opts[1]).toEqual({ value: '2024-1', label: '2024年1月' })
    expect(opts[2]).toEqual({ value: '2024-2', label: '2024年2月' })
    expect(opts[3]).toEqual({ value: '2025-4', label: '2025年4月' })
  })
})
