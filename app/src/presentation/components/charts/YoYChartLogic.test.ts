import { describe, it, expect } from 'vitest'
import {
  buildYoYChartData,
  buildYoYWaterfallData,
  computeYoYSummary,
} from './YoYChartLogic'
import type { YoyDailyRow } from '@/application/hooks/duckdb'

const rows = [
  { curDateKey: '2025-01-01', curSales: 100, prevSales: 80 },
  { curDateKey: '2025-01-02', curSales: 150, prevSales: 200 },
  { curDateKey: '2025-01-01', curSales: 50, prevSales: 20 },
  { curDateKey: '2025-01-03', curSales: 300, prevSales: null },
] as unknown as YoyDailyRow[]

describe('buildYoYChartData', () => {
  it('aggregates daily sales and sorts ascending', () => {
    const result = buildYoYChartData(rows)
    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({ date: '01-01', curSales: 150, prevSales: 100, diff: 50 })
    expect(result[1]).toEqual({ date: '01-02', curSales: 150, prevSales: 200, diff: -50 })
    expect(result[2]).toEqual({ date: '01-03', curSales: 300, prevSales: null, diff: 300 })
  })

  it('skips rows with null curDateKey', () => {
    const invalid = [
      { curDateKey: null, curSales: 100, prevSales: 50 },
      { curDateKey: '2025-02-01', curSales: 40, prevSales: 30 },
    ] as unknown as YoyDailyRow[]
    const result = buildYoYChartData(invalid)
    expect(result).toHaveLength(1)
    expect(result[0].date).toBe('02-01')
  })

  it('handles empty input', () => {
    expect(buildYoYChartData([])).toEqual([])
  })
})

describe('buildYoYWaterfallData', () => {
  it('builds waterfall with totals and deltas', () => {
    const chart = [
      { date: '01-01', curSales: 150, prevSales: 100, diff: 50 },
      { date: '01-02', curSales: 150, prevSales: 200, diff: -50 },
    ]
    const items = buildYoYWaterfallData(chart)
    expect(items).toHaveLength(4)
    expect(items[0]).toEqual({
      name: '前年計',
      value: 300,
      base: 0,
      bar: 300,
      isTotal: true,
    })
    // Positive diff: base = running (300), bar = 50
    expect(items[1]).toEqual({
      name: '01-01',
      value: 50,
      base: 300,
      bar: 50,
    })
    // Negative diff: base = running (350) + diff (-50) = 300, bar = 50
    expect(items[2]).toEqual({
      name: '01-02',
      value: -50,
      base: 300,
      bar: 50,
    })
    expect(items[3]).toEqual({
      name: '当年計',
      value: 300,
      base: 0,
      bar: 300,
      isTotal: true,
    })
  })
})

describe('computeYoYSummary', () => {
  it('computes totals, diffs and growth rate', () => {
    const chart = [
      { date: '01-01', curSales: 150, prevSales: 100, diff: 50 },
      { date: '01-02', curSales: 150, prevSales: 200, diff: -50 },
    ]
    const summary = computeYoYSummary(chart)
    expect(summary.totalCur).toBe(300)
    expect(summary.totalPrev).toBe(300)
    expect(summary.totalDiff).toBe(0)
    expect(summary.growthRate).toBe(0)
  })

  it('returns null growthRate when totalPrev is zero', () => {
    const chart = [{ date: '01-01', curSales: 100, prevSales: null, diff: 100 }]
    const summary = computeYoYSummary(chart)
    expect(summary.totalPrev).toBe(0)
    expect(summary.growthRate).toBeNull()
    expect(summary.totalCur).toBe(100)
  })
})
