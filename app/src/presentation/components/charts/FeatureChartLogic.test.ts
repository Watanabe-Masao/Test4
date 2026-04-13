import { describe, it, expect } from 'vitest'
import { buildFeatureChartData, Z_SCORE_THRESHOLD } from './FeatureChartLogic'
import type { DailyFeatureRow } from '@/application/hooks/duckdb'

describe('Z_SCORE_THRESHOLD', () => {
  it('is 2.0 by default', () => {
    expect(Z_SCORE_THRESHOLD).toBe(2.0)
  })
})

describe('buildFeatureChartData', () => {
  it('aggregates sales by date, computes avg z-score and tags spikes', () => {
    const rows = [
      {
        dateKey: '2025-01-01',
        sales: 100.4,
        salesMa3: 90,
        salesMa7: 85,
        salesMa28: 80,
        zScore: 0.5,
      },
      {
        dateKey: '2025-01-01',
        sales: 50,
        salesMa3: 40,
        salesMa7: 30,
        salesMa28: 20,
        zScore: 1.5,
      },
      {
        dateKey: '2025-01-02',
        sales: 500,
        salesMa3: 400,
        salesMa7: 0,
        salesMa28: 0,
        zScore: 3.5,
      },
      {
        dateKey: '2025-01-03',
        sales: 10,
        salesMa3: 0,
        salesMa7: 0,
        salesMa28: 0,
        zScore: -2.5,
      },
    ] as unknown as DailyFeatureRow[]

    const result = buildFeatureChartData(rows)
    expect(result.chartData).toHaveLength(3)

    expect(result.chartData[0].date).toBe('01-01')
    expect(result.chartData[0].sales).toBe(150)
    expect(result.chartData[0].ma3).toBe(130)
    expect(result.chartData[0].ma7).toBe(115)
    expect(result.chartData[0].ma28).toBe(100)
    expect(result.chartData[0].zScore).toBe(1)
    expect(result.chartData[0].anomaly).toBe(0)

    expect(result.chartData[1].date).toBe('01-02')
    expect(result.chartData[1].sales).toBe(500)
    expect(result.chartData[1].ma3).toBe(400)
    expect(result.chartData[1].ma7).toBeNull()
    expect(result.chartData[1].ma28).toBeNull()
    expect(result.chartData[1].zScore).toBe(3.5)
    expect(result.chartData[1].anomaly).toBe(500)

    expect(result.chartData[2].date).toBe('01-03')
    expect(result.chartData[2].zScore).toBe(-2.5)
    expect(result.chartData[2].anomaly).toBe(10)

    expect(result.anomalies).toHaveLength(2)
    expect(result.anomalies[0]).toEqual({
      date: '2025-01-02',
      sales: 500,
      zScore: 3.5,
      type: 'spike',
    })
    expect(result.anomalies[1]).toEqual({
      date: '2025-01-03',
      sales: 10,
      zScore: -2.5,
      type: 'dip',
    })
  })

  it('returns empty data on empty input', () => {
    const result = buildFeatureChartData([])
    expect(result.chartData).toEqual([])
    expect(result.anomalies).toEqual([])
  })

  it('produces null zScore when no row has zScore', () => {
    const rows = [
      {
        dateKey: '2025-01-01',
        sales: 100,
        salesMa3: 0,
        salesMa7: 0,
        salesMa28: 0,
        zScore: null,
      },
    ] as unknown as DailyFeatureRow[]
    const result = buildFeatureChartData(rows)
    expect(result.chartData[0].zScore).toBeNull()
    expect(result.chartData[0].anomaly).toBe(0)
    expect(result.anomalies).toEqual([])
  })
})
