/**
 * WeatherLoadService テスト
 *
 * ポート抽象（EtrnStation 単位の操作）を通じて
 * weatherAdapter が正しく呼び出されることを検証する。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { StoreLocation } from '@/domain/models/record'
import type { WeatherPort, EtrnStation } from '@/domain/ports/WeatherPort'

// weatherAdapter をモック
vi.mock('@/infrastructure/adapters/weatherAdapter', () => ({
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

import { weatherAdapter } from '@/infrastructure/adapters/weatherAdapter'
import { loadEtrnDailyForStore, loadEtrnHourlyForStore } from '../WeatherLoadService'

const mockAdapter = vi.mocked(weatherAdapter)

const RESOLVED_STATION: EtrnStation = {
  stationType: 's1',
  blockNo: '47662',
  stationName: '東京',
  precNo: 44,
}

const BASE_LOCATION: StoreLocation = {
  latitude: 35.6895,
  longitude: 139.6917,
}

const CACHED_LOCATION: StoreLocation = {
  ...BASE_LOCATION,
  etrnPrecNo: 44,
  etrnBlockNo: '47662',
  etrnStationType: 's1',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('loadEtrnDailyForStore', () => {
  it('観測所未解決 → resolveEtrnStationByLocation → fetchDailyWeather(station)', async () => {
    mockAdapter.resolveEtrnStationByLocation.mockResolvedValue(RESOLVED_STATION)
    mockAdapter.fetchDailyWeather.mockResolvedValue([])

    const result = await loadEtrnDailyForStore(weatherAdapter, 'store1', BASE_LOCATION, 2025, 1)

    // fetchDailyWeather が EtrnStation 単位で呼ばれること
    expect(mockAdapter.fetchDailyWeather).toHaveBeenCalledWith(RESOLVED_STATION, 2025, 1)
    expect(result.resolvedStation).toEqual(RESOLVED_STATION)
  })

  it('観測所キャッシュ済み → resolve をスキップし fetchDailyWeather(station)', async () => {
    mockAdapter.fetchDailyWeather.mockResolvedValue([])

    await loadEtrnDailyForStore(weatherAdapter, 'store1', CACHED_LOCATION, 2025, 3)

    // resolveEtrnStationByLocation は呼ばれない
    expect(mockAdapter.resolveEtrnStationByLocation).not.toHaveBeenCalled()
    // fetchDailyWeather が EtrnStation オブジェクトで呼ばれること
    expect(mockAdapter.fetchDailyWeather).toHaveBeenCalledWith(
      expect.objectContaining({
        precNo: 44,
        blockNo: '47662',
        stationType: 's1',
      }),
      2025,
      3,
    )
  })

  it('観測所解決失敗 → fetchDailyWeather は呼ばれず空配列を返す', async () => {
    mockAdapter.resolveEtrnStationByLocation.mockResolvedValue(null)

    const result = await loadEtrnDailyForStore(weatherAdapter, 'store1', BASE_LOCATION, 2025, 1)

    expect(mockAdapter.fetchDailyWeather).not.toHaveBeenCalled()
    expect(result.daily).toEqual([])
  })
})

describe('loadEtrnHourlyForStore', () => {
  it('観測所未解決 → resolveEtrnStationByLocation → fetchHourlyRange(station)', async () => {
    mockAdapter.resolveEtrnStationByLocation.mockResolvedValue(RESOLVED_STATION)
    mockAdapter.fetchHourlyRange.mockResolvedValue([])

    const result = await loadEtrnHourlyForStore(weatherAdapter, 'store1', BASE_LOCATION, 2025, 1, [1, 2, 3])

    // fetchHourlyRange が EtrnStation 単位で呼ばれること
    expect(mockAdapter.fetchHourlyRange).toHaveBeenCalledWith(
      RESOLVED_STATION,
      2025,
      1,
      [1, 2, 3],
      expect.any(Function),
    )
    expect(result.resolvedStation).toEqual(RESOLVED_STATION)
  })

  it('観測所キャッシュ済み → resolve をスキップし fetchHourlyRange(station)', async () => {
    mockAdapter.fetchHourlyRange.mockResolvedValue([])

    await loadEtrnHourlyForStore(weatherAdapter, 'store1', CACHED_LOCATION, 2025, 3, [15])

    expect(mockAdapter.resolveEtrnStationByLocation).not.toHaveBeenCalled()
    expect(mockAdapter.fetchHourlyRange).toHaveBeenCalledWith(
      expect.objectContaining({
        precNo: 44,
        blockNo: '47662',
        stationType: 's1',
      }),
      2025,
      3,
      [15],
      expect.any(Function),
    )
  })

  it('観測所解決失敗 → fetchHourlyRange は呼ばれず空配列を返す', async () => {
    mockAdapter.resolveEtrnStationByLocation.mockResolvedValue(null)

    const result = await loadEtrnHourlyForStore(weatherAdapter, 'store1', BASE_LOCATION, 2025, 1, [1])

    expect(mockAdapter.fetchHourlyRange).not.toHaveBeenCalled()
    expect(result.hourly).toEqual([])
  })
})
