/**
 * useMonthlyHistory フックのテスト
 *
 * IndexedDB からの月次データ集約ロジック（aggregateSummaryRates 経由）を
 * DataRepository モックを使って検証する。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useMonthlyHistory } from '../useMonthlyHistory'
import type { DataRepository } from '@/domain/repositories/DataRepository'
import type { StoreDaySummaryIndex } from '@/domain/models/record'

// ── Helpers ───────────────────────────────────────────

function makeRepo(overrides: Record<string, unknown> = {}): DataRepository {
  return {
    isAvailable: vi.fn(() => true),
    saveMonthlyData: vi.fn(),
    loadMonthlyData: vi.fn(() => Promise.resolve(null)),
    clearMonth: vi.fn(),
    clearAll: vi.fn(),
    getSessionMeta: vi.fn(() => Promise.resolve(null)),
    listStoredMonths: vi.fn(() => Promise.resolve([])),
    loadDataSlice: vi.fn(() => Promise.resolve(null)),
    loadSummaryCache: vi.fn(() => Promise.resolve(null)),
    saveSummaryCache: vi.fn(),
    ...overrides,
  } as unknown as DataRepository
}

function makeClassifiedSalesSlice(storeIds: string[] = ['s1']) {
  return {
    records: storeIds.flatMap((storeId) => [
      { storeId, day: 1, sales: 1_000_000, discount: 20_000 },
      { storeId, day: 2, sales: 800_000, discount: 15_000 },
    ]),
  }
}

function makeSummaryCache(): { summaries: StoreDaySummaryIndex } {
  return {
    summaries: {
      s1: {
        1: {
          sales: 1_000_000,
          grossSales: 1_100_000,
          discountAmount: 20_000,
          purchaseCost: 600_000,
          purchasePrice: 800_000,
          flowersCost: 50_000,
          directProduceCost: 30_000,
          costInclusionCost: 10_000,
          customers: 300,
        },
        2: {
          sales: 800_000,
          grossSales: 900_000,
          discountAmount: 15_000,
          purchaseCost: 480_000,
          purchasePrice: 640_000,
          flowersCost: 40_000,
          directProduceCost: 24_000,
          costInclusionCost: 8_000,
          customers: 240,
        },
      },
    } as unknown as StoreDaySummaryIndex,
  }
}

// ── Tests ──────────────────────────────────────────────

describe('useMonthlyHistory', () => {
  it('returns empty array when repo is null', () => {
    const { result } = renderHook(() => useMonthlyHistory(null, 2025, 1))
    expect(result.current).toHaveLength(0)
  })

  it('returns empty array when no stored months', async () => {
    const repo = makeRepo({ listStoredMonths: vi.fn(() => Promise.resolve([])) })
    const { result } = renderHook(() => useMonthlyHistory(repo, 2025, 1))
    await waitFor(() => {
      // After effect runs, still empty since no months
      expect(result.current).toHaveLength(0)
    })
  })

  it('returns data points for stored months with classifiedSales', async () => {
    const repo = makeRepo({
      listStoredMonths: vi.fn(() => Promise.resolve([{ year: 2024, month: 11 }])),
      loadDataSlice: vi.fn((_year, _month, slice) => {
        if (slice === 'classifiedSales') return Promise.resolve(makeClassifiedSalesSlice())
        if (slice === 'budget') return Promise.resolve(null)
        return Promise.resolve(null)
      }),
      loadSummaryCache: vi.fn(() => Promise.resolve(null)),
    })

    const { result } = renderHook(() => useMonthlyHistory(repo, 2025, 1))

    await waitFor(() => {
      expect(result.current).toHaveLength(1)
    })

    const point = result.current[0]
    expect(point.year).toBe(2024)
    expect(point.month).toBe(11)
    expect(point.totalSales).toBe(1_800_000) // 1_000_000 + 800_000
    expect(point.storeCount).toBe(1)
  })

  it('uses StoreDaySummaryCache for component rates when available', async () => {
    const repo = makeRepo({
      listStoredMonths: vi.fn(() => Promise.resolve([{ year: 2024, month: 10 }])),
      loadDataSlice: vi.fn((_year, _month, slice) => {
        if (slice === 'classifiedSales') return Promise.resolve(makeClassifiedSalesSlice())
        if (slice === 'budget') return Promise.resolve(null)
        return Promise.resolve(null)
      }),
      loadSummaryCache: vi.fn(() => Promise.resolve(makeSummaryCache())),
    })

    const { result } = renderHook(() => useMonthlyHistory(repo, 2025, 1))

    await waitFor(() => {
      expect(result.current).toHaveLength(1)
    })

    const point = result.current[0]
    // With cache available, component rates should be populated
    expect(point.totalCustomers).not.toBeNull()
    expect(point.grossProfit).not.toBeNull()
    expect(point.grossProfitRate).not.toBeNull()
    expect(point.discountRate).not.toBeNull()
    expect(point.costRate).not.toBeNull()
  })

  it('fills null for component rates when summaryCache is unavailable', async () => {
    const repo = makeRepo({
      listStoredMonths: vi.fn(() => Promise.resolve([{ year: 2024, month: 9 }])),
      loadDataSlice: vi.fn((_year, _month, slice) => {
        if (slice === 'classifiedSales') return Promise.resolve(makeClassifiedSalesSlice())
        return Promise.resolve(null)
      }),
      loadSummaryCache: vi.fn(() => Promise.resolve(null)),
    })

    const { result } = renderHook(() => useMonthlyHistory(repo, 2025, 1))

    await waitFor(() => {
      expect(result.current).toHaveLength(1)
    })

    const point = result.current[0]
    expect(point.totalCustomers).toBeNull()
    expect(point.grossProfit).toBeNull()
    expect(point.grossProfitRate).toBeNull()
  })

  it('includes budget data when available', async () => {
    const budgetData = new Map([['s1', { monthlyBudget: 2_000_000 }]])
    const repo = makeRepo({
      listStoredMonths: vi.fn(() => Promise.resolve([{ year: 2024, month: 8 }])),
      loadDataSlice: vi.fn((_year, _month, slice) => {
        if (slice === 'classifiedSales') return Promise.resolve(makeClassifiedSalesSlice())
        if (slice === 'budget') return Promise.resolve(budgetData)
        return Promise.resolve(null)
      }),
      loadSummaryCache: vi.fn(() => Promise.resolve(null)),
    })

    const { result } = renderHook(() => useMonthlyHistory(repo, 2025, 1))

    await waitFor(() => {
      expect(result.current).toHaveLength(1)
    })

    const point = result.current[0]
    expect(point.budget).toBe(2_000_000)
    expect(point.budgetAchievement).toBeCloseTo(1_800_000 / 2_000_000, 5)
  })

  it('sorts results by year then month', async () => {
    const repo = makeRepo({
      listStoredMonths: vi.fn(() =>
        Promise.resolve([
          { year: 2024, month: 12 },
          { year: 2024, month: 10 },
          { year: 2024, month: 11 },
        ]),
      ),
      loadDataSlice: vi.fn((_year, _month, slice) => {
        if (slice === 'classifiedSales') return Promise.resolve(makeClassifiedSalesSlice())
        return Promise.resolve(null)
      }),
      loadSummaryCache: vi.fn(() => Promise.resolve(null)),
    })

    const { result } = renderHook(() => useMonthlyHistory(repo, 2025, 1))

    await waitFor(() => {
      expect(result.current).toHaveLength(3)
    })

    expect(result.current[0].month).toBe(10)
    expect(result.current[1].month).toBe(11)
    expect(result.current[2].month).toBe(12)
  })

  it('skips months with empty classifiedSales', async () => {
    const repo = makeRepo({
      listStoredMonths: vi.fn(() =>
        Promise.resolve([
          { year: 2024, month: 10 },
          { year: 2024, month: 11 },
        ]),
      ),
      loadDataSlice: vi.fn((_year, month, slice) => {
        if (slice === 'classifiedSales') {
          // Month 10 has data, month 11 has empty records
          if (month === 10) return Promise.resolve(makeClassifiedSalesSlice())
          return Promise.resolve({ records: [] })
        }
        return Promise.resolve(null)
      }),
      loadSummaryCache: vi.fn(() => Promise.resolve(null)),
    })

    const { result } = renderHook(() => useMonthlyHistory(repo, 2025, 1))

    await waitFor(() => {
      // Only month 10 should be in result
      expect(result.current.length).toBeGreaterThanOrEqual(1)
    })

    expect(result.current.find((p) => p.month === 11)).toBeUndefined()
    expect(result.current.find((p) => p.month === 10)).toBeDefined()
  })

  it('handles multiple stores correctly', async () => {
    const repo = makeRepo({
      listStoredMonths: vi.fn(() => Promise.resolve([{ year: 2024, month: 7 }])),
      loadDataSlice: vi.fn((_year, _month, slice) => {
        if (slice === 'classifiedSales')
          return Promise.resolve(makeClassifiedSalesSlice(['s1', 's2', 's3']))
        return Promise.resolve(null)
      }),
      loadSummaryCache: vi.fn(() => Promise.resolve(null)),
    })

    const { result } = renderHook(() => useMonthlyHistory(repo, 2025, 1))

    await waitFor(() => {
      expect(result.current).toHaveLength(1)
    })

    expect(result.current[0].storeCount).toBe(3)
    // totalSales = 3 stores × (1_000_000 + 800_000)
    expect(result.current[0].totalSales).toBe(5_400_000)
  })

  it('re-loads when year/month changes', async () => {
    const listStoredMonths = vi.fn(() => Promise.resolve([]))
    const repo = makeRepo({ listStoredMonths })

    const { rerender } = renderHook(({ year, month }) => useMonthlyHistory(repo, year, month), {
      initialProps: { year: 2025, month: 1 },
    })

    await waitFor(() => {
      expect(listStoredMonths).toHaveBeenCalledTimes(1)
    })

    rerender({ year: 2025, month: 2 })

    await waitFor(() => {
      expect(listStoredMonths).toHaveBeenCalledTimes(2)
    })
  })
})
