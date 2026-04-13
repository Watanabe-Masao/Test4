import { describe, it, expect } from 'vitest'
import {
  computeBudgetProgress,
  getProgressStatusColor,
  buildPrevYearCumMap,
  enrichChartData,
  computePrevYearComparison,
} from '../BudgetVsActualChart.vm'
import type { DataPoint } from '../BudgetVsActualChart.builders'

const makePoints = (): DataPoint[] => [
  { day: 1, actualCum: 100, budgetCum: 90 },
  { day: 2, actualCum: 210, budgetCum: 180 },
  { day: 3, actualCum: 310, budgetCum: 270 },
  { day: 4, actualCum: 0, budgetCum: 360 },
  { day: 5, actualCum: 0, budgetCum: 450 },
]

describe('computeBudgetProgress', () => {
  it('computes progress based on latest day with sales', () => {
    const result = computeBudgetProgress(makePoints(), 1000, undefined, 10)
    expect(result.currentActual).toBe(310)
    expect(result.currentBudgetCum).toBe(270)
    expect(result.currentDay).toBe(3)
    expect(result.progressRate).toBeCloseTo(310 / 270)
    // avgDaily = 310/3; remaining = 10-3=7; projected = 310 + (310/3)*7
    const expectedProjected = 310 + (310 / 3) * 7
    expect(result.projected).toBeCloseTo(expectedProjected)
    expect(result.projectedAchievement).toBeCloseTo(expectedProjected / 1000)
  })

  it('returns zeros when all actualCum are 0', () => {
    const result = computeBudgetProgress(
      [
        { day: 1, actualCum: 0, budgetCum: 10 },
        { day: 2, actualCum: 0, budgetCum: 20 },
      ],
      100,
      undefined,
      undefined,
    )
    expect(result.currentActual).toBe(0)
    expect(result.currentBudgetCum).toBe(0)
    expect(result.currentDay).toBe(0)
    expect(result.progressRate).toBe(0)
    expect(result.projected).toBe(0)
    expect(result.projectedAchievement).toBe(0)
  })

  it('uses explicit salesDays when provided', () => {
    const result = computeBudgetProgress(makePoints(), 1000, 5, 10)
    // avgDaily = 310/5; remaining = 10-3=7
    const expectedProjected = 310 + (310 / 5) * 7
    expect(result.projected).toBeCloseTo(expectedProjected)
  })

  it('returns 0 progressRate when budgetCum is 0', () => {
    const data: DataPoint[] = [{ day: 1, actualCum: 50, budgetCum: 0 }]
    const result = computeBudgetProgress(data, 0, undefined, 1)
    expect(result.progressRate).toBe(0)
    expect(result.projectedAchievement).toBe(0)
  })
})

describe('getProgressStatusColor', () => {
  it('returns success when >= 1.0', () => {
    expect(getProgressStatusColor(1.0)).toBe('success')
    expect(getProgressStatusColor(1.5)).toBe('success')
  })
  it('returns warning when >= 0.9 and < 1.0', () => {
    expect(getProgressStatusColor(0.9)).toBe('warning')
    expect(getProgressStatusColor(0.99)).toBe('warning')
  })
  it('returns danger when < 0.9', () => {
    expect(getProgressStatusColor(0.89)).toBe('danger')
    expect(getProgressStatusColor(0)).toBe('danger')
  })
})

describe('buildPrevYearCumMap', () => {
  it('returns empty map when prevYearDaily is undefined', () => {
    const map = buildPrevYearCumMap(undefined, 5, 2024, 1)
    expect(map.size).toBe(0)
  })

  it('builds cumulative map keyed by day', () => {
    const daily = new Map<string, { sales: number }>([
      ['2024-03-01', { sales: 100 }],
      ['2024-03-02', { sales: 150 }],
      ['2024-03-03', { sales: 50 }],
    ])
    const map = buildPrevYearCumMap(daily, 3, 2024, 3)
    expect(map.get(1)).toBe(100)
    expect(map.get(2)).toBe(250)
    expect(map.get(3)).toBe(300)
  })

  it('treats missing days as 0', () => {
    const daily = new Map<string, { sales: number }>([['2024-03-02', { sales: 50 }]])
    const map = buildPrevYearCumMap(daily, 3, 2024, 3)
    expect(map.get(1)).toBe(0)
    expect(map.get(2)).toBe(50)
    expect(map.get(3)).toBe(50)
  })
})

describe('enrichChartData', () => {
  it('computes diff/achieveRate for rows with actual, filtering by range', () => {
    const data = makePoints()
    const prevMap = new Map<number, number>([
      [1, 80],
      [2, 160],
      [3, 240],
    ])
    const enriched = enrichChartData(data, prevMap, true, 1, 3)
    expect(enriched).toHaveLength(3)
    expect(enriched[0].diff).toBe(10)
    expect(enriched[0].achieveRate).toBeCloseTo((100 / 90) * 100)
    expect(enriched[0].budgetDiff).toBe(10)
    expect(enriched[0].prevYearDiff).toBe(20)
  })

  it('sets null fields when actualCum is 0', () => {
    const data: DataPoint[] = [{ day: 1, actualCum: 0, budgetCum: 50 }]
    const prevMap = new Map<number, number>([[1, 10]])
    const enriched = enrichChartData(data, prevMap, true, 1, 1)
    expect(enriched[0].diff).toBeNull()
    expect(enriched[0].achieveRate).toBeNull()
    expect(enriched[0].prevYearDiff).toBeNull()
  })

  it('sets prevYearDiff null when hasPrevYearDiff is false', () => {
    const data: DataPoint[] = [{ day: 1, actualCum: 100, budgetCum: 50 }]
    const enriched = enrichChartData(data, new Map([[1, 40]]), false, 1, 5)
    expect(enriched[0].prevYearDiff).toBeNull()
  })
})

describe('computePrevYearComparison', () => {
  it('returns nulls when latestPrevYearCum is null', () => {
    expect(computePrevYearComparison(100, null)).toEqual({ diffAmt: null, growth: null })
  })
  it('computes diff and growth percent', () => {
    const r = computePrevYearComparison(120, 100)
    expect(r.diffAmt).toBe(20)
    expect(r.growth).toBeCloseTo(20)
  })
  it('returns null growth when prev is 0', () => {
    const r = computePrevYearComparison(50, 0)
    expect(r.diffAmt).toBe(50)
    expect(r.growth).toBeNull()
  })
})
