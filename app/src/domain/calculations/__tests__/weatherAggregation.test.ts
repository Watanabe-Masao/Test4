import { describe, it, expect } from 'vitest'
import {
  aggregateHourlyToDaily,
  categorizeWeatherCode,
  deriveWeatherCode,
  toWeatherDisplay,
} from '@/domain/calculations/weatherAggregation'
import type { HourlyWeatherRecord } from '@/domain/models/record'

// ─── Helper ──────────────────────────────────────────

function makeHourly(
  dateKey: string,
  hour: number,
  overrides: Partial<HourlyWeatherRecord> = {},
): HourlyWeatherRecord {
  return {
    dateKey,
    hour,
    temperature: 20,
    humidity: 60,
    precipitation: 0,
    windSpeed: 10,
    weatherCode: 0,
    sunshineDuration: 0,
    ...overrides,
  }
}

// ─── aggregateHourlyToDaily ──────────────────────────

describe('aggregateHourlyToDaily', () => {
  it('空配列には空配列を返す', () => {
    expect(aggregateHourlyToDaily([])).toEqual([])
  })

  it('1日24時間のレコードを正しく集約する', () => {
    const records: HourlyWeatherRecord[] = []
    for (let h = 0; h < 24; h++) {
      records.push(
        makeHourly('2025-03-15', h, {
          temperature: 10 + h, // 10..33
          humidity: 50 + h, // 50..73
          precipitation: h < 12 ? 0 : 1, // 後半12時間に1mm/h
          windSpeed: h * 2,
          weatherCode: h < 16 ? 0 : 61, // 16時以降は雨
          sunshineDuration: h < 12 ? 3600 : 0, // 午前中は日照あり
        }),
      )
    }

    const result = aggregateHourlyToDaily(records)
    expect(result).toHaveLength(1)

    const day = result[0]
    expect(day.dateKey).toBe('2025-03-15')
    expect(day.temperatureMax).toBe(33) // hour=23
    expect(day.temperatureMin).toBe(10) // hour=0
    expect(day.temperatureAvg).toBeCloseTo((10 + 33) / 2, 1) // avg of 10..33
    expect(day.precipitationTotal).toBe(12) // 12時間 × 1mm
    expect(day.windSpeedMax).toBe(46) // hour=23 × 2
    expect(day.sunshineTotalHours).toBeCloseTo(12, 5) // 12時間分のseconds→hours
    expect(day.dominantWeatherCode).toBe(0) // 0が16時間、61が8時間
  })

  it('複数日を dateKey 昇順で返す', () => {
    const records = [
      makeHourly('2025-03-17', 0),
      makeHourly('2025-03-15', 0),
      makeHourly('2025-03-16', 0),
    ]

    const result = aggregateHourlyToDaily(records)
    expect(result).toHaveLength(3)
    expect(result[0].dateKey).toBe('2025-03-15')
    expect(result[1].dateKey).toBe('2025-03-16')
    expect(result[2].dateKey).toBe('2025-03-17')
  })

  it('レコードが1つだけの日でも正しく集約する', () => {
    const records = [
      makeHourly('2025-03-15', 12, {
        temperature: 25,
        humidity: 70,
        precipitation: 5,
        windSpeed: 15,
        weatherCode: 61,
        sunshineDuration: 1800,
      }),
    ]

    const result = aggregateHourlyToDaily(records)
    expect(result).toHaveLength(1)
    expect(result[0].temperatureAvg).toBe(25)
    expect(result[0].temperatureMax).toBe(25)
    expect(result[0].temperatureMin).toBe(25)
    expect(result[0].precipitationTotal).toBe(5)
    expect(result[0].sunshineTotalHours).toBeCloseTo(0.5, 5)
  })

  it('全レコードが weatherCode=0 のとき dominantWeatherCode は 0（晴れ）', () => {
    const records = Array.from({ length: 12 }, (_, h) =>
      makeHourly('2025-03-15', h, { weatherCode: 0 }),
    )
    const result = aggregateHourlyToDaily(records)
    expect(result[0].dominantWeatherCode).toBe(0)
  })

  it('単一レコードの weatherCode がそのまま dominantWeatherCode になる', () => {
    const records = [makeHourly('2025-03-15', 12, { weatherCode: 61 })]
    const result = aggregateHourlyToDaily(records)
    expect(result[0].dominantWeatherCode).toBe(61)
  })

  it('同数タイブレーク: 晴れ12h + 雨12h → 雨が代表（深刻度優先）', () => {
    const records: HourlyWeatherRecord[] = []
    for (let h = 0; h < 12; h++) records.push(makeHourly('2025-03-15', h, { weatherCode: 0 }))
    for (let h = 12; h < 24; h++) records.push(makeHourly('2025-03-15', h, { weatherCode: 61 }))
    const result = aggregateHourlyToDaily(records)
    expect(result[0].dominantWeatherCode).toBe(61) // rainy > sunny
  })

  it('同数タイブレーク: 雨と雪が同数 → 雪が代表', () => {
    const records: HourlyWeatherRecord[] = []
    for (let h = 0; h < 12; h++) records.push(makeHourly('2025-03-15', h, { weatherCode: 61 }))
    for (let h = 12; h < 24; h++) records.push(makeHourly('2025-03-15', h, { weatherCode: 71 }))
    const result = aggregateHourlyToDaily(records)
    expect(result[0].dominantWeatherCode).toBe(71) // snowy > rainy
  })

  it('頻度が異なる場合は頻度優先: 晴れ多数 + 雨少数 → 晴れが代表', () => {
    const records: HourlyWeatherRecord[] = []
    for (let h = 0; h < 20; h++) records.push(makeHourly('2025-03-15', h, { weatherCode: 0 }))
    for (let h = 20; h < 24; h++) records.push(makeHourly('2025-03-15', h, { weatherCode: 61 }))
    const result = aggregateHourlyToDaily(records)
    expect(result[0].dominantWeatherCode).toBe(0) // 頻度: 20 > 4
  })

  it('全レコードの気温が同一の場合 avg=max=min', () => {
    const records = [
      makeHourly('2025-03-15', 0, { temperature: 15 }),
      makeHourly('2025-03-15', 1, { temperature: 15 }),
      makeHourly('2025-03-15', 2, { temperature: 15 }),
    ]

    const result = aggregateHourlyToDaily(records)
    expect(result[0].temperatureAvg).toBe(15)
    expect(result[0].temperatureMax).toBe(15)
    expect(result[0].temperatureMin).toBe(15)
  })
})

