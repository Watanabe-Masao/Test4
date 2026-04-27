/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import { computeMovingAverage, type MovingAveragePoint } from './computeMovingAverage'

const ok = (v: number): MovingAveragePoint => ({ value: v, status: 'ok' })
const missing: MovingAveragePoint = { value: null, status: 'missing' }

describe('computeMovingAverage', () => {
  it('returns the original ok values when windowSize=1', () => {
    const series = [ok(10), ok(20), ok(30)]
    const result = computeMovingAverage(series, 1, 'partial')
    expect(result).toEqual([
      { value: 10, status: 'ok' },
      { value: 20, status: 'ok' },
      { value: 30, status: 'ok' },
    ])
  })

  it('marks leading positions (< windowSize) as missing', () => {
    const series = [ok(10), ok(20), ok(30), ok(40)]
    const result = computeMovingAverage(series, 3, 'strict')
    // first two positions cannot form a full window of 3
    expect(result[0]).toEqual({ value: null, status: 'missing' })
    expect(result[1]).toEqual({ value: null, status: 'missing' })
    expect(result[2]).toEqual({ value: 20, status: 'ok' }) // (10+20+30)/3
    expect(result[3]).toEqual({ value: 30, status: 'ok' }) // (20+30+40)/3
  })

  it('strict policy returns missing when any point in window is missing', () => {
    const series = [ok(10), missing, ok(30), ok(40), ok(50)]
    const result = computeMovingAverage(series, 3, 'strict')
    // window at index 2: [10, missing, 30] → missing
    expect(result[2]).toEqual({ value: null, status: 'missing' })
    // window at index 3: [missing, 30, 40] → missing
    expect(result[3]).toEqual({ value: null, status: 'missing' })
    // window at index 4: [30, 40, 50] → ok, avg=40
    expect(result[4]).toEqual({ value: 40, status: 'ok' })
  })

  it('partial policy averages only ok values in window', () => {
    const series = [ok(10), missing, ok(30), ok(50)]
    const result = computeMovingAverage(series, 3, 'partial')
    // index 2 window: [10, missing, 30] → (10+30)/2 = 20
    expect(result[2]).toEqual({ value: 20, status: 'ok' })
    // index 3 window: [missing, 30, 50] → (30+50)/2 = 40
    expect(result[3]).toEqual({ value: 40, status: 'ok' })
  })

  it('partial policy returns missing when all window values are missing', () => {
    const series = [ok(10), missing, missing, missing]
    const result = computeMovingAverage(series, 3, 'partial')
    // index 3 window: [missing, missing, missing] → missing
    expect(result[3]).toEqual({ value: null, status: 'missing' })
  })

  it('returns empty result for empty input', () => {
    expect(computeMovingAverage([], 3, 'strict')).toEqual([])
    expect(computeMovingAverage([], 3, 'partial')).toEqual([])
  })

  it('correctly computes average for simple integer series', () => {
    const series = [ok(2), ok(4), ok(6), ok(8), ok(10)]
    const result = computeMovingAverage(series, 2, 'strict')
    expect(result[0]).toEqual({ value: null, status: 'missing' })
    expect(result[1]).toEqual({ value: 3, status: 'ok' })
    expect(result[2]).toEqual({ value: 5, status: 'ok' })
    expect(result[3]).toEqual({ value: 7, status: 'ok' })
    expect(result[4]).toEqual({ value: 9, status: 'ok' })
  })
})
