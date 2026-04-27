/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import {
  cellKey,
  buildHeatmapData,
  hexToRgb,
  interpolateColor,
  buildDiffMap,
  HOUR_MIN,
  HOUR_MAX,
  Z_SCORE_THRESHOLD,
  DOW_LABELS,
  DOW_ORDER,
} from '../HeatmapChart.helpers'
import type { HourDowMatrixRow } from '@/application/queries/cts/HourDowMatrixHandler'

describe('constants', () => {
  it('exposes hour bounds and z-score threshold', () => {
    expect(HOUR_MIN).toBe(6)
    expect(HOUR_MAX).toBe(22)
    expect(Z_SCORE_THRESHOLD).toBe(2.0)
    expect(DOW_LABELS.length).toBe(7)
    expect(DOW_ORDER).toEqual([1, 2, 3, 4, 5, 6, 0])
  })
})

describe('cellKey', () => {
  it('formats hour-dow key', () => {
    expect(cellKey(10, 3)).toBe('10-3')
    expect(cellKey(0, 0)).toBe('0-0')
  })
})

describe('hexToRgb', () => {
  it('parses lowercase 6-digit hex', () => {
    expect(hexToRgb('#ff8000')).toEqual({ r: 255, g: 128, b: 0 })
  })
  it('parses uppercase', () => {
    expect(hexToRgb('#00FFAA')).toEqual({ r: 0, g: 255, b: 170 })
  })
  it('returns null for invalid hex', () => {
    expect(hexToRgb('not-a-hex')).toBeNull()
    expect(hexToRgb('#fff')).toBeNull()
    expect(hexToRgb('#gggggg')).toBeNull()
  })
})

describe('interpolateColor', () => {
  it('returns background color when ratio is 0', () => {
    const color = interpolateColor(0, '#000000', '#ffffff')
    expect(color).toBe('rgb(0, 0, 0)')
  })
  it('returns primary color when ratio is 1', () => {
    const color = interpolateColor(1, '#000000', '#ffffff')
    expect(color).toBe('rgb(255, 255, 255)')
  })
  it('linearly interpolates at ratio 0.5', () => {
    const color = interpolateColor(0.5, '#000000', '#ffffff')
    expect(color).toBe('rgb(128, 128, 128)')
  })
  it('returns bg unchanged when parse fails', () => {
    expect(interpolateColor(0.5, 'bad', '#ffffff')).toBe('bad')
  })
})

describe('buildHeatmapData', () => {
  it('returns empty zero-state for empty input', () => {
    const result = buildHeatmapData([])
    expect(result.cells.size).toBe(0)
    expect(result.maxValue).toBe(0)
    expect(result.anomalyCount).toBe(0)
    expect(result.peakValue).toBe(0)
  })

  it('filters out hours outside [HOUR_MIN, HOUR_MAX]', () => {
    const rows: HourDowMatrixRow[] = [
      { hour: 5, dow: 1, amount: 999, dayCount: 1 },
      { hour: 23, dow: 1, amount: 999, dayCount: 1 },
      { hour: 10, dow: 1, amount: 100, dayCount: 1 },
    ]
    const result = buildHeatmapData(rows)
    expect(result.cells.size).toBe(1)
    expect(result.cells.get(cellKey(10, 1))).toBeDefined()
  })

  it('computes daily averages from amount/dayCount', () => {
    const rows: HourDowMatrixRow[] = [
      { hour: 10, dow: 1, amount: 1000, dayCount: 4 },
      { hour: 11, dow: 1, amount: 2000, dayCount: 4 },
    ]
    const result = buildHeatmapData(rows)
    expect(result.cells.get(cellKey(10, 1))?.dailyAvg).toBe(250)
    expect(result.cells.get(cellKey(11, 1))?.dailyAvg).toBe(500)
    expect(result.maxValue).toBe(500)
    expect(result.peakHour).toBe(11)
    expect(result.peakDow).toBe(1)
    expect(result.peakValue).toBe(500)
  })

  it('identifies anomalies by z-score threshold', () => {
    // One outlier dominates: most cells equal, one very large → high z-score
    const rows: HourDowMatrixRow[] = []
    for (let h = 6; h <= 20; h++) {
      rows.push({ hour: h, dow: 1, amount: 100, dayCount: 1 })
    }
    rows.push({ hour: 21, dow: 1, amount: 100000, dayCount: 1 })
    const result = buildHeatmapData(rows)
    expect(result.anomalyCount).toBeGreaterThanOrEqual(1)
    expect(result.cells.get(cellKey(21, 1))?.isAnomaly).toBe(true)
  })

  it('treats zero dayCount as avg 0', () => {
    const rows: HourDowMatrixRow[] = [
      { hour: 10, dow: 1, amount: 999, dayCount: 0 },
      { hour: 11, dow: 1, amount: 100, dayCount: 1 },
    ]
    const result = buildHeatmapData(rows)
    expect(result.cells.get(cellKey(10, 1))?.dailyAvg).toBe(0)
    expect(result.cells.get(cellKey(11, 1))?.dailyAvg).toBe(100)
  })
})

describe('buildDiffMap', () => {
  it('returns 0 when both sides empty', () => {
    const map = buildDiffMap([], [])
    expect(map.size).toBe(0)
  })

  it('computes growth ratio from prev to current', () => {
    const cur: HourDowMatrixRow[] = [{ hour: 10, dow: 1, amount: 200, dayCount: 1 }]
    const prev: HourDowMatrixRow[] = [{ hour: 10, dow: 1, amount: 100, dayCount: 1 }]
    const map = buildDiffMap(cur, prev)
    expect(map.get(cellKey(10, 1))).toBeCloseTo(1)
  })

  it('returns 1 when prev is 0 but cur > 0', () => {
    const cur: HourDowMatrixRow[] = [{ hour: 10, dow: 1, amount: 100, dayCount: 1 }]
    const map = buildDiffMap(cur, [])
    expect(map.get(cellKey(10, 1))).toBe(1)
  })

  it('returns 0 when both cur and prev are 0', () => {
    const cur: HourDowMatrixRow[] = [{ hour: 10, dow: 1, amount: 0, dayCount: 1 }]
    const prev: HourDowMatrixRow[] = [{ hour: 10, dow: 1, amount: 0, dayCount: 1 }]
    const map = buildDiffMap(cur, prev)
    expect(map.get(cellKey(10, 1))).toBe(0)
  })

  it('filters out-of-range hours', () => {
    const cur: HourDowMatrixRow[] = [{ hour: 3, dow: 1, amount: 100, dayCount: 1 }]
    const prev: HourDowMatrixRow[] = [{ hour: 3, dow: 1, amount: 50, dayCount: 1 }]
    const map = buildDiffMap(cur, prev)
    expect(map.size).toBe(0)
  })
})
