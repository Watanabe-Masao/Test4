/**
 * weatherAdapter テスト
 *
 * アダプタが EtrnStation → 低レベル引数（precNo, blockNo, stationType）に
 * 正しく展開して infrastructure 関数を呼び出すことを検証する。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { EtrnStation } from '@/application/ports/WeatherPort'

// infrastructure/weather をモック
vi.mock('@/infrastructure/weather', () => ({
  searchLocation: vi.fn(),
  resolveEtrnStationByLocation: vi.fn(),
  getStaticStationList: vi.fn().mockReturnValue([]),
  fetchEtrnDailyWeather: vi.fn().mockResolvedValue([]),
  fetchEtrnHourlyRange: vi.fn().mockResolvedValue([]),
  resolveForecastOfficeByLocation: vi.fn(),
  fetchWeeklyForecast: vi.fn().mockResolvedValue({ forecasts: [], resolvedWeekAreaCode: '130010' }),
  PREFECTURE_NAMES: {},
}))

import { weatherAdapter } from '../weatherAdapter'
import {
  fetchEtrnDailyWeather,
  fetchEtrnHourlyRange,
  fetchWeeklyForecast,
} from '@/infrastructure/weather'

const mockFetchDaily = vi.mocked(fetchEtrnDailyWeather)
const mockFetchHourly = vi.mocked(fetchEtrnHourlyRange)
const mockFetchForecast = vi.mocked(fetchWeeklyForecast)

const STATION: EtrnStation = {
  stationType: 's1',
  blockNo: '47662',
  stationName: '東京',
  precNo: 44,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('weatherAdapter', () => {
  describe('fetchDailyWeather', () => {
    it('EtrnStation → precNo/blockNo/stationType に展開して infrastructure を呼ぶ', async () => {
      await weatherAdapter.fetchDailyWeather(STATION, 2025, 1)

      expect(mockFetchDaily).toHaveBeenCalledWith(44, '47662', 's1', 2025, 1)
    })
  })

  describe('fetchHourlyRange', () => {
    it('EtrnStation → precNo/blockNo/stationType に展開して infrastructure を呼ぶ', async () => {
      const onProgress = vi.fn()

      await weatherAdapter.fetchHourlyRange(STATION, 2025, 1, [1, 2, 3], onProgress)

      expect(mockFetchHourly).toHaveBeenCalledWith(
        44,
        '47662',
        's1',
        2025,
        1,
        [1, 2, 3],
        onProgress,
      )
    })
  })

  describe('fetchWeeklyForecast', () => {
    it('infrastructure の fetchWeeklyForecast をそのまま返す', async () => {
      mockFetchForecast.mockResolvedValue({
        forecasts: [{ date: '2025-01-20', weatherCode: '100', pop: 10 }] as never,
        resolvedWeekAreaCode: '130010',
      })

      const result = await weatherAdapter.fetchWeeklyForecast('130000', '130010')

      expect(mockFetchForecast).toHaveBeenCalledWith('130000', '130010')
      expect(result.resolvedWeekAreaCode).toBe('130010')
      expect(result.forecasts).toHaveLength(1)
    })
  })
})