// ─── categorizeWeatherCode ───────────────────────────

describe('categorizeWeatherCode', () => {
  it('0 = sunny (clear sky)', () => {
    expect(categorizeWeatherCode(0)).toBe('sunny')
  })

  it('1 = sunny (mainly clear)', () => {
    expect(categorizeWeatherCode(1)).toBe('sunny')
  })

  it('2-3 = cloudy (partly cloudy, overcast)', () => {
    expect(categorizeWeatherCode(2)).toBe('cloudy')
    expect(categorizeWeatherCode(3)).toBe('cloudy')
  })

  it('45-48 = cloudy (fog)', () => {
    expect(categorizeWeatherCode(45)).toBe('cloudy')
    expect(categorizeWeatherCode(48)).toBe('cloudy')
  })

  it('51-67 = rainy (drizzle, rain)', () => {
    expect(categorizeWeatherCode(51)).toBe('rainy')
    expect(categorizeWeatherCode(61)).toBe('rainy')
    expect(categorizeWeatherCode(67)).toBe('rainy')
  })

  it('71-77 = snowy', () => {
    expect(categorizeWeatherCode(71)).toBe('snowy')
    expect(categorizeWeatherCode(77)).toBe('snowy')
  })

  it('80-82 = rainy (rain showers)', () => {
    expect(categorizeWeatherCode(80)).toBe('rainy')
    expect(categorizeWeatherCode(82)).toBe('rainy')
  })

  it('85-86 = snowy (snow showers)', () => {
    expect(categorizeWeatherCode(85)).toBe('snowy')
    expect(categorizeWeatherCode(86)).toBe('snowy')
  })

  it('95-99 = rainy (thunderstorm)', () => {
    expect(categorizeWeatherCode(95)).toBe('rainy')
    expect(categorizeWeatherCode(99)).toBe('rainy')
  })

  it('100+ = other', () => {
    expect(categorizeWeatherCode(100)).toBe('other')
    expect(categorizeWeatherCode(255)).toBe('other')
  })
})

