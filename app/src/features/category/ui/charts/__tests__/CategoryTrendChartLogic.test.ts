/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import {
  buildCategoryTrendData,
  buildPrevYearTrendData,
  PREV_YEAR_SUFFIX,
} from '@/features/category/ui/charts/CategoryTrendChartLogic'
import type { CategoryDailyTrendRow } from '@/application/hooks/duckdb'

const rows: CategoryDailyTrendRow[] = [
  { code: 'A', name: 'Alpha', dateKey: '2026-01-01', amount: 1000, quantity: 10 },
  { code: 'A', name: 'Alpha', dateKey: '2026-01-02', amount: 2000, quantity: 20 },
  { code: 'B', name: 'Beta', dateKey: '2026-01-01', amount: 500, quantity: 5 },
  { code: 'B', name: 'Beta', dateKey: '2026-01-02', amount: 1500, quantity: 15 },
  { code: 'C', name: 'Gamma', dateKey: '2026-01-01', amount: 100, quantity: 1 },
]

describe('buildCategoryTrendData', () => {
  it('aggregates categories and sorts by totalAmount descending', () => {
    const res = buildCategoryTrendData(rows, new Set())
    expect(res.categories).toHaveLength(3)
    expect(res.categories[0].code).toBe('A')
    expect(res.categories[0].totalAmount).toBe(3000)
    expect(res.categories[1].code).toBe('B')
    expect(res.categories[1].totalAmount).toBe(2000)
    expect(res.categories[2].code).toBe('C')
    expect(res.categories[2].totalAmount).toBe(100)
  })

  it('builds chartData with MM-DD dateKey and amounts per category', () => {
    const res = buildCategoryTrendData(rows, new Set())
    expect(res.chartData).toHaveLength(2)
    expect(res.chartData[0].date).toBe('01-01')
    expect(res.chartData[0]['A']).toBe(1000)
    expect(res.chartData[0]['B']).toBe(500)
    expect(res.chartData[1].date).toBe('01-02')
    expect(res.chartData[1]['A']).toBe(2000)
    expect(res.chartData[1]['B']).toBe(1500)
  })

  it('excludes given category codes from chartData but keeps in categories list', () => {
    const res = buildCategoryTrendData(rows, new Set(['B']))
    expect(res.categories.map((c) => c.code)).toEqual(['A', 'B', 'C'])
    expect(res.chartData[0]['B']).toBeUndefined()
    expect(res.chartData[0]['A']).toBe(1000)
  })

  it('supports quantity metric', () => {
    const res = buildCategoryTrendData(rows, new Set(), 'quantity')
    expect(res.categories[0].code).toBe('A')
    expect(res.categories[0].totalAmount).toBe(30)
    expect(res.chartData[0]['A']).toBe(10)
  })

  it('handles empty input', () => {
    const res = buildCategoryTrendData([], new Set())
    expect(res.categories).toEqual([])
    expect(res.chartData).toEqual([])
  })
})

describe('buildPrevYearTrendData', () => {
  it('returns empty map when prevRows empty', () => {
    const m = buildPrevYearTrendData([], ['01-01'], [{ code: 'A', name: 'A', totalAmount: 0 }])
    expect(m.size).toBe(0)
  })

  it('returns empty map when currentDates empty', () => {
    const m = buildPrevYearTrendData(rows, [], [{ code: 'A', name: 'A', totalAmount: 0 }])
    expect(m.size).toBe(0)
  })

  it('maps prev year dates to current date axis positionally', () => {
    const prev: CategoryDailyTrendRow[] = [
      { code: 'A', name: 'A', dateKey: '2025-01-01', amount: 500, quantity: 5 },
      { code: 'A', name: 'A', dateKey: '2025-01-02', amount: 800, quantity: 8 },
    ]
    const result = buildPrevYearTrendData(
      prev,
      ['01-01', '01-02'],
      [{ code: 'A', name: 'A', totalAmount: 0 }],
    )
    expect(result.get('01-01')).toEqual({ A: 500 })
    expect(result.get('01-02')).toEqual({ A: 800 })
  })

  it('filters out prev rows whose category is not in current', () => {
    const prev: CategoryDailyTrendRow[] = [
      { code: 'X', name: 'X', dateKey: '2025-01-01', amount: 500, quantity: 5 },
    ]
    const result = buildPrevYearTrendData(
      prev,
      ['01-01'],
      [{ code: 'A', name: 'A', totalAmount: 0 }],
    )
    expect(result.size).toBe(0)
  })

  it('uses quantity metric when requested', () => {
    const prev: CategoryDailyTrendRow[] = [
      { code: 'A', name: 'A', dateKey: '2025-01-01', amount: 999, quantity: 7 },
    ]
    const result = buildPrevYearTrendData(
      prev,
      ['01-01'],
      [{ code: 'A', name: 'A', totalAmount: 0 }],
      'quantity',
    )
    expect(result.get('01-01')).toEqual({ A: 7 })
  })
})

describe('PREV_YEAR_SUFFIX', () => {
  it('is the expected label', () => {
    expect(PREV_YEAR_SUFFIX).toBe('(前年)')
  })
})
