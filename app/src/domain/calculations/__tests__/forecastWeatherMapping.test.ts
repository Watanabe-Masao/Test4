import { describe, it, expect } from 'vitest'
import {
  mapJmaWeatherCodeToWmo,
  mapJmaWeatherCodeToCategory,
} from '../forecastWeatherMapping'

describe('forecastWeatherMapping', () => {
  describe('mapJmaWeatherCodeToWmo', () => {
    it('100系（晴れ）→ WMO 1', () => {
      expect(mapJmaWeatherCodeToWmo('100')).toBe(1)
      expect(mapJmaWeatherCodeToWmo('101')).toBe(1)
      expect(mapJmaWeatherCodeToWmo('110')).toBe(1)
    })

    it('200系（曇り）→ WMO 3', () => {
      expect(mapJmaWeatherCodeToWmo('200')).toBe(3)
      expect(mapJmaWeatherCodeToWmo('201')).toBe(3)
      expect(mapJmaWeatherCodeToWmo('202')).toBe(3)
    })

    it('300系（雨）→ WMO 63', () => {
      expect(mapJmaWeatherCodeToWmo('300')).toBe(63)
      expect(mapJmaWeatherCodeToWmo('302')).toBe(63)
    })

    it('400系（雪）→ WMO 73', () => {
      expect(mapJmaWeatherCodeToWmo('400')).toBe(73)
      expect(mapJmaWeatherCodeToWmo('413')).toBe(73)
    })

    it('不正な値 → WMO 0', () => {
      expect(mapJmaWeatherCodeToWmo('')).toBe(0)
      expect(mapJmaWeatherCodeToWmo('abc')).toBe(0)
    })
  })

  describe('mapJmaWeatherCodeToCategory', () => {
    it('100系 → sunny', () => {
      expect(mapJmaWeatherCodeToCategory('100')).toBe('sunny')
    })

    it('200系 → cloudy', () => {
      expect(mapJmaWeatherCodeToCategory('200')).toBe('cloudy')
    })

    it('300系 → rainy', () => {
      expect(mapJmaWeatherCodeToCategory('300')).toBe('rainy')
    })

    it('400系 → snowy', () => {
      expect(mapJmaWeatherCodeToCategory('400')).toBe('snowy')
    })

    it('不正な値 → other', () => {
      expect(mapJmaWeatherCodeToCategory('')).toBe('other')
    })
  })
})
