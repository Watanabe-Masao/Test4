/**
 * DailySalesChartBody.builders.ts — ビルダー関数の単体テスト
 *
 * 純粋関数のみをテスト（React コンポーネント本体は対象外）。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import {
  buildWeatherMap,
  buildWeatherContext,
  buildMAOverlay,
} from '@/presentation/components/charts/DailySalesChartBody.builders'
import type { DailyWeatherSummary } from '@/domain/models/record'
import type { EChartsOption } from 'echarts'
import type { MovingAverageOverlays } from '@/application/hooks/useMultiMovingAverage'

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
  dominantWeatherCode: 100, // 晴れ (sunny)
  sunshineTotalHours: 8,
  ...overrides,
})

describe('buildWeatherMap (re-exported)', () => {
  it('returns an empty map when weatherDaily is undefined', () => {
    const result = buildWeatherMap(undefined)
    expect(result.size).toBe(0)
  })

  it('maps dateKey day component to DayWeatherInfo', () => {
    const weather = [makeWeather('2025-03-05'), makeWeather('2025-03-10')]
    const result = buildWeatherMap(weather)
    expect(result.size).toBe(2)
    expect(result.get(5)).toBeDefined()
    expect(result.get(10)).toBeDefined()
    expect(result.get(5)?.temp).toBe(20)
    expect(result.get(5)?.max).toBe(25)
    expect(result.get(5)?.min).toBe(15)
  })

  it('rounds temperature fields', () => {
    const weather = [
      makeWeather('2025-03-01', {
        temperatureAvg: 19.7,
        temperatureMax: 24.4,
        temperatureMin: 14.6,
      }),
    ]
    const result = buildWeatherMap(weather)
    expect(result.get(1)?.temp).toBe(20)
    expect(result.get(1)?.max).toBe(24)
    expect(result.get(1)?.min).toBe(15)
  })

  it('drops entries whose chartDay < 1 after applying dowOffset', () => {
    const weather = [makeWeather('2025-03-01'), makeWeather('2025-03-02')]
    // dowOffset=2 → day 1 becomes chartDay -1 (excluded), day 2 becomes 0 (excluded)
    const result = buildWeatherMap(weather, 2)
    expect(result.size).toBe(0)
  })
})

describe('buildWeatherContext', () => {
  it('returns empty maps when all inputs are undefined', () => {
    const { weatherMap, prevWeatherMap } = buildWeatherContext(
      undefined,
      undefined,
      0,
      undefined,
      undefined,
    )
    expect(weatherMap.size).toBe(0)
    expect(prevWeatherMap.size).toBe(0)
  })

  it('builds weatherMap for current year without dowOffset', () => {
    const weather = [makeWeather('2025-05-15')]
    const { weatherMap, prevWeatherMap } = buildWeatherContext(weather, undefined, 0, 2025, 5)
    expect(weatherMap.size).toBe(1)
    expect(weatherMap.get(15)).toBeDefined()
    expect(prevWeatherMap.size).toBe(0)
  })

  it('builds prevWeatherMap using compStartDateKey derived from dowOffset', () => {
    // dowOffset=2, year=2025, month=3 → compStartDateKey = 2024-03-03
    // prev weather on 2024-03-03 → chartDay = 1
    const prevWeather = [makeWeather('2024-03-03'), makeWeather('2024-03-04')]
    const { prevWeatherMap } = buildWeatherContext(undefined, prevWeather, 2, 2025, 3)
    expect(prevWeatherMap.get(1)).toBeDefined()
    expect(prevWeatherMap.get(2)).toBeDefined()
  })
})

describe('buildMAOverlay', () => {
  const baseOption: EChartsOption = { series: [] }
  const ctStub = {
    semantic: {
      movingAverage: '#123456',
      quantity: '#abcdef',
    },
  } as unknown as Parameters<typeof buildMAOverlay>[3]

  it('returns baseOption unchanged when all overlays are empty', () => {
    const maOverlays: MovingAverageOverlays = {
      salesCur: undefined,
      salesPrev: undefined,
      metricCur: undefined,
      metricPrev: undefined,
      metricLabel: undefined,
    } as unknown as MovingAverageOverlays
    const result = buildMAOverlay(baseOption, maOverlays, [1, 2, 3], ctStub, false)
    expect(result).toBe(baseOption)
  })

  it('returns baseOption when salesCur has only null values', () => {
    const maOverlays = {
      salesCur: [
        { date: { day: 1 }, value: null },
        { date: { day: 2 }, value: null },
      ],
    } as unknown as MovingAverageOverlays
    const result = buildMAOverlay(baseOption, maOverlays, [1, 2], ctStub, false)
    expect(result).toBe(baseOption)
  })

  it('appends sales MA series when salesCur has non-null values', () => {
    const maOverlays = {
      salesCur: [
        { date: { day: 1 }, value: 100 },
        { date: { day: 2 }, value: 150 },
        { date: { day: 3 }, value: 200 },
      ],
    } as unknown as MovingAverageOverlays
    const result = buildMAOverlay(baseOption, maOverlays, [1, 2, 3], ctStub, false)
    const series = result.series as unknown[]
    expect(series.length).toBe(1)
    const first = series[0] as Record<string, unknown>
    expect(first.name).toBe('売上7日MA')
    expect(first.type).toBe('line')
    expect(first.data).toEqual([100, 150, 200])
  })

  it('appends metric MA series with yAxisIndex=1 when needRightAxis=true', () => {
    const maOverlays = {
      metricCur: [{ date: { day: 1 }, value: 10 }],
      metricLabel: '点数',
    } as unknown as MovingAverageOverlays
    const result = buildMAOverlay(baseOption, maOverlays, [1], ctStub, true)
    const series = result.series as unknown[]
    expect(series.length).toBe(1)
    const first = series[0] as Record<string, unknown>
    expect(first.name).toBe('点数7日MA')
    expect(first.yAxisIndex).toBe(1)
  })

  it('skips metric series when metricLabel is missing', () => {
    const maOverlays = {
      metricCur: [{ date: { day: 1 }, value: 10 }],
      metricLabel: '',
    } as unknown as MovingAverageOverlays
    const result = buildMAOverlay(baseOption, maOverlays, [1], ctStub, false)
    expect(result).toBe(baseOption)
  })

  it('preserves existing series when appending MA overlays', () => {
    const existingSeries = [{ name: 'sales', type: 'bar', data: [1, 2] }]
    const base: EChartsOption = { series: existingSeries as EChartsOption['series'] }
    const maOverlays = {
      salesCur: [{ date: { day: 1 }, value: 50 }],
    } as unknown as MovingAverageOverlays
    const result = buildMAOverlay(base, maOverlays, [1], ctStub, false)
    const series = result.series as unknown[]
    expect(series.length).toBe(2)
    expect((series[0] as Record<string, unknown>).name).toBe('sales')
    expect((series[1] as Record<string, unknown>).name).toBe('売上7日MA')
  })
})
