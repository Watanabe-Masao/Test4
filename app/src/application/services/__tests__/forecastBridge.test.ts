/**
 * forecastBridge — 各 public API の smoke + passthrough tests
 *
 * 5 WASM 関数（TS fallback path）と 5 Date 依存関数（TS 直接委譲）。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import {
  calculateStdDev,
  detectAnomalies,
  calculateWMA,
  linearRegression,
  analyzeTrend,
  calculateMonthEndProjection,
  getWeekRanges,
} from '../forecastBridge'

describe('calculateStdDev', () => {
  it('空配列で { mean: 0, stdDev: 0 }', () => {
    const r = calculateStdDev([])
    expect(r.mean).toBe(0)
    expect(r.stdDev).toBe(0)
  })

  it('同値配列は stdDev=0', () => {
    const r = calculateStdDev([100, 100, 100])
    expect(r.mean).toBe(100)
    expect(r.stdDev).toBe(0)
  })

  it('異なる値で stdDev > 0', () => {
    const r = calculateStdDev([1, 2, 3, 4, 5])
    expect(r.mean).toBe(3)
    expect(r.stdDev).toBeGreaterThan(0)
  })
})

describe('detectAnomalies', () => {
  it('空 Map で空配列', () => {
    const r = detectAnomalies(new Map())
    expect(r).toEqual([])
  })

  it('通常データは anomaly なし', () => {
    const daily = new Map([
      [1, 100],
      [2, 100],
      [3, 100],
      [4, 100],
    ])
    const r = detectAnomalies(daily, 2.0)
    // threshold=2 標準偏差の外れ値はなし
    expect(r.length).toBe(0)
  })
})

describe('calculateWMA', () => {
  it('空 Map で空配列', () => {
    expect(calculateWMA(new Map())).toEqual([])
  })

  it('データがあれば結果配列', () => {
    const daily = new Map<number, number>()
    for (let d = 1; d <= 10; d++) daily.set(d, d * 100)
    const r = calculateWMA(daily, 5)
    expect(r.length).toBeGreaterThan(0)
  })
})

describe('linearRegression', () => {
  it('データ数不足で NaN か 0 を許容', () => {
    const r = linearRegression(new Map())
    expect(typeof r.slope).toBe('number')
    expect(typeof r.intercept).toBe('number')
  })

  it('線形データで slope > 0', () => {
    const daily = new Map([
      [1, 100],
      [2, 200],
      [3, 300],
      [4, 400],
    ])
    const r = linearRegression(daily)
    expect(r.slope).toBeGreaterThan(0)
  })
})

describe('analyzeTrend', () => {
  it('空配列で結果オブジェクト', () => {
    const r = analyzeTrend([])
    expect(r).toHaveProperty('overallTrend')
    expect(r.averageMonthlySales).toBe(0)
  })
})

describe('calculateMonthEndProjection', () => {
  it('空日次でも結果オブジェクト', () => {
    const r = calculateMonthEndProjection(2026, 3, new Map())
    expect(r).toHaveProperty('linearProjection')
    expect(r).toHaveProperty('wmaProjection')
  })

  it('1日分データがあれば projection 各種を返す', () => {
    const daily = new Map([[1, 10000]])
    const r = calculateMonthEndProjection(2026, 3, daily)
    expect(typeof r.linearProjection).toBe('number')
    expect(typeof r.wmaProjection).toBe('number')
  })
})

describe('getWeekRanges', () => {
  it('3月（31日）で週範囲を返す', () => {
    const r = getWeekRanges(2026, 3)
    expect(r.length).toBeGreaterThan(0)
    expect(r[0]).toHaveProperty('weekNumber')
    expect(r[0]).toHaveProperty('startDay')
    expect(r[0]).toHaveProperty('endDay')
  })

  it('startDay <= endDay を保証', () => {
    const r = getWeekRanges(2026, 3)
    for (const w of r) {
      expect(w.startDay).toBeLessThanOrEqual(w.endDay)
    }
  })

  it('weekNumber は連番', () => {
    const r = getWeekRanges(2026, 3)
    for (let i = 0; i < r.length; i++) {
      expect(r[i].weekNumber).toBe(i + 1)
    }
  })
})
