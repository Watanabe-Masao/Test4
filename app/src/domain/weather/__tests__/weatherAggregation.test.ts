import { describe, it, expect } from 'vitest'
import {
  aggregateHourlyToDaily,
  categorizeWeatherCode,
  deriveWeatherCode,
  toWeatherDisplay,
  weatherCategoryLabel,
  weatherCategoryIcon,
} from '@/domain/weather/weatherAggregation'
import type { HourlyWeatherRecord } from '@/domain/models/WeatherData'

function mkRec(partial: Partial<HourlyWeatherRecord>): HourlyWeatherRecord {
  return {
    dateKey: '2026-04-01',
    hour: 12,
    temperature: 20,
    humidity: 50,
    precipitation: 0,
    windSpeed: 5,
    weatherCode: 0,
    sunshineDuration: 3600,
    ...partial,
  }
}

describe('categorizeWeatherCode', () => {
  it('classifies canonical WMO codes', () => {
    expect(categorizeWeatherCode(0)).toBe('sunny')
    expect(categorizeWeatherCode(1)).toBe('sunny')
    expect(categorizeWeatherCode(2)).toBe('cloudy')
    expect(categorizeWeatherCode(3)).toBe('cloudy')
    expect(categorizeWeatherCode(45)).toBe('cloudy') // fog
    expect(categorizeWeatherCode(55)).toBe('rainy') // drizzle
    expect(categorizeWeatherCode(65)).toBe('rainy') // rain
    expect(categorizeWeatherCode(75)).toBe('snowy') // snow
    expect(categorizeWeatherCode(82)).toBe('rainy') // rain showers
    expect(categorizeWeatherCode(86)).toBe('snowy') // snow showers
    expect(categorizeWeatherCode(95)).toBe('rainy') // thunderstorm
  })

  it('returns other for out-of-range', () => {
    expect(categorizeWeatherCode(150)).toBe('other')
  })
})

describe('deriveWeatherCode', () => {
  it('returns clear sky for high sunshine and no precipitation', () => {
    expect(deriveWeatherCode(0, 0.8)).toBe(0)
  })

  it('returns partly cloudy for moderate sunshine', () => {
    expect(deriveWeatherCode(0, 0.3)).toBe(2)
  })

  it('returns overcast for low sunshine', () => {
    expect(deriveWeatherCode(0, 0.1)).toBe(3)
  })

  it('returns drizzle for light rain with warm temp', () => {
    expect(deriveWeatherCode(0.5, 0, 10)).toBe(51)
  })

  it('returns moderate rain for medium rain with warm temp', () => {
    expect(deriveWeatherCode(2, 0, 10)).toBe(61)
  })

  it('returns heavy rain for strong rain with warm temp', () => {
    expect(deriveWeatherCode(10, 0, 10)).toBe(65)
  })

  it('returns light snow for light precipitation when cold', () => {
    expect(deriveWeatherCode(0.5, 0, -2)).toBe(71)
  })

  it('returns moderate snow when cold', () => {
    expect(deriveWeatherCode(2, 0, -5)).toBe(71)
  })

  it('returns heavy snow when cold', () => {
    expect(deriveWeatherCode(10, 0, -5)).toBe(75)
  })

  it('defaults to rain when temperature is omitted', () => {
    expect(deriveWeatherCode(2, 0)).toBe(61)
  })
})

describe('toWeatherDisplay', () => {
  it('returns null for nullish code', () => {
    expect(toWeatherDisplay(null)).toBeNull()
    expect(toWeatherDisplay(undefined)).toBeNull()
  })

  it('returns display info for a sunny code', () => {
    const d = toWeatherDisplay(0)
    expect(d).not.toBeNull()
    expect(d!.category).toBe('sunny')
    expect(d!.label).toBe('晴れ')
    expect(d!.icon).toBeTruthy()
  })

  it('returns display info for a rainy code', () => {
    const d = toWeatherDisplay(65)
    expect(d!.category).toBe('rainy')
    expect(d!.label).toBe('雨')
  })
})

