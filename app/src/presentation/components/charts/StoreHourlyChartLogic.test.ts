import { describe, it, expect } from 'vitest'
import {
  cosineSimilarity,
  findCoreTime,
  buildStoreHourlyData,
  CORE_THRESHOLD,
} from './StoreHourlyChartLogic'
import type { StoreAggregationRow } from '@/application/hooks/duckdb'

describe('CORE_THRESHOLD', () => {
  it('is 0.8', () => {
    expect(CORE_THRESHOLD).toBe(0.8)
  })
})

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1)
  })

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0)
  })

  it('returns 0 when one vector is zero', () => {
    expect(cosineSimilarity([0, 0], [1, 2])).toBe(0)
  })

  it('is positive for positively correlated vectors', () => {
    const s = cosineSimilarity([1, 2, 3], [2, 4, 6])
    expect(s).toBeCloseTo(1)
  })
})

describe('findCoreTime', () => {
  it('returns hourMin/hourMax/12 when total is zero', () => {
    const map = new Map<number, number>([
      [10, 0],
      [11, 0],
    ])
    const result = findCoreTime(map, 9, 18)
    expect(result).toEqual({ start: 9, end: 18, turnover: 12 })
  })

  it('picks core hours spanning 80% of sales sorted by amount', () => {
    const map = new Map<number, number>([
      [11, 400],
      [12, 500],
      [13, 100],
    ])
    const result = findCoreTime(map, 10, 15)
    expect(result.start).toBe(11)
    expect(result.end).toBe(12)
  })
})

describe('buildStoreHourlyData', () => {
  it('aggregates per store per hour in amount mode', () => {
    const rows = [
      { storeId: 's1', hour: 10, amount: 100 },
      { storeId: 's1', hour: 11, amount: 200 },
      { storeId: 's2', hour: 10, amount: 50 },
      { storeId: 's2', hour: 11, amount: 150 },
    ] as unknown as StoreAggregationRow[]
    const storesMap = new Map<string, { name: string }>([
      ['s1', { name: 'Store1' }],
      ['s2', { name: 'Store2' }],
    ])

    const result = buildStoreHourlyData(rows, storesMap, 'amount', 10, 11)
    expect(result.chartData).toHaveLength(2)
    expect(result.chartData[0].hour).toBe('10時')
    expect(result.chartData[0].hourNum).toBe(10)
    expect(result.chartData[0].store_s1).toBe(100)
    expect(result.chartData[0].store_s2).toBe(50)
    expect(result.chartData[1].store_s1).toBe(200)

    expect(result.storeInfos).toHaveLength(2)
    const s1 = result.storeInfos[0]
    expect(s1.storeId).toBe('s1')
    expect(s1.name).toBe('Store1')
    expect(s1.peakHour).toBe(11)
    expect(s1.peakAmount).toBe(200)
    expect(s1.totalAmount).toBe(300)
    expect(s1.hourlyPattern).toEqual([100, 200])
  })

  it('computes ratio mode as percentages', () => {
    const rows = [
      { storeId: 's1', hour: 10, amount: 75 },
      { storeId: 's2', hour: 10, amount: 25 },
    ] as unknown as StoreAggregationRow[]
    const storesMap = new Map<string, { name: string }>([
      ['s1', { name: 'Store1' }],
      ['s2', { name: 'Store2' }],
    ])

    const result = buildStoreHourlyData(rows, storesMap, 'ratio', 10, 10)
    expect(result.chartData[0].store_s1).toBe(75)
    expect(result.chartData[0].store_s2).toBe(25)
  })

  it('falls back to storeId when name missing and computes similarities', () => {
    const rows = [
      { storeId: 'a', hour: 10, amount: 100 },
      { storeId: 'a', hour: 11, amount: 200 },
      { storeId: 'b', hour: 10, amount: 100 },
      { storeId: 'b', hour: 11, amount: 200 },
    ] as unknown as StoreAggregationRow[]
    const storesMap = new Map<string, { name: string }>()

    const result = buildStoreHourlyData(rows, storesMap, 'amount', 10, 11)
    expect(result.storeInfos[0].name).toBe('a')
    expect(result.similarities).toHaveLength(1)
    expect(result.similarities[0].similarity).toBeCloseTo(1)
  })
})
