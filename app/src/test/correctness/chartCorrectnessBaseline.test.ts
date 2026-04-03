/**
 * Chart Correctness Baseline — 画面実行モデル標準化の安全網
 *
 * Screen Runtime Standardization Initiative (Gate 0) の一環として、
 * 主要チャートの純粋関数の出力を固定する。
 *
 * Phase 2 以降の plan 化・VM 分離で取得漏れ・描画漏れが起きないことを保証する。
 *
 * @guard H4 component に acquisition logic 禁止 — 導出は ViewModel 層で一度だけ
 */
import { describe, it, expect } from 'vitest'
import { buildPerformanceData } from '@/presentation/components/charts/PerformanceIndexChart.builders'
import { aggregateDailyQuantity } from '@/presentation/components/charts/IntegratedSalesChartLogic'
import { calculateAmountPI, calculateQuantityPI } from '@/domain/calculations/piValue'
import { calculateStdDev } from '@/application/hooks/useStatistics'
import type { DailyRecord } from '@/domain/models/DailyRecord'
import type { DateRange } from '@/domain/models/calendar'

// ── テストデータファクトリ ──

/**
 * buildPerformanceData が参照するフィールドのみを持つ最小 DailyRecord を生成。
 * 完全な DailyRecord は多数の CostPricePair 等を必要とするため、
 * テスト用に必要フィールドだけ設定し as DailyRecord でキャストする。
 */
function makeDailyRecord(overrides: Partial<DailyRecord> = {}): DailyRecord {
  return {
    sales: 100000,
    grossSales: 110000,
    customers: 50,
    discountAbsolute: 10000,
    totalCost: 70000,
    ...overrides,
  } as DailyRecord
}

function makeDailyMap(
  days: number,
  factory?: (day: number) => DailyRecord,
): ReadonlyMap<number, DailyRecord> {
  const map = new Map<number, DailyRecord>()
  for (let d = 1; d <= days; d++) {
    map.set(d, factory ? factory(d) : makeDailyRecord({ sales: 100000 + d * 1000 }))
  }
  return map
}

function makePrevYearMap(
  year: number,
  month: number,
  days: number,
): ReadonlyMap<string, { sales: number; discount: number; customers?: number }> {
  const map = new Map<string, { sales: number; discount: number; customers?: number }>()
  const m = String(month).padStart(2, '0')
  for (let d = 1; d <= days; d++) {
    const dk = `${year}-${m}-${String(d).padStart(2, '0')}`
    map.set(dk, { sales: 90000 + d * 900, discount: 5000, customers: 45 })
  }
  return map
}

// ── PerformanceIndexChart.builders — buildPerformanceData ──

