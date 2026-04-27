/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import { buildCategoryTrendData } from '../categoryBenchmarkTrend'
import type { CategoryBenchmarkTrendRow } from '@/infrastructure/duckdb/queries/advancedAnalytics'

const row = (
  dateKey: string,
  code: string,
  name: string,
  storeId: string,
  share: number,
  totalSales = 0,
): CategoryBenchmarkTrendRow => ({
  dateKey,
  code,
  name,
  storeId,
  totalSales,
  share,
})

describe('buildCategoryTrendData', () => {
  it('returns empty when no rows', () => {
    expect(buildCategoryTrendData([], ['A'])).toEqual([])
  })

  it('returns empty when no topCodes match', () => {
    const rows = [row('2025-01-01', 'A', 'alpha', 's1', 0.5)]
    expect(buildCategoryTrendData(rows, ['Z'])).toEqual([])
  })

  it('filters rows by topCodes', () => {
    const rows = [
      row('2025-01-01', 'A', 'alpha', 's1', 0.5),
      row('2025-01-01', 'B', 'beta', 's1', 0.5),
    ]
    const result = buildCategoryTrendData(rows, ['A'])
    expect(result).toHaveLength(1)
    expect(result[0].code).toBe('A')
    expect(result[0].name).toBe('alpha')
    expect(result[0].avgShare).toBe(0.5)
  })

  it('pads missing stores with zero shares when totalStoreCount set', () => {
    const rows = [row('2025-01-01', 'A', 'alpha', 's1', 0.8)]
    // 1 data point, total store count = 2 → pads 1 zero → avg = 0.4
    const result = buildCategoryTrendData(rows, ['A'], 2)
    expect(result).toHaveLength(1)
    expect(result[0].avgShare).toBeCloseTo(0.4, 10)
    expect(result[0].cv).toBeGreaterThan(0)
    expect(result[0].stability).toBeGreaterThanOrEqual(0)
    expect(result[0].stability).toBeLessThanOrEqual(1)
  })

  it('sets cv=0 and stability=1 when all shares equal and zero padding not needed', () => {
    const rows = [
      row('2025-01-01', 'A', 'alpha', 's1', 0.5),
      row('2025-01-01', 'A', 'alpha', 's2', 0.5),
    ]
    const result = buildCategoryTrendData(rows, ['A'])
    expect(result[0].avgShare).toBeCloseTo(0.5, 10)
    expect(result[0].cv).toBe(0)
    expect(result[0].stability).toBe(1)
    expect(result[0].compositeScore).toBeCloseTo(0.5 * 1 * 10000, 10)
  })

  it('handles avgShare=0 (cv=0 branch)', () => {
    const rows = [row('2025-01-01', 'A', 'alpha', 's1', 0)]
    const result = buildCategoryTrendData(rows, ['A'])
    expect(result[0].avgShare).toBe(0)
    expect(result[0].cv).toBe(0)
    expect(result[0].stability).toBe(1)
    expect(result[0].compositeScore).toBe(0)
  })

  it('sorts results by dateKey then code', () => {
    const rows = [
      row('2025-01-02', 'B', 'beta', 's1', 0.3),
      row('2025-01-01', 'A', 'alpha', 's1', 0.4),
      row('2025-01-01', 'B', 'beta', 's1', 0.6),
      row('2025-01-02', 'A', 'alpha', 's1', 0.7),
    ]
    const result = buildCategoryTrendData(rows, ['A', 'B'])
    expect(result.map((r) => `${r.dateKey}|${r.code}`)).toEqual([
      '2025-01-01|A',
      '2025-01-01|B',
      '2025-01-02|A',
      '2025-01-02|B',
    ])
  })

  it('uses max(totalStoreCount, sqlStoreCount) when sqlStoreCount > totalStoreCount', () => {
    const rows = [
      row('2025-01-01', 'A', 'alpha', 's1', 0.5),
      row('2025-01-01', 'A', 'alpha', 's2', 0.5),
      row('2025-01-01', 'A', 'alpha', 's3', 0.5),
    ]
    // totalStoreCount=1 < sqlStoreCount=3 → uses 3 (no padding)
    const result = buildCategoryTrendData(rows, ['A'], 1)
    expect(result[0].avgShare).toBeCloseTo(0.5, 10)
  })
})
