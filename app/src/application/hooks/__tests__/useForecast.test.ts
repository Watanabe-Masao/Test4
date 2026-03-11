import { describe, it, expect } from 'vitest'
import { calculateForecast, getWeekRanges } from '../useForecast'

describe('useForecast re-exports', () => {
  it('calculateForecast が関数としてエクスポートされる', () => {
    expect(typeof calculateForecast).toBe('function')
  })

  it('getWeekRanges が関数としてエクスポートされる', () => {
    expect(typeof getWeekRanges).toBe('function')
  })
})
