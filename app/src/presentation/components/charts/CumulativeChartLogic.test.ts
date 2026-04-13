import { describe, it, expect } from 'vitest'
import { buildCumulativeChartData, computeCumulativeSummary } from './CumulativeChartLogic'
import type { DailyCumulativeRow } from '@/application/hooks/duckdb'

const rows = [
  { dateKey: '2025-01-01', dailySales: 100.6, cumulativeSales: 100.6 },
  { dateKey: '2025-01-02', dailySales: 200.4, cumulativeSales: 301 },
  { dateKey: '2025-01-03', dailySales: 99, cumulativeSales: 400 },
] as unknown as DailyCumulativeRow[]

describe('buildCumulativeChartData', () => {
  it('slices date to MM-DD and rounds values', () => {
    const result = buildCumulativeChartData(rows)
    expect(result).toEqual([
      { date: '01-01', daily: 101, cumulative: 101 },
      { date: '01-02', daily: 200, cumulative: 301 },
      { date: '01-03', daily: 99, cumulative: 400 },
    ])
  })

  it('handles empty input', () => {
    const result = buildCumulativeChartData([])
    expect(result).toEqual([])
  })
})

describe('computeCumulativeSummary', () => {
  it('computes totals and average', () => {
    const chart = buildCumulativeChartData(rows)
    const summary = computeCumulativeSummary(chart)
    expect(summary.totalSales).toBe(400)
    expect(summary.dayCount).toBe(3)
    expect(summary.avgDaily).toBe(133)
  })

  it('returns zeros for empty input', () => {
    expect(computeCumulativeSummary([])).toEqual({
      totalSales: 0,
      avgDaily: 0,
      dayCount: 0,
    })
  })

  it('uses last cumulative value as total', () => {
    const chart = [
      { date: '01-01', daily: 50, cumulative: 50 },
      { date: '01-02', daily: 30, cumulative: 80 },
    ]
    const summary = computeCumulativeSummary(chart)
    expect(summary.totalSales).toBe(80)
    expect(summary.avgDaily).toBe(40)
  })
})
