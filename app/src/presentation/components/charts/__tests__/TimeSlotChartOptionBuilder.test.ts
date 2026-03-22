import { describe, it, expect } from 'vitest'
import { resolvePrecipitationAxisRange } from '../TimeSlotChartOptionBuilder'

describe('resolvePrecipitationAxisRange', () => {
  it('降水量 ≤ 5mm で 0〜5mm 固定、interval=1', () => {
    expect(resolvePrecipitationAxisRange(0)).toEqual({ min: 0, max: 5, interval: 1 })
    expect(resolvePrecipitationAxisRange(0.2)).toEqual({ min: 0, max: 5, interval: 1 })
    expect(resolvePrecipitationAxisRange(1.0)).toEqual({ min: 0, max: 5, interval: 1 })
    expect(resolvePrecipitationAxisRange(5)).toEqual({ min: 0, max: 5, interval: 1 })
  })

  it('5mm < 降水量 ≤ 10mm で 0〜10mm、interval=2', () => {
    expect(resolvePrecipitationAxisRange(5.1)).toEqual({ min: 0, max: 10, interval: 2 })
    expect(resolvePrecipitationAxisRange(8)).toEqual({ min: 0, max: 10, interval: 2 })
    expect(resolvePrecipitationAxisRange(10)).toEqual({ min: 0, max: 10, interval: 2 })
  })

  it('降水量 > 10mm で 0〜20mm、interval=5', () => {
    expect(resolvePrecipitationAxisRange(10.1)).toEqual({ min: 0, max: 20, interval: 5 })
    expect(resolvePrecipitationAxisRange(15)).toEqual({ min: 0, max: 20, interval: 5 })
    expect(resolvePrecipitationAxisRange(100)).toEqual({ min: 0, max: 20, interval: 5 })
  })
})