describe('weatherCategoryLabel / weatherCategoryIcon', () => {
  it('returns Japanese labels', () => {
    expect(weatherCategoryLabel('sunny')).toBe('晴れ')
    expect(weatherCategoryLabel('cloudy')).toBe('曇り')
    expect(weatherCategoryLabel('rainy')).toBe('雨')
    expect(weatherCategoryLabel('snowy')).toBe('雪')
    expect(weatherCategoryLabel('other')).toBe('不明')
  })

  it('returns non-empty icons', () => {
    expect(weatherCategoryIcon('sunny').length).toBeGreaterThan(0)
    expect(weatherCategoryIcon('cloudy').length).toBeGreaterThan(0)
    expect(weatherCategoryIcon('rainy').length).toBeGreaterThan(0)
    expect(weatherCategoryIcon('snowy').length).toBeGreaterThan(0)
    expect(weatherCategoryIcon('other').length).toBeGreaterThan(0)
  })
})

describe('aggregateHourlyToDaily', () => {
  it('returns empty array for empty input', () => {
    expect(aggregateHourlyToDaily([])).toEqual([])
  })

  it('aggregates a single-day set of hourly records', () => {
    const recs: HourlyWeatherRecord[] = [
      mkRec({
        hour: 10,
        temperature: 10,
        precipitation: 0,
        humidity: 40,
        windSpeed: 5,
        sunshineDuration: 3600,
        weatherCode: 0,
      }),
      mkRec({
        hour: 11,
        temperature: 20,
        precipitation: 1,
        humidity: 60,
        windSpeed: 10,
        sunshineDuration: 1800,
        weatherCode: 0,
      }),
    ]
    const out = aggregateHourlyToDaily(recs)
    expect(out).toHaveLength(1)
    const day = out[0]
    expect(day.dateKey).toBe('2026-04-01')
    expect(day.temperatureAvg).toBe(15)
    expect(day.temperatureMax).toBe(20)
    expect(day.temperatureMin).toBe(10)
    expect(day.precipitationTotal).toBe(1)
    expect(day.humidityAvg).toBe(50)
    expect(day.windSpeedMax).toBe(10)
    expect(day.sunshineTotalHours).toBeCloseTo(1.5, 5)
    expect(day.dominantWeatherCode).toBe(0)
  })

  it('groups multiple days and sorts by dateKey ascending', () => {
    const recs: HourlyWeatherRecord[] = [
      mkRec({ dateKey: '2026-04-02', temperature: 30 }),
      mkRec({ dateKey: '2026-04-01', temperature: 10 }),
    ]
    const out = aggregateHourlyToDaily(recs)
    expect(out).toHaveLength(2)
    expect(out[0].dateKey).toBe('2026-04-01')
    expect(out[1].dateKey).toBe('2026-04-02')
  })

  it('breaks weather code ties by severity (rain > sunny)', () => {
    // 12 sunny + 12 rainy → rainy should dominate by severity tiebreak
    const recs: HourlyWeatherRecord[] = []
    for (let i = 0; i < 12; i++) {
      recs.push(mkRec({ hour: i, weatherCode: 0 })) // sunny
    }
    for (let i = 12; i < 24; i++) {
      recs.push(mkRec({ hour: i, weatherCode: 65 })) // rain
    }
    const [day] = aggregateHourlyToDaily(recs)
    expect(categorizeWeatherCode(day.dominantWeatherCode)).toBe('rainy')
  })

  it('picks the most frequent code when counts differ', () => {
    const recs: HourlyWeatherRecord[] = [
      mkRec({ hour: 1, weatherCode: 0 }),
      mkRec({ hour: 2, weatherCode: 0 }),
      mkRec({ hour: 3, weatherCode: 0 }),
      mkRec({ hour: 4, weatherCode: 65 }),
    ]
    const [day] = aggregateHourlyToDaily(recs)
    expect(day.dominantWeatherCode).toBe(0)
  })
})
