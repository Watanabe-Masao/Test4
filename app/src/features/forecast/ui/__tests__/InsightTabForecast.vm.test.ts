import { describe, it, expect } from 'vitest'
import {
  computeWeeklyActuals,
  computeDecompPct,
  computeDecompTotals,
} from '@/features/forecast/ui/InsightTabForecast.vm'
import type { DailyRecord } from '@/domain/models/record'

const makeDaily = (
  entries: Array<[number, { customers: number; sales: number }]>,
): ReadonlyMap<number, DailyRecord> => {
  const map = new Map<number, DailyRecord>()
  for (const [day, { customers, sales }] of entries) {
    map.set(day, {
      sales,
      customers,
      discountAbsolute: 0,
      grossSales: sales,
    } as unknown as DailyRecord)
  }
  return map
}

describe('computeWeeklyActuals', () => {
  it('aggregates customers and sales across day range', () => {
    const daily = makeDaily([
      [1, { customers: 100, sales: 10000 }],
      [2, { customers: 200, sales: 25000 }],
      [3, { customers: 150, sales: 15000 }],
    ])
    const result = computeWeeklyActuals(1, 3, daily)
    expect(result.customers).toBe(450)
    expect(result.sales).toBe(50000)
    // txValue = round(50000 / 450) = 111
    expect(result.txValue).toBe(111)
  })

  it('skips missing days silently', () => {
    const daily = makeDaily([[1, { customers: 100, sales: 10000 }]])
    const result = computeWeeklyActuals(1, 7, daily)
    expect(result.customers).toBe(100)
    expect(result.sales).toBe(10000)
    expect(result.txValue).toBe(100)
  })

  it('returns zero txValue when no customers', () => {
    const daily = makeDaily([])
    const result = computeWeeklyActuals(1, 7, daily)
    expect(result.customers).toBe(0)
    expect(result.sales).toBe(0)
    expect(result.txValue).toBe(0)
  })

  it('respects start and end bounds', () => {
    const daily = makeDaily([
      [1, { customers: 100, sales: 1000 }],
      [2, { customers: 200, sales: 2000 }],
      [3, { customers: 300, sales: 3000 }],
      [4, { customers: 400, sales: 4000 }],
    ])
    const result = computeWeeklyActuals(2, 3, daily)
    expect(result.customers).toBe(500)
    expect(result.sales).toBe(5000)
  })
})

describe('computeDecompPct', () => {
  it('returns custEffect share of absolute total', () => {
    expect(computeDecompPct(100, 300)).toBe(0.25)
  })

  it('uses absolute values (negative custEffect)', () => {
    expect(computeDecompPct(-100, 300)).toBe(0.25)
  })

  it('returns 0 when both effects are 0', () => {
    expect(computeDecompPct(0, 0)).toBe(0)
  })

  it('returns 1 when only custEffect is nonzero', () => {
    expect(computeDecompPct(500, 0)).toBe(1)
  })

  it('returns 0 when only ticketEffect is nonzero', () => {
    expect(computeDecompPct(0, 500)).toBe(0)
  })
})

describe('computeDecompTotals', () => {
  it('sums weekly rows and computes custPct', () => {
    const weekly = [
      { salesDiff: 100, custEffect: 80, ticketEffect: 20 },
      { salesDiff: 200, custEffect: 120, ticketEffect: 80 },
    ]
    const totals = computeDecompTotals(weekly)
    expect(totals.salesDiff).toBe(300)
    expect(totals.custEffect).toBe(200)
    expect(totals.ticketEffect).toBe(100)
    // |200| / (|200| + |100|) = 200/300 ≈ 0.6666
    expect(totals.custPct).toBeCloseTo(2 / 3, 5)
  })

  it('handles empty input', () => {
    const totals = computeDecompTotals([])
    expect(totals).toEqual({
      salesDiff: 0,
      custEffect: 0,
      ticketEffect: 0,
      custPct: 0,
    })
  })

  it('handles single row', () => {
    const totals = computeDecompTotals([{ salesDiff: 50, custEffect: 30, ticketEffect: 20 }])
    expect(totals.salesDiff).toBe(50)
    expect(totals.custEffect).toBe(30)
    expect(totals.ticketEffect).toBe(20)
    expect(totals.custPct).toBeCloseTo(0.6, 5)
  })

  it('handles negative cancelling effects in total', () => {
    const weekly = [
      { salesDiff: 0, custEffect: 100, ticketEffect: -100 },
      { salesDiff: 0, custEffect: -100, ticketEffect: 100 },
    ]
    const totals = computeDecompTotals(weekly)
    expect(totals.custEffect).toBe(0)
    expect(totals.ticketEffect).toBe(0)
    expect(totals.custPct).toBe(0)
  })
})
