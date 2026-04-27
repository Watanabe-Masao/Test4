/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import { buildDowPatternData, DOW_LABELS } from './DowPatternChartLogic'
import type { DowPatternRow } from '@/application/hooks/duckdb'

describe('DOW_LABELS', () => {
  it('contains 7 day labels in Sunday-first order', () => {
    expect(DOW_LABELS).toEqual(['日', '月', '火', '水', '木', '金', '土'])
  })
})

describe('buildDowPatternData', () => {
  it('aggregates sales by dow and computes summary', () => {
    const rows = [
      { dow: 0, avgSales: 100 },
      { dow: 1, avgSales: 200 },
      { dow: 6, avgSales: 300 },
      { dow: 0, avgSales: 50 },
    ] as unknown as DowPatternRow[]

    const result = buildDowPatternData(rows)
    expect(result.chartData).toHaveLength(3)
    expect(result.chartData[0]).toEqual({ dow: 0, label: '日', avgSales: 150 })
    expect(result.chartData[1]).toEqual({ dow: 1, label: '月', avgSales: 200 })
    expect(result.chartData[2]).toEqual({ dow: 6, label: '土', avgSales: 300 })
    // overallAvg = (150+200+300)/3 = 216.666 -> rounded = 217
    expect(result.overallAvg).toBe(217)
    expect(result.strongestDow).toBe('土')
    expect(result.weakestDow).toBe('日')
    expect(result.cv).toBeGreaterThan(0)
  })

  it('returns zero overallAvg on empty input', () => {
    const result = buildDowPatternData([])
    expect(result.chartData).toEqual([])
    expect(result.overallAvg).toBe(0)
    expect(result.strongestDow).toBe('')
    expect(result.weakestDow).toBe('')
  })

  it('handles single dow', () => {
    const rows = [{ dow: 3, avgSales: 500 }] as unknown as DowPatternRow[]
    const result = buildDowPatternData(rows)
    expect(result.chartData).toHaveLength(1)
    expect(result.chartData[0].label).toBe('水')
    expect(result.overallAvg).toBe(500)
    expect(result.strongestDow).toBe('水')
    expect(result.weakestDow).toBe('水')
  })
})
