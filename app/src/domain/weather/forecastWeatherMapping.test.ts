import { describe, it, expect } from 'vitest'
import { mapJmaWeatherCodeToWmo, mapJmaWeatherCodeToCategory } from './forecastWeatherMapping'

describe('mapJmaWeatherCodeToWmo', () => {
  it('maps 100s (sunny) to 1 (Mainly clear)', () => {
    expect(mapJmaWeatherCodeToWmo('100')).toBe(1)
    expect(mapJmaWeatherCodeToWmo('101')).toBe(1)
    expect(mapJmaWeatherCodeToWmo('199')).toBe(1)
  })

  it('maps 200s (cloudy) to 3 (Overcast)', () => {
    expect(mapJmaWeatherCodeToWmo('200')).toBe(3)
    expect(mapJmaWeatherCodeToWmo('250')).toBe(3)
  })

  it('maps 300s (rainy) to 63 (Rain)', () => {
    expect(mapJmaWeatherCodeToWmo('300')).toBe(63)
    expect(mapJmaWeatherCodeToWmo('302')).toBe(63)
  })

  it('maps 400s (snowy) to 73 (Snow)', () => {
    expect(mapJmaWeatherCodeToWmo('400')).toBe(73)
    expect(mapJmaWeatherCodeToWmo('405')).toBe(73)
  })

  it('returns 0 for unknown category (>=500)', () => {
    expect(mapJmaWeatherCodeToWmo('500')).toBe(0)
    expect(mapJmaWeatherCodeToWmo('999')).toBe(0)
  })

  it('returns 0 for invalid non-numeric input', () => {
    expect(mapJmaWeatherCodeToWmo('abc')).toBe(0)
    expect(mapJmaWeatherCodeToWmo('')).toBe(0)
  })

  it('returns 0 for code less than 100', () => {
    expect(mapJmaWeatherCodeToWmo('0')).toBe(0)
    expect(mapJmaWeatherCodeToWmo('50')).toBe(0)
  })
})

describe('mapJmaWeatherCodeToCategory', () => {
  it('maps 100s to sunny', () => {
    expect(mapJmaWeatherCodeToCategory('100')).toBe('sunny')
    expect(mapJmaWeatherCodeToCategory('150')).toBe('sunny')
  })

  it('maps 200s to cloudy', () => {
    expect(mapJmaWeatherCodeToCategory('200')).toBe('cloudy')
    expect(mapJmaWeatherCodeToCategory('201')).toBe('cloudy')
  })

  it('maps 300s to rainy', () => {
    expect(mapJmaWeatherCodeToCategory('300')).toBe('rainy')
    expect(mapJmaWeatherCodeToCategory('301')).toBe('rainy')
  })

  it('maps 400s to snowy', () => {
    expect(mapJmaWeatherCodeToCategory('400')).toBe('snowy')
  })

  it('returns other for unknown codes', () => {
    expect(mapJmaWeatherCodeToCategory('500')).toBe('other')
    expect(mapJmaWeatherCodeToCategory('50')).toBe('other')
  })

  it('returns other for non-numeric input', () => {
    expect(mapJmaWeatherCodeToCategory('abc')).toBe('other')
    expect(mapJmaWeatherCodeToCategory('')).toBe('other')
  })
})
