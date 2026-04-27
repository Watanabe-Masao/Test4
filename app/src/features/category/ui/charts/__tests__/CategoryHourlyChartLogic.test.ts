/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import {
  buildCategoryHeatmapData,
  TOP_CATEGORIES,
  type CategoryHeatmapRow,
} from '../CategoryHourlyChartLogic'
import type { CategoryHourlyRow } from '@/application/hooks/duckdb'

function row(code: string, name: string, hour: number, amount: number): CategoryHourlyRow {
  return { code, name, hour, amount } as unknown as CategoryHourlyRow
}

describe('buildCategoryHeatmapData', () => {
  it('returns empty categories and default peak hour for empty input', () => {
    const result = buildCategoryHeatmapData([], 9)
    expect(result.categories).toEqual([])
    expect(result.maxAmount).toBe(0)
    expect(result.globalPeakHour).toBe(9)
  })

  it('aggregates amounts per category and hour', () => {
    const rows: CategoryHourlyRow[] = [
      row('A', 'Alpha', 10, 100),
      row('A', 'Alpha', 10, 50), // same cat, same hour
      row('A', 'Alpha', 11, 200),
      row('B', 'Beta', 10, 300),
    ]
    const result = buildCategoryHeatmapData(rows, 0)
    expect(result.categories).toHaveLength(2)

    const alpha = result.categories.find((c) => c.code === 'A') as CategoryHeatmapRow
    expect(alpha.totalAmount).toBe(350)
    expect(alpha.hourlyAmounts.get(10)).toBe(150)
    expect(alpha.hourlyAmounts.get(11)).toBe(200)
    expect(alpha.peakHour).toBe(11)
    expect(alpha.peakAmount).toBe(200)

    const beta = result.categories.find((c) => c.code === 'B') as CategoryHeatmapRow
    expect(beta.totalAmount).toBe(300)
    expect(beta.peakHour).toBe(10)
  })

  it('sorts categories by total amount descending and computes share', () => {
    const rows: CategoryHourlyRow[] = [row('S', 'Small', 10, 100), row('B', 'Big', 10, 900)]
    const result = buildCategoryHeatmapData(rows, 0)
    expect(result.categories[0].code).toBe('B')
    expect(result.categories[1].code).toBe('S')
    expect(result.categories[0].shareOfTotal).toBeCloseTo(0.9, 5)
    expect(result.categories[1].shareOfTotal).toBeCloseTo(0.1, 5)
  })

  it('limits to TOP_CATEGORIES', () => {
    const rows: CategoryHourlyRow[] = []
    for (let i = 0; i < TOP_CATEGORIES + 5; i++) {
      rows.push(row(`C${i}`, `Name${i}`, 10, (TOP_CATEGORIES + 5 - i) * 100))
    }
    const result = buildCategoryHeatmapData(rows, 0)
    expect(result.categories).toHaveLength(TOP_CATEGORIES)
    expect(result.categories[0].code).toBe('C0')
  })

  it('computes global peak hour from aggregated hour totals', () => {
    const rows: CategoryHourlyRow[] = [
      row('A', 'A', 10, 100),
      row('B', 'B', 10, 100),
      row('A', 'A', 14, 500),
      row('B', 'B', 14, 1), // global peak at 14 even though per-cat peak differs
    ]
    const result = buildCategoryHeatmapData(rows, 0)
    expect(result.globalPeakHour).toBe(14)
    expect(result.maxAmount).toBe(500)
  })

  it('returns shareOfTotal=0 when grand total is 0', () => {
    const rows: CategoryHourlyRow[] = [row('A', 'Alpha', 10, 0)]
    const result = buildCategoryHeatmapData(rows, 8)
    expect(result.categories[0].shareOfTotal).toBe(0)
  })
})