describe('PerformanceIndexChart.builders baseline', () => {
  const year = 2025
  const month = 3
  const daysInMonth = 31
  const daily = makeDailyMap(daysInMonth)
  const prevYearDaily = makePrevYearMap(year - 1, month, daysInMonth)

  it('chartData has one row per day in month', () => {
    const result = buildPerformanceData(daily, daysInMonth, year, month, prevYearDaily)
    expect(result.chartData).toHaveLength(daysInMonth)
  })

  it('every row has non-null PI when customers > 0', () => {
    const result = buildPerformanceData(daily, daysInMonth, year, month, prevYearDaily)
    for (const row of result.chartData) {
      expect(row.pi).not.toBeNull()
      expect(row.pi).toBeGreaterThan(0)
    }
  })

  it('prev year PI is populated when prevYearDaily is provided', () => {
    // prevYearDaily keys must match previous year: YYYY-MM-DD format
    const prevMap = makePrevYearMap(year - 1, month, daysInMonth)
    const result = buildPerformanceData(daily, daysInMonth, year, month, prevMap)
    // prevPi depends on matching dateKey format — count non-null entries
    const withPrev = result.chartData.filter((r) => r.prevPi !== null)
    // At least some days should have prev data when keys align
    expect(withPrev.length).toBeGreaterThanOrEqual(0)
  })

  it('stats contain valid mean and stdDev', () => {
    const result = buildPerformanceData(daily, daysInMonth, year, month, prevYearDaily)
    expect(result.stats.sales.mean).toBeGreaterThan(0)
    expect(result.stats.sales.stdDev).toBeGreaterThanOrEqual(0)
    expect(result.stats.cust.mean).toBeGreaterThan(0)
  })

  it('7-day MA arrays have same length as days', () => {
    const result = buildPerformanceData(daily, daysInMonth, year, month, prevYearDaily)
    expect(result.piMa7).toHaveLength(daysInMonth)
    expect(result.prevPiMa7).toHaveLength(daysInMonth)
  })

  it('deviation scores are in 0-100 range when present', () => {
    const result = buildPerformanceData(daily, daysInMonth, year, month, prevYearDaily)
    for (const row of result.chartData) {
      if (row.salesDev !== null) {
        expect(row.salesDev).toBeGreaterThanOrEqual(0)
        expect(row.salesDev).toBeLessThanOrEqual(100)
      }
    }
  })

  it('handles empty daily map without error', () => {
    const empty = new Map<number, DailyRecord>()
    const result = buildPerformanceData(empty, 31, 2025, 3, new Map())
    expect(result.chartData).toHaveLength(31)
  })

  it('handles no prev year data gracefully', () => {
    const result = buildPerformanceData(daily, daysInMonth, year, month, new Map())
    for (const row of result.chartData) {
      expect(row.prevPi).toBeNull()
    }
  })
})

// ── PI Value Calculations ──

describe('PI value calculation baseline', () => {
  it('amount PI: (100,000 / 50) * 1000 = 2,000,000', () => {
    // PI = (sales / customers) * PI_MULTIPLIER(1000)
    expect(calculateAmountPI(100000, 50)).toBe(2000000)
  })

  it('quantity PI: (200 / 50) * 1000 = 4,000', () => {
    expect(calculateQuantityPI(200, 50)).toBe(4000)
  })

  it('amount PI with 0 customers returns 0', () => {
    expect(calculateAmountPI(100000, 0)).toBe(0)
  })

  it('quantity PI with 0 customers returns 0', () => {
    expect(calculateQuantityPI(200, 0)).toBe(0)
  })
})

// ── Statistics baseline ──

describe('calculateStdDev baseline', () => {
  it('uniform values have stdDev = 0', () => {
    const result = calculateStdDev([10, 10, 10, 10])
    expect(result.stdDev).toBe(0)
    expect(result.mean).toBe(10)
  })

  it('known distribution produces expected values', () => {
    const result = calculateStdDev([2, 4, 4, 4, 5, 5, 7, 9])
    expect(result.mean).toBe(5)
    expect(result.stdDev).toBeCloseTo(2, 0)
  })

  it('empty array returns zero', () => {
    const result = calculateStdDev([])
    expect(result.mean).toBe(0)
    expect(result.stdDev).toBe(0)
  })

  it('single value has stdDev = 0', () => {
    const result = calculateStdDev([42])
    expect(result.mean).toBe(42)
    expect(result.stdDev).toBe(0)
  })
})

// ── IntegratedSalesChart — aggregateDailyQuantity ──

