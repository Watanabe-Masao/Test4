/**
 * ForecastLoadService テスト
 *
 * ポート抽象を通じて weatherAdapter が正しく呼び出され、
 * officeCode 解決 → 週間予報取得のオーケストレーションを検証する。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { StoreLocation } from '@/domain/models/record'
import type { WeatherPort } from '@/application/ports/WeatherPort'

vi.mock('@/application/adapters/weatherAdapter', () => ({
  weatherAdapter: {
    resolveEtrnStationByLocation: vi.fn(),
    fetchDailyWeather: vi.fn(),
    fetchHourlyRange: vi.fn(),
    searchLocation: vi.fn(),
    getStaticStationList: vi.fn().mockReturnValue([]),
    resolveForecastOfficeByLocation: vi.fn(),
    fetchWeeklyForecast: vi.fn(),
    PREFECTURE_NAMES: {},
  } satisfies WeatherPort,
}))

import { weatherAdapter } from '@/application/adapters/weatherAdapter'
import { loadForecastForStore } from '../ForecastLoadService'

const mockAdapter = vi.mocked(weatherAdapter)

const BASE_LOCATION: StoreLocation = {
  latitude: 35.6895,
  longitude: 139.6917,
}

const CACHED_LOCATION: StoreLocation = {
  ...BASE_LOCATION,
  forecastOfficeCode: '130000',
  weekAreaCode: '130010',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('loadForecastForStore', () => {
  it('officeCode 未解決 → resolveForecastOfficeByLocation → fetchWeeklyForecast', async () => {
    mockAdapter.resolveForecastOfficeByLocation.mockResolvedValue({
      officeCode: '130000',
      officeName: '東京地方気象台',
      weekAreaCode: '130010',
    })
    mockAdapter.fetchWeeklyForecast.mockResolvedValue({
      forecasts: [],
      resolvedWeekAreaCode: '130010',
    })

    const result = await loadForecastForStore(BASE_LOCATION)

    expect(mockAdapter.resolveForecastOfficeByLocation).toHaveBeenCalledWith(35.6895, 139.6917)
    expect(mockAdapter.fetchWeeklyForecast).toHaveBeenCalledWith('130000', undefined)
    expect(result.resolution).toEqual(
      expect.objectContaining({
        officeCode: '130000',
        officeName: '東京地方気象台',
        weekAreaCode: '130010',
      }),
    )
  })

  it('officeCode キャッシュ済み → resolve をスキップし fetchWeeklyForecast', async () => {
    mockAdapter.fetchWeeklyForecast.mockResolvedValue({
      forecasts: [],
      resolvedWeekAreaCode: '130010',
    })

    await loadForecastForStore(CACHED_LOCATION)

    expect(mockAdapter.resolveForecastOfficeByLocation).not.toHaveBeenCalled()
    expect(mockAdapter.fetchWeeklyForecast).toHaveBeenCalledWith('130000', '130010')
  })

  it('officeCode 解決失敗 → fetchWeeklyForecast は呼ばれず空配列を返す', async () => {
    mockAdapter.resolveForecastOfficeByLocation.mockResolvedValue(null)

    const result = await loadForecastForStore(BASE_LOCATION)

    expect(mockAdapter.fetchWeeklyForecast).not.toHaveBeenCalled()
    expect(result.forecasts).toEqual([])
    expect(result.resolution).toBeNull()
  })

  it('weekAreaCode 未キャッシュ → resolvedWeekAreaCode がレスポンスから補完される', async () => {
    const locationWithOffice: StoreLocation = {
      ...BASE_LOCATION,
      forecastOfficeCode: '130000',
      // weekAreaCode なし
    }
    mockAdapter.fetchWeeklyForecast.mockResolvedValue({
      forecasts: [],
      resolvedWeekAreaCode: '130010',
    })

    const result = await loadForecastForStore(locationWithOffice)

    expect(result.resolution).toEqual(
      expect.objectContaining({
        weekAreaCode: '130010',
      }),
    )
  })
})
