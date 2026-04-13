/**
 * Tests for jmaForecastClient.ts — resolveForecastOfficeByLocation + fetchWeeklyForecast
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../geocodingClient', () => ({
  reverseGeocode: vi.fn(),
}))

vi.mock('../jmaJsonClient', () => ({
  fetchJsonWithRetry: vi.fn(),
}))

import { reverseGeocode } from '../geocodingClient'
import { fetchJsonWithRetry } from '../jmaJsonClient'
import {
  resolveForecastOfficeByLocation,
  fetchWeeklyForecast,
  clearForecastCache,
} from '../jmaForecastClient'

const mockedReverseGeocode = vi.mocked(reverseGeocode)
const mockedFetchJson = vi.mocked(fetchJsonWithRetry)

const fakeAreaJson = {
  offices: {
    '130000': {
      name: '東京都',
      enName: 'Tokyo',
      officeName: '気象庁',
      parent: '',
      children: ['130010'],
    },
    '270000': {
      name: '大阪府',
      enName: 'Osaka',
      officeName: '大阪管区気象台',
      parent: '',
      children: [],
    },
  },
  class10s: {},
}

describe('jmaForecastClient', () => {
  beforeEach(() => {
    mockedReverseGeocode.mockReset()
    mockedFetchJson.mockReset()
    clearForecastCache()
  })

  afterEach(() => {
    clearForecastCache()
  })

  describe('resolveForecastOfficeByLocation', () => {
    it('returns null when reverse geocoding fails', async () => {
      mockedReverseGeocode.mockResolvedValue(null)
      mockedFetchJson.mockResolvedValue(fakeAreaJson)
      const result = await resolveForecastOfficeByLocation(35, 139)
      expect(result).toBeNull()
    })

    it('resolves office by exact prefecture name match', async () => {
      mockedReverseGeocode.mockResolvedValue({ prefectureName: '東京都' })
      mockedFetchJson.mockResolvedValue(fakeAreaJson)

      const result = await resolveForecastOfficeByLocation(35.68, 139.77)
      expect(result).not.toBeNull()
      expect(result?.officeCode).toBe('130000')
      expect(result?.officeName).toBe('東京都')
    })

    it('resolves office by fuzzy match (core name comparison)', async () => {
      // "大阪" fuzzy → "大阪府"
      mockedReverseGeocode.mockResolvedValue({ prefectureName: '大阪' })
      mockedFetchJson.mockResolvedValue(fakeAreaJson)

      const result = await resolveForecastOfficeByLocation(34.7, 135.5)
      expect(result).not.toBeNull()
      expect(result?.officeCode).toBe('270000')
      expect(result?.officeName).toBe('大阪府')
    })

    it('returns null when no office matches', async () => {
      mockedReverseGeocode.mockResolvedValue({ prefectureName: '架空県' })
      mockedFetchJson.mockResolvedValue(fakeAreaJson)

      const result = await resolveForecastOfficeByLocation(0, 0)
      expect(result).toBeNull()
    })

    it('caches the area.json fetch across multiple calls', async () => {
      mockedReverseGeocode.mockResolvedValue({ prefectureName: '東京都' })
      mockedFetchJson.mockResolvedValue(fakeAreaJson)

      await resolveForecastOfficeByLocation(35, 139)
      await resolveForecastOfficeByLocation(35, 139)
      await resolveForecastOfficeByLocation(35, 139)

      // area.json fetched once; reverseGeocode called 3 times
      expect(mockedFetchJson).toHaveBeenCalledTimes(1)
      expect(mockedReverseGeocode).toHaveBeenCalledTimes(3)
    })
  })

  describe('fetchWeeklyForecast', () => {
    const fakeForecastResponse: readonly [unknown, unknown] = [
      {},
      {
        publishingOffice: '気象庁',
        reportDatetime: '2025-05-01T00:00:00+09:00',
        timeSeries: [
          {
            timeDefines: ['2025-05-02T00:00:00+09:00', '2025-05-03T00:00:00+09:00'],
            areas: [
              {
                area: { name: '東京地方', code: '130010' },
                weatherCodes: ['100', '200'],
                pops: ['10', '30'],
                reliabilities: ['A', 'B'],
              },
            ],
          },
          {
            timeDefines: ['2025-05-02T00:00:00+09:00', '2025-05-03T00:00:00+09:00'],
            areas: [
              {
                area: { name: '東京', code: '44132' },
                tempsMin: ['15', '17'],
                tempsMinUpper: [],
                tempsMinLower: [],
                tempsMax: ['22', '24'],
                tempsMaxUpper: [],
                tempsMaxLower: [],
              },
            ],
          },
        ],
      },
    ]

    it('parses a weekly forecast response into DailyForecast records', async () => {
      mockedFetchJson.mockResolvedValue(fakeForecastResponse)

      const { forecasts, resolvedWeekAreaCode } = await fetchWeeklyForecast('130000')
      expect(resolvedWeekAreaCode).toBe('130010')
      expect(forecasts.length).toBe(2)

      expect(forecasts[0].dateKey).toBe('2025-05-02')
      expect(forecasts[0].weatherCode).toBe('100')
      expect(forecasts[0].pop).toBe(10)
      expect(forecasts[0].tempMin).toBe(15)
      expect(forecasts[0].tempMax).toBe(22)
      expect(forecasts[0].reliability).toBe('A')

      expect(forecasts[1].dateKey).toBe('2025-05-03')
      expect(forecasts[1].pop).toBe(30)
      expect(forecasts[1].tempMin).toBe(17)
      expect(forecasts[1].tempMax).toBe(24)
      expect(forecasts[1].reliability).toBe('B')
    })

    it('returns empty when timeSeries is missing', async () => {
      mockedFetchJson.mockResolvedValue([{}, {}])
      const result = await fetchWeeklyForecast('130000')
      expect(result.forecasts).toEqual([])
      expect(result.resolvedWeekAreaCode).toBe('')
    })

    it('returns empty when specified weekAreaCode does not exist', async () => {
      mockedFetchJson.mockResolvedValue(fakeForecastResponse)
      const result = await fetchWeeklyForecast('130000', '999999')
      expect(result.forecasts).toEqual([])
      expect(result.resolvedWeekAreaCode).toBe('')
    })

    it('handles empty pop/temp strings as null', async () => {
      const responseWithBlanks: readonly [unknown, unknown] = [
        {},
        {
          publishingOffice: '気象庁',
          reportDatetime: '2025-05-01T00:00:00+09:00',
          timeSeries: [
            {
              timeDefines: ['2025-05-02T00:00:00+09:00'],
              areas: [
                {
                  area: { name: '東京地方', code: '130010' },
                  weatherCodes: ['100'],
                  pops: [''],
                  reliabilities: [],
                },
              ],
            },
            {
              timeDefines: ['2025-05-02T00:00:00+09:00'],
              areas: [
                {
                  area: { name: '東京', code: '44132' },
                  tempsMin: [''],
                  tempsMinUpper: [],
                  tempsMinLower: [],
                  tempsMax: [''],
                  tempsMaxUpper: [],
                  tempsMaxLower: [],
                },
              ],
            },
          ],
        },
      ]
      mockedFetchJson.mockResolvedValue(responseWithBlanks)
      const { forecasts } = await fetchWeeklyForecast('130000')
      expect(forecasts.length).toBe(1)
      expect(forecasts[0].pop).toBeNull()
      expect(forecasts[0].tempMin).toBeNull()
      expect(forecasts[0].tempMax).toBeNull()
      expect(forecasts[0].reliability).toBeNull()
    })
  })
})