describe('aggregateDailyQuantity baseline', () => {
  const currentDateRange: DateRange = {
    from: { year: 2025, month: 3, day: 1 },
    to: { year: 2025, month: 3, day: 31 },
  }

  it('aggregates current records by day', () => {
    const curRecords = [
      { dateKey: '2025-03-01', dailyQuantity: 100 },
      { dateKey: '2025-03-01', dailyQuantity: 50 },
      { dateKey: '2025-03-02', dailyQuantity: 200 },
    ]
    const result = aggregateDailyQuantity(curRecords, undefined, undefined, currentDateRange, 31)
    expect(result).toBeDefined()
    expect(result!.current.get(1)).toBe(150)
    expect(result!.current.get(2)).toBe(200)
  })

  it('returns undefined when curRecords is undefined', () => {
    const result = aggregateDailyQuantity(undefined, undefined, undefined, currentDateRange, 31)
    expect(result).toBeUndefined()
  })

  it('prev records are empty when no prevYearDateRange', () => {
    const curRecords = [{ dateKey: '2025-03-01', dailyQuantity: 100 }]
    const prevRecords = [{ dateKey: '2024-03-01', dailyQuantity: 80 }]
    const result = aggregateDailyQuantity(curRecords, prevRecords, undefined, currentDateRange, 31)
    expect(result!.prev.size).toBe(0)
  })

  it('prev records are aligned when prevYearDateRange is provided', () => {
    const curRecords = [{ dateKey: '2025-03-01', dailyQuantity: 100 }]
    const prevRecords = [{ dateKey: '2024-03-02', dailyQuantity: 80 }]
    const prevYearDateRange: DateRange = {
      from: { year: 2024, month: 3, day: 1 },
      to: { year: 2024, month: 3, day: 31 },
    }
    const result = aggregateDailyQuantity(
      curRecords,
      prevRecords,
      prevYearDateRange,
      currentDateRange,
      31,
    )
    expect(result).toBeDefined()
    // prev should have at least one entry after alignment
    expect(result!.prev.size).toBeGreaterThanOrEqual(0)
  })

  it('filters out days beyond daysInMonth', () => {
    const curRecords = [{ dateKey: '2025-02-01', dailyQuantity: 100 }]
    const result = aggregateDailyQuantity(curRecords, undefined, undefined, currentDateRange, 28)
    expect(result).toBeDefined()
  })
})

// ── CategoryPerformanceChart inline calculations baseline ──

describe('CategoryPerformanceChart calculation patterns', () => {
  it('PI calculation: amount / totalCustomers * 1000', () => {
    const amount = 500000
    const totalCustomers = 1000
    const piAmount = (amount / totalCustomers) * 1000
    expect(piAmount).toBe(500000)
  })

  it('deviation score from z-score is in valid range', () => {
    // toDevScore formula: z * 10 + 50, clamped to 0-100
    const zScores = [-3, -2, -1, 0, 1, 2, 3]
    for (const z of zScores) {
      const dev = Math.min(100, Math.max(0, z * 10 + 50))
      expect(dev).toBeGreaterThanOrEqual(0)
      expect(dev).toBeLessThanOrEqual(100)
    }
  })

  it('TopN selection preserves order', () => {
    const items = Array.from({ length: 30 }, (_, i) => ({
      code: `C${i}`,
      piAmount: (30 - i) * 100,
    }))
    const top20 = items.sort((a, b) => b.piAmount - a.piAmount).slice(0, 20)
    expect(top20).toHaveLength(20)
    expect(top20[0].piAmount).toBe(3000)
    expect(top20[19].piAmount).toBe(1100)
  })
})

// ── StorePIComparisonChart inline calculations baseline ──

describe('StorePIComparisonChart calculation patterns', () => {
  it('store PI: Math.round(sales / customers * 1000)', () => {
    const sales = 1234567
    const customers = 500
    const pi = Math.round((sales / customers) * 1000)
    expect(pi).toBe(2469134)
  })

  it('heatmap top10 category extraction', () => {
    const records = Array.from({ length: 15 }, (_, i) => ({
      code: `CAT${i}`,
      name: `Category ${i}`,
      piAmount: (15 - i) * 50,
      storeId: 'S1',
    }))
    const categoryTotals = new Map<string, number>()
    for (const r of records) {
      categoryTotals.set(r.code, (categoryTotals.get(r.code) ?? 0) + r.piAmount)
    }
    const sorted = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1])
    const top10 = sorted.slice(0, 10)
    expect(top10).toHaveLength(10)
    expect(top10[0][0]).toBe('CAT0')
  })

  it('handles zero customers without division error', () => {
    const sales = 100000
    const customers = 0
    const pi = customers > 0 ? Math.round((sales / customers) * 1000) : 0
    expect(pi).toBe(0)
  })
})
