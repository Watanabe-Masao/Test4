/**
 * Tests for jmaEtrnClient.ts — pure helpers (resolveEtrnStationByLocation + getStaticStationList)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock geocodingClient before importing jmaEtrnClient
vi.mock('../geocodingClient', () => ({
  reverseGeocode: vi.fn(),
}))

import { reverseGeocode } from '../geocodingClient'
import { resolveEtrnStationByLocation, getStaticStationList } from '../jmaEtrnClient'

const mockedReverseGeocode = vi.mocked(reverseGeocode)

describe('jmaEtrnClient', () => {
  beforeEach(() => {
    mockedReverseGeocode.mockReset()
  })

  afterEach(() => {
    mockedReverseGeocode.mockReset()
  })

  describe('getStaticStationList', () => {
    it('returns a non-empty list of station entries with expected shape', () => {
      const stations = getStaticStationList()
      expect(stations.length).toBeGreaterThan(0)
      const first = stations[0]
      expect(typeof first.precNo).toBe('number')
      expect(typeof first.blockNo).toBe('string')
      expect(typeof first.name).toBe('string')
      expect(typeof first.prefecture).toBe('string')
      expect(Array.isArray(first.lat)).toBe(true)
      expect(first.lat.length).toBe(2)
      expect(Array.isArray(first.lon)).toBe(true)
      expect(first.lon.length).toBe(2)
    })
  })

  describe('resolveEtrnStationByLocation', () => {
    it('returns a station with stationType=s1 for valid coordinates', async () => {
      // Simulate reverse geocoding failure; falls back to global nearest
      mockedReverseGeocode.mockResolvedValue(null)

      const station = await resolveEtrnStationByLocation(35.68, 139.77) // near Tokyo
      expect(station).not.toBeNull()
      expect(station?.stationType).toBe('s1')
      expect(typeof station?.precNo).toBe('number')
      expect(typeof station?.blockNo).toBe('string')
      expect(typeof station?.stationName).toBe('string')
    })

    it('returns a station at a very different location too', async () => {
      mockedReverseGeocode.mockResolvedValue(null)
      const station = await resolveEtrnStationByLocation(43.06, 141.35) // near Sapporo
      expect(station).not.toBeNull()
      expect(station?.stationType).toBe('s1')
    })

    it('non-fatal when reverseGeocode throws — falls back to all stations', async () => {
      mockedReverseGeocode.mockRejectedValue(new Error('geocoding unavailable'))
      const station = await resolveEtrnStationByLocation(35.68, 139.77)
      expect(station).not.toBeNull()
      expect(station?.stationType).toBe('s1')
    })

    it('uses prefecture-filtered candidates when geocoding returns a known pref', async () => {
      // Use a prefecture name that exists in the static list
      const stations = getStaticStationList()
      const anyPref = stations[0].prefecture
      mockedReverseGeocode.mockResolvedValue({ prefectureName: anyPref })

      const station = await resolveEtrnStationByLocation(
        (stations[0].lat[0] ?? 0) + (stations[0].lat[1] ?? 0) / 60,
        (stations[0].lon[0] ?? 0) + (stations[0].lon[1] ?? 0) / 60,
      )
      expect(station).not.toBeNull()
      expect(station?.stationType).toBe('s1')
    })
  })
})
