/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import {
  sortIndicator,
  sortRows,
  diffColor,
  periodLabel,
  DOW_LABELS,
  DOW_OPTIONS,
} from '@/features/purchase/application/purchaseAnalysisHelpers'
import type {
  SupplierComparisonRow,
  CategoryComparisonRow,
} from '@/domain/models/PurchaseComparison'

const makeSupplier = (over: Partial<SupplierComparisonRow>): SupplierComparisonRow => ({
  supplierCode: 'S1',
  supplierName: 'alpha',
  currentCost: 100,
  currentPrice: 150,
  prevCost: 80,
  prevPrice: 120,
  costDiff: 20,
  priceDiff: 30,
  costChangeRate: 0.25,
  currentCostShare: 0.5,
  prevCostShare: 0.4,
  costShareDiff: 0.1,
  currentMarkupRate: 0.33,
  prevMarkupRate: 0.33,
  ...over,
})

const makeCategory = (over: Partial<CategoryComparisonRow>): CategoryComparisonRow => ({
  categoryId: 'C1',
  category: 'alpha',
  color: '#000',
  currentCost: 100,
  currentPrice: 150,
  prevCost: 80,
  prevPrice: 120,
  costDiff: 20,
  priceDiff: 30,
  costChangeRate: 0.25,
  currentCostShare: 0.5,
  prevCostShare: 0.4,
  costShareDiff: 0.1,
  currentMarkupRate: 0.33,
  prevMarkupRate: 0.33,
  currentPriceShare: 0.5,
  crossMultiplication: 0.1,
  ...over,
})

describe('sortIndicator', () => {
  it('returns empty string when key does not match', () => {
    expect(sortIndicator('currentCost', 'name', 'asc')).toBe('')
  })

  it('returns ascending indicator when matching and asc', () => {
    expect(sortIndicator('name', 'name', 'asc')).toBe(' ▲')
  })

  it('returns descending indicator when matching and desc', () => {
    expect(sortIndicator('name', 'name', 'desc')).toBe(' ▼')
  })

  it('works for numeric keys', () => {
    expect(sortIndicator('costDiff', 'costDiff', 'desc')).toBe(' ▼')
    expect(sortIndicator('costDiff', 'costDiff', 'asc')).toBe(' ▲')
  })
})

describe('sortRows', () => {
  const supplierRows: SupplierComparisonRow[] = [
    makeSupplier({ supplierName: 'bravo', currentCost: 200, costDiff: -5 }),
    makeSupplier({ supplierName: 'alpha', currentCost: 100, costDiff: 30 }),
    makeSupplier({ supplierName: 'charlie', currentCost: 150, costDiff: 10 }),
  ]

  it('sorts by currentCost descending by default order', () => {
    const out = sortRows(supplierRows, 'currentCost', 'desc')
    expect(out.map((r) => r.currentCost)).toEqual([200, 150, 100])
  })

  it('sorts by currentCost ascending', () => {
    const out = sortRows(supplierRows, 'currentCost', 'asc')
    expect(out.map((r) => r.currentCost)).toEqual([100, 150, 200])
  })

  it('sorts by name using localeCompare', () => {
    const out = sortRows(supplierRows, 'name', 'asc')
    expect(out.map((r) => r.supplierName)).toEqual(['alpha', 'bravo', 'charlie'])
    const outDesc = sortRows(supplierRows, 'name', 'desc')
    expect(outDesc.map((r) => r.supplierName)).toEqual(['charlie', 'bravo', 'alpha'])
  })

  it('sorts numeric costDiff with negative values', () => {
    const out = sortRows(supplierRows, 'costDiff', 'asc')
    expect(out.map((r) => r.costDiff)).toEqual([-5, 10, 30])
  })

  it('does not mutate input array', () => {
    const snapshot = supplierRows.map((r) => r.supplierName)
    sortRows(supplierRows, 'name', 'asc')
    expect(supplierRows.map((r) => r.supplierName)).toEqual(snapshot)
  })

  it('sorts category rows by category name', () => {
    const rows: CategoryComparisonRow[] = [
      makeCategory({ category: 'zeta' }),
      makeCategory({ category: 'alpha' }),
    ]
    const out = sortRows(rows, 'name', 'asc')
    expect(out.map((r) => r.category)).toEqual(['alpha', 'zeta'])
  })

  it('sorts by costShareDiff and currentMarkupRate numeric keys', () => {
    const rows = [
      makeSupplier({ costShareDiff: 0.1, currentMarkupRate: 0.5 }),
      makeSupplier({ costShareDiff: -0.2, currentMarkupRate: 0.2 }),
    ]
    expect(sortRows(rows, 'costShareDiff', 'asc').map((r) => r.costShareDiff)).toEqual([-0.2, 0.1])
    expect(sortRows(rows, 'currentMarkupRate', 'desc').map((r) => r.currentMarkupRate)).toEqual([
      0.5, 0.2,
    ])
  })
})

describe('diffColor', () => {
  it('returns undefined for zero', () => {
    expect(diffColor(0)).toBeUndefined()
  })

  it('returns true for positive', () => {
    expect(diffColor(10)).toBe(true)
    expect(diffColor(0.0001)).toBe(true)
  })

  it('returns false for negative', () => {
    expect(diffColor(-1)).toBe(false)
    expect(diffColor(-999)).toBe(false)
  })
})

describe('periodLabel', () => {
  it('formats same-month range compactly', () => {
    const label = periodLabel({
      from: { year: 2025, month: 3, day: 1 },
      to: { year: 2025, month: 3, day: 15 },
    })
    expect(label).toBe('2025/3/1〜15')
  })

  it('formats cross-month range with full dates', () => {
    const label = periodLabel({
      from: { year: 2025, month: 1, day: 20 },
      to: { year: 2025, month: 2, day: 10 },
    })
    expect(label).toBe('2025/1/20〜2025/2/10')
  })

  it('formats cross-year range with full dates', () => {
    const label = periodLabel({
      from: { year: 2024, month: 12, day: 25 },
      to: { year: 2025, month: 1, day: 5 },
    })
    expect(label).toBe('2024/12/25〜2025/1/5')
  })
})

describe('DOW constants', () => {
  it('DOW_LABELS has 7 entries starting on Sunday', () => {
    expect(DOW_LABELS.length).toBe(7)
    expect(DOW_LABELS[0]).toBe('日')
    expect(DOW_LABELS[6]).toBe('土')
  })

  it('DOW_OPTIONS has matching value/label pairs', () => {
    expect(DOW_OPTIONS.length).toBe(7)
    expect(DOW_OPTIONS[0]).toEqual({ value: 0, label: '日' })
    expect(DOW_OPTIONS[6]).toEqual({ value: 6, label: '土' })
  })
})