// ─── deriveWeatherCode ──────────────────────────────

describe('deriveWeatherCode', () => {
  it('降水なし・日照多 → 0 (clear sky)', () => {
    expect(deriveWeatherCode(0, 0.8)).toBe(0)
    expect(deriveWeatherCode(0, 1.0)).toBe(0)
  })

  it('降水なし・日照中 → 2 (partly cloudy)', () => {
    expect(deriveWeatherCode(0, 0.3)).toBe(2)
    expect(deriveWeatherCode(0, 0.5)).toBe(2)
  })

  it('降水なし・日照なし → 3 (overcast)', () => {
    expect(deriveWeatherCode(0, 0)).toBe(3)
    expect(deriveWeatherCode(0, 0.1)).toBe(3)
  })

  it('微量降水 → 51 (drizzle)', () => {
    expect(deriveWeatherCode(0.5, 0)).toBe(51)
  })

  it('中程度降水 → 61 (rain)', () => {
    expect(deriveWeatherCode(2, 0)).toBe(61)
  })

  it('大量降水 → 65 (heavy rain)', () => {
    expect(deriveWeatherCode(10, 0)).toBe(65)
  })

  it('降水あり・気温低 → 雪 (71/75)', () => {
    expect(deriveWeatherCode(0.5, 0, 0)).toBe(71)
    expect(deriveWeatherCode(2, 0, -3)).toBe(71)
    expect(deriveWeatherCode(10, 0, -5)).toBe(75)
  })

  it('降水あり・気温1°C以上 → 雨', () => {
    expect(deriveWeatherCode(2, 0, 5)).toBe(61)
    expect(deriveWeatherCode(2, 0, 1)).toBe(61)
  })

  it('気温省略時は雪判定しない', () => {
    expect(deriveWeatherCode(2, 0)).toBe(61)
  })
})

// ─── toWeatherDisplay ───────────────────────────────

describe('toWeatherDisplay', () => {
  it('null → null（欠損）', () => {
    expect(toWeatherDisplay(null)).toBeNull()
  })

  it('undefined → null（欠損）', () => {
    expect(toWeatherDisplay(undefined)).toBeNull()
  })

  it('0 → sunny（晴天は有効値であり欠損ではない）', () => {
    const result = toWeatherDisplay(0)
    expect(result).not.toBeNull()
    expect(result!.category).toBe('sunny')
    expect(result!.label).toBe('晴れ')
    expect(result!.icon).toBeTruthy()
  })

  it('3 → cloudy', () => {
    const result = toWeatherDisplay(3)
    expect(result!.category).toBe('cloudy')
    expect(result!.label).toBe('曇り')
  })

  it('61 → rainy', () => {
    const result = toWeatherDisplay(61)
    expect(result!.category).toBe('rainy')
    expect(result!.label).toBe('雨')
  })

  it('71 → snowy', () => {
    const result = toWeatherDisplay(71)
    expect(result!.category).toBe('snowy')
    expect(result!.label).toBe('雪')
  })

  it('200 → other（範囲外コード）', () => {
    const result = toWeatherDisplay(200)
    expect(result!.category).toBe('other')
    expect(result!.label).toBe('不明')
  })
})
