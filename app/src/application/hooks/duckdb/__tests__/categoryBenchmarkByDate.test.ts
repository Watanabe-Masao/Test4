import { describe, it, expect } from 'vitest'
import { buildCategoryBenchmarkScoresByDate } from '../categoryBenchmarkByDate'
import type {
  CategoryBenchmarkRow,
  CategoryBenchmarkTrendRow,
} from '@/infrastructure/duckdb/queries/advancedAnalytics'

const trendRow = (
  dateKey: string,
  code: string,
  name: string,
  storeId: string,
  totalSales: number,
  share = 0,
): CategoryBenchmarkTrendRow => ({
  dateKey,
  code,
  name,
  storeId,
  totalSales,
  share,
})

const benchmarkRow = (code: string, name: string, storeCount: number): CategoryBenchmarkRow =>
  ({
    code,
    name,
    storeId: 's',
    totalSales: 0,
    totalQuantity: 0,
    storeCustomers: 0,
    share: 0,
    salesRank: 0,
    storeCount,
  }) as CategoryBenchmarkRow

describe('buildCategoryBenchmarkScoresByDate', () => {
  it('returns empty array when no trend rows', () => {
    const result = buildCategoryBenchmarkScoresByDate([], [])
    expect(result).toEqual([])
  })

  it('builds scores across multiple dates and categories', () => {
    const trend: CategoryBenchmarkTrendRow[] = [
      trendRow('2025-01-01', 'A', 'alpha', 's1', 600),
      trendRow('2025-01-01', 'B', 'beta', 's1', 400),
      trendRow('2025-01-02', 'A', 'alpha', 's1', 500),
      trendRow('2025-01-02', 'B', 'beta', 's1', 500),
    ]
    const benchmark: CategoryBenchmarkRow[] = [
      benchmarkRow('A', 'alpha', 2),
      benchmarkRow('B', 'beta', 2),
    ]
    const result = buildCategoryBenchmarkScoresByDate(trend, benchmark, 1, 2)
    expect(result).toHaveLength(2)
    const a = result.find((r) => r.code === 'A')!
    const b = result.find((r) => r.code === 'B')!
    expect(a.totalSales).toBe(1100)
    expect(b.totalSales).toBe(900)
    // A's avg share > B's avg share → A's index = 100
    expect(a.index).toBe(100)
    expect(a.index).toBeGreaterThan(b.index)
    // Each has stability in [0,1]
    for (const r of result) {
      expect(r.stability).toBeGreaterThanOrEqual(0)
      expect(r.stability).toBeLessThanOrEqual(1)
      expect(r.metric).toBe('share')
      expect(r.storeCount).toBe(2)
    }
  })

  it('filters out categories below minStores threshold', () => {
    const trend: CategoryBenchmarkTrendRow[] = [
      trendRow('2025-01-01', 'A', 'alpha', 's1', 100),
      trendRow('2025-01-01', 'C', 'gamma', 's1', 100),
    ]
    const benchmark: CategoryBenchmarkRow[] = [
      benchmarkRow('A', 'alpha', 3),
      benchmarkRow('C', 'gamma', 1),
    ]
    const result = buildCategoryBenchmarkScoresByDate(trend, benchmark, 2, 3)
    expect(result.map((r) => r.code)).toEqual(['A'])
  })

  it('handles zero-sales dates (share = 0) without NaN', () => {
    const trend: CategoryBenchmarkTrendRow[] = [
      trendRow('2025-01-01', 'A', 'alpha', 's1', 0),
      trendRow('2025-01-02', 'A', 'alpha', 's1', 100),
    ]
    const benchmark: CategoryBenchmarkRow[] = [benchmarkRow('A', 'alpha', 1)]
    const result = buildCategoryBenchmarkScoresByDate(trend, benchmark, 1, 1)
    expect(result).toHaveLength(1)
    expect(Number.isFinite(result[0].avgShare)).toBe(true)
    expect(Number.isFinite(result[0].stability)).toBe(true)
    expect(Number.isFinite(result[0].variance)).toBe(true)
  })

  it('uses max sqlStoreCount when totalStoreCount is 0', () => {
    const trend: CategoryBenchmarkTrendRow[] = [trendRow('2025-01-01', 'A', 'alpha', 's1', 100)]
    const benchmark: CategoryBenchmarkRow[] = [benchmarkRow('A', 'alpha', 5)]
    const result = buildCategoryBenchmarkScoresByDate(trend, benchmark, 1, 0)
    expect(result[0].dominance).toBe(1) // 5/5
  })

  it('results are sorted by index*stability desc', () => {
    const trend: CategoryBenchmarkTrendRow[] = [
      trendRow('2025-01-01', 'A', 'alpha', 's1', 900),
      trendRow('2025-01-01', 'B', 'beta', 's1', 100),
      trendRow('2025-01-02', 'A', 'alpha', 's1', 900),
      trendRow('2025-01-02', 'B', 'beta', 's1', 100),
    ]
    const benchmark: CategoryBenchmarkRow[] = [
      benchmarkRow('A', 'alpha', 1),
      benchmarkRow('B', 'beta', 1),
    ]
    const result = buildCategoryBenchmarkScoresByDate(trend, benchmark, 1, 1)
    expect(result[0].code).toBe('A')
    expect(result[1].code).toBe('B')
  })
})
