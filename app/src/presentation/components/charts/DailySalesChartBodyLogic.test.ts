/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import {
  withAlpha,
  grad,
  pluck,
  deriveCompStartDateKey,
  rightAxisFormatter,
  buildWeatherMap,
  ALL_LABELS,
  HIDDEN_NAMES,
  PERCENT_SERIES,
  TEMPERATURE_SERIES,
} from './DailySalesChartBodyLogic'
import type { DailyWeatherSummary } from '@/domain/models/record'

describe('constants', () => {
  it('ALL_LABELS has Japanese labels', () => {
    expect(ALL_LABELS.sales).toBe('売上')
    expect(ALL_LABELS.quantity).toBe('点数')
  })

  it('HIDDEN_NAMES contains waterfall base helpers', () => {
    expect(HIDDEN_NAMES.has('wfYoyBase')).toBe(true)
    expect(HIDDEN_NAMES.has('bandUpper')).toBe(true)
    expect(HIDDEN_NAMES.has('sales')).toBe(false)
  })

  it('PERCENT_SERIES contains budgetRate and prevYearRate', () => {
    expect(PERCENT_SERIES.has('budgetRate')).toBe(true)
    expect(PERCENT_SERIES.has('prevYearRate')).toBe(true)
  })

  it('TEMPERATURE_SERIES contains tempMax/tempMin', () => {
    expect(TEMPERATURE_SERIES.has('tempMax')).toBe(true)
    expect(TEMPERATURE_SERIES.has('prevTempMax')).toBe(true)
  })
})

describe('withAlpha', () => {
  it('converts hex to rgba', () => {
    expect(withAlpha('#ff0000', 0.5)).toBe('rgba(255,0,0,0.5)')
    expect(withAlpha('#00ff00', 1)).toBe('rgba(0,255,0,1)')
    expect(withAlpha('#0000ff', 0)).toBe('rgba(0,0,255,0)')
  })
})

describe('grad', () => {
  it('builds a linear gradient object with colorStops', () => {
    const g = grad('#ff0000', 0.8, 0.2) as {
      type: string
      x: number
      y: number
      x2: number
      y2: number
      colorStops: { offset: number; color: string }[]
    }
    expect(g.type).toBe('linear')
    expect(g.x).toBe(0)
    expect(g.y).toBe(0)
    expect(g.x2).toBe(0)
    expect(g.y2).toBe(1)
    expect(g.colorStops).toHaveLength(2)
    expect(g.colorStops[0]).toEqual({ offset: 0, color: 'rgba(255,0,0,0.8)' })
    expect(g.colorStops[1]).toEqual({ offset: 1, color: 'rgba(255,0,0,0.2)' })
  })
})

describe('pluck', () => {
  it('extracts numeric values from array', () => {
    const arr = [{ a: 1 }, { a: 2 }, { a: 3 }]
    expect(pluck(arr, 'a')).toEqual([1, 2, 3])
  })

  it('returns null for null/undefined values', () => {
    const arr = [{ a: 5 }, { a: null }, { a: undefined }]
    expect(pluck(arr, 'a')).toEqual([5, null, null])
  })

  it('handles empty input', () => {
    expect(pluck([], 'x')).toEqual([])
  })
})

describe('deriveCompStartDateKey', () => {
  it('returns undefined when dowOffset is 0', () => {
    expect(deriveCompStartDateKey(0, 2025, 3)).toBeUndefined()
  })

  it('returns undefined when year or month is missing', () => {
    expect(deriveCompStartDateKey(2, undefined, 3)).toBeUndefined()
    expect(deriveCompStartDateKey(2, 2025, undefined)).toBeUndefined()
  })

  it('returns previous-year date shifted by dowOffset', () => {
    // dowOffset=2, year=2025, month=3 => prev year 2024, day = 1+2 = 3
    expect(deriveCompStartDateKey(2, 2025, 3)).toBe('2024-03-03')
  })

  it('pads single-digit month/day', () => {
    expect(deriveCompStartDateKey(1, 2025, 1)).toBe('2024-01-02')
  })
})

describe('rightAxisFormatter', () => {
  it('returns °C formatter for temperature mode', () => {
    const fmt = rightAxisFormatter('temperature')
    expect(fmt(25)).toBe('25°C')
  })

  it('returns number formatter for other modes', () => {
    const fmtQty = rightAxisFormatter('quantity')
    expect(fmtQty(1234)).toBe((1234).toLocaleString())
    const fmtCust = rightAxisFormatter('customers')
    expect(fmtCust(100)).toBe((100).toLocaleString())
  })
})

describe('buildWeatherMap', () => {
  it('returns empty map when weatherDaily is undefined', () => {
    const m = buildWeatherMap(undefined)
    expect(m.size).toBe(0)
  })

  it('maps day number to weather info with dowOffset=0', () => {
    const weather = [
      {
        dateKey: '2025-03-01',
        dominantWeatherCode: 100,
        temperatureAvg: 15.4,
        temperatureMax: 20.6,
        temperatureMin: 10.2,
        weatherTextDay: '晴れ',
        weatherTextNight: undefined,
      },
    ] as unknown as DailyWeatherSummary[]
    const m = buildWeatherMap(weather, 0)
    expect(m.size).toBe(1)
    const info = m.get(1)!
    expect(info.temp).toBe(15)
    expect(info.max).toBe(21)
    expect(info.min).toBe(10)
    expect(info.weatherText).toBe('晴れ')
  })

  it('skips days with chartDay < 1 when dowOffset provided', () => {
    const weather = [
      {
        dateKey: '2025-03-01',
        dominantWeatherCode: 100,
        temperatureAvg: 15,
        temperatureMax: 20,
        temperatureMin: 10,
        weatherTextDay: 'sunny',
      },
      {
        dateKey: '2025-03-05',
        dominantWeatherCode: 100,
        temperatureAvg: 15,
        temperatureMax: 20,
        temperatureMin: 10,
      },
    ] as unknown as DailyWeatherSummary[]
    const m = buildWeatherMap(weather, 2)
    // day 1 -> 1-2 = -1 skipped; day 5 -> 5-2 = 3 kept
    expect(m.size).toBe(1)
    expect(m.has(3)).toBe(true)
  })

  it('uses compStartDateKey to handle month crossing', () => {
    const weather = [
      {
        dateKey: '2024-03-03',
        dominantWeatherCode: 200,
        temperatureAvg: 10,
        temperatureMax: 15,
        temperatureMin: 5,
      },
      {
        dateKey: '2024-03-05',
        dominantWeatherCode: 200,
        temperatureAvg: 12,
        temperatureMax: 17,
        temperatureMin: 7,
      },
    ] as unknown as DailyWeatherSummary[]
    // compStart 2024-03-03 -> day 1
    const m = buildWeatherMap(weather, 0, '2024-03-03')
    expect(m.has(1)).toBe(true)
    expect(m.has(3)).toBe(true)
    expect(m.get(1)!.temp).toBe(10)
    expect(m.get(3)!.temp).toBe(12)
  })
})
