/**
 * WeatherCorrelationChart.vm.ts — ViewModel 変換関数の単体テスト
 *
 * 純粋関数のみをテスト。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import {
  getCorrelationStrength,
  formatCorrelationLabel,
  buildTimelineData,
} from '@/presentation/components/charts/WeatherCorrelationChart.vm'
import type { DailyWeatherSummary } from '@/domain/models/record'
import type {
  DailySalesForCorrelation,
  CorrelationResult,
} from '@/application/hooks/useWeatherCorrelation'

const makeWeather = (
  dateKey: string,
  overrides: Partial<DailyWeatherSummary> = {},
): DailyWeatherSummary => ({
  dateKey,
  temperatureAvg: 20,
  temperatureMax: 25,
  temperatureMin: 15,
  precipitationTotal: 0,
  humidityAvg: 60,
  windSpeedMax: 10,
  dominantWeatherCode: 100,
  sunshineTotalHours: 8,
  ...overrides,
})

describe('getCorrelationStrength', () => {
  it('returns "strong" when |r| >= 0.6', () => {
    expect(getCorrelationStrength(0.6)).toBe('strong')
    expect(getCorrelationStrength(0.9)).toBe('strong')
    expect(getCorrelationStrength(-0.8)).toBe('strong')
  })

  it('returns "moderate" when 0.3 <= |r| < 0.6', () => {
    expect(getCorrelationStrength(0.3)).toBe('moderate')
    expect(getCorrelationStrength(0.59)).toBe('moderate')
    expect(getCorrelationStrength(-0.45)).toBe('moderate')
  })

  it('returns "weak" when |r| < 0.3', () => {
    expect(getCorrelationStrength(0)).toBe('weak')
    expect(getCorrelationStrength(0.29)).toBe('weak')
    expect(getCorrelationStrength(-0.1)).toBe('weak')
  })
})

describe('formatCorrelationLabel', () => {
  it('prefixes positive r with "+" and includes n', () => {
    const result: CorrelationResult = { r: 0.5432, n: 30 } as unknown as CorrelationResult
    expect(formatCorrelationLabel('売上×気温', result)).toBe('売上×気温: r=+0.543 (n=30)')
  })

  it('leaves negative r without "+" prefix', () => {
    const result: CorrelationResult = { r: -0.234, n: 10 } as unknown as CorrelationResult
    expect(formatCorrelationLabel('売上×降水', result)).toBe('売上×降水: r=-0.234 (n=10)')
  })

  it('renders zero r with "+" sign', () => {
    const result: CorrelationResult = { r: 0, n: 5 } as unknown as CorrelationResult
    expect(formatCorrelationLabel('label', result)).toBe('label: r=+0.000 (n=5)')
  })
})

describe('buildTimelineData', () => {
  it('returns empty array when both inputs are empty', () => {
    const result = buildTimelineData([], [])
    expect(result).toEqual([])
  })

  it('merges weather and sales on dateKey and sorts chronologically', () => {
    const weather = [makeWeather('2025-03-02'), makeWeather('2025-03-01')]
    const sales: DailySalesForCorrelation[] = [
      { dateKey: '2025-03-01', sales: 100, customers: 50 },
      { dateKey: '2025-03-02', sales: 200, customers: 80 },
    ]
    const result = buildTimelineData(weather, sales)
    expect(result.length).toBe(2)
    expect(result[0]?.dateKey).toBe('2025-03-01')
    expect(result[1]?.dateKey).toBe('2025-03-02')
    expect(result[0]?.day).toBe(1)
    expect(result[1]?.day).toBe(2)
  })

  it('sets nulls for missing sides (weather-only date has null salesNorm)', () => {
    const weather = [makeWeather('2025-03-05')]
    const sales: DailySalesForCorrelation[] = [{ dateKey: '2025-03-06', sales: 100, customers: 40 }]
    const result = buildTimelineData(weather, sales)
    expect(result.length).toBe(2)
    const d5 = result.find((p) => p.dateKey === '2025-03-05')
    const d6 = result.find((p) => p.dateKey === '2025-03-06')
    expect(d5?.salesNorm).toBeNull()
    expect(d5?.tempNorm).not.toBeNull()
    expect(d6?.salesNorm).not.toBeNull()
    expect(d6?.tempNorm).toBeNull()
    expect(d6?.precipNorm).toBeNull()
  })

  it('parses day number from dateKey', () => {
    const weather = [makeWeather('2025-12-25')]
    const sales: DailySalesForCorrelation[] = [{ dateKey: '2025-12-25', sales: 1, customers: 1 }]
    const result = buildTimelineData(weather, sales)
    expect(result[0]?.day).toBe(25)
  })
})
