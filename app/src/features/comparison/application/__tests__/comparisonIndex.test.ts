/**
 * comparisonIndex — buildComparisonIndex の純粋テスト
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { buildComparisonIndex } from '../comparisonIndex'
import type { MatchableRow } from '../comparisonTypes'

function row(overrides: Partial<MatchableRow> = {}): MatchableRow {
  return {
    dateKey: '2024-06-15',
    year: 2024,
    month: 6,
    day: 15,
    storeId: 'S01',
    sales: 1000,
    customers: 10,
    ...overrides,
  }
}

describe('buildComparisonIndex', () => {
  it('returns empty array for missing key', () => {
    const idx = buildComparisonIndex([])
    expect(idx.get('S01', '2024-06-15')).toEqual([])
  })

  it('looks up single row by storeId + dateKey', () => {
    const r = row({ sales: 500 })
    const idx = buildComparisonIndex([r])
    const result = idx.get('S01', '2024-06-15')
    expect(result).toHaveLength(1)
    expect(result[0]?.sales).toBe(500)
  })

  it('distinguishes rows by storeId', () => {
    const a = row({ storeId: 'S01', sales: 100 })
    const b = row({ storeId: 'S02', sales: 200 })
    const idx = buildComparisonIndex([a, b])
    expect(idx.get('S01', '2024-06-15')[0]?.sales).toBe(100)
    expect(idx.get('S02', '2024-06-15')[0]?.sales).toBe(200)
  })

  it('distinguishes rows by dateKey', () => {
    const a = row({ dateKey: '2024-06-15', sales: 100 })
    const b = row({ dateKey: '2024-06-16', sales: 200 })
    const idx = buildComparisonIndex([a, b])
    expect(idx.get('S01', '2024-06-15')[0]?.sales).toBe(100)
    expect(idx.get('S01', '2024-06-16')[0]?.sales).toBe(200)
  })

  it('distinguishes rows by grainKey', () => {
    const a = row({ grainKey: 'dept01', sales: 100 })
    const b = row({ grainKey: 'dept02', sales: 200 })
    const idx = buildComparisonIndex([a, b])
    expect(idx.get('S01', '2024-06-15', 'dept01')[0]?.sales).toBe(100)
    expect(idx.get('S01', '2024-06-15', 'dept02')[0]?.sales).toBe(200)
  })

  it('treats missing grainKey and undefined as same bucket', () => {
    const a = row()
    const idx = buildComparisonIndex([a])
    // Both lookup without grainKey and with undefined resolve to the same bucket
    expect(idx.get('S01', '2024-06-15')).toHaveLength(1)
    expect(idx.get('S01', '2024-06-15', undefined)).toHaveLength(1)
  })

  it('returns array of ALL rows for duplicate key (does not silently sum)', () => {
    const a = row({ sales: 100 })
    const b = row({ sales: 200 })
    const idx = buildComparisonIndex([a, b])
    const result = idx.get('S01', '2024-06-15')
    expect(result).toHaveLength(2)
    expect(result.map((r) => r.sales)).toEqual([100, 200])
  })

  it('returns empty array for non-matching grainKey', () => {
    const a = row({ grainKey: 'dept01' })
    const idx = buildComparisonIndex([a])
    // grainKey 'dept02' does not match 'dept01'
    expect(idx.get('S01', '2024-06-15', 'dept02')).toEqual([])
    // No grainKey also does not match when row has one
    expect(idx.get('S01', '2024-06-15')).toEqual([])
  })

  it('handles many rows across multiple stores and dates', () => {
    const rows: MatchableRow[] = [
      row({ storeId: 'S01', dateKey: '2024-06-14', sales: 1 }),
      row({ storeId: 'S01', dateKey: '2024-06-15', sales: 2 }),
      row({ storeId: 'S01', dateKey: '2024-06-16', sales: 3 }),
      row({ storeId: 'S02', dateKey: '2024-06-15', sales: 4 }),
    ]
    const idx = buildComparisonIndex(rows)
    expect(idx.get('S01', '2024-06-14')[0]?.sales).toBe(1)
    expect(idx.get('S01', '2024-06-15')[0]?.sales).toBe(2)
    expect(idx.get('S01', '2024-06-16')[0]?.sales).toBe(3)
    expect(idx.get('S02', '2024-06-15')[0]?.sales).toBe(4)
    expect(idx.get('S03', '2024-06-15')).toEqual([])
  })
})
