/**
 * Tests for jmaAmedasClient.ts — AMEDAS station table + nearest station + JmaAccessError
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  JmaAccessError,
  fetchStationTable,
  findNearestStation,
  clearStationTableCache,
} from '../jmaAmedasClient'

/** Build a fake amedastable.json response */
function fakeStationTable(): Record<
  string,
  {
    type: string
    elems: string
    lat: [number, number]
    lon: [number, number]
    alt: number
    kjName: string
    knName: string
    enName: string
  }
> {
  return {
    // has temp & precip (required)
    '11001': {
      type: 'C',
      elems: '11111010',
      lat: [35, 30],
      lon: [139, 45],
      alt: 10,
      kjName: '東京',
      knName: 'トウキョウ',
      enName: 'Tokyo',
    },
    // missing precip (elem[1] = 0) — should be filtered out
    '11002': {
      type: 'C',
      elems: '10000000',
      lat: [34, 45],
      lon: [135, 30],
      alt: 5,
      kjName: '大阪',
      knName: 'オオサカ',
      enName: 'Osaka',
    },
    // far away station with required elements
    '11003': {
      type: 'C',
      elems: '11000000',
      lat: [43, 0],
      lon: [141, 30],
      alt: 20,
      kjName: '札幌',
      knName: 'サッポロ',
      enName: 'Sapporo',
    },
  }
}

describe('jmaAmedasClient', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    clearStationTableCache()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    clearStationTableCache()
  })

  describe('JmaAccessError', () => {
    it('has correct name and message', () => {
      const err = new JmaAccessError('blocked')
      expect(err.name).toBe('JmaAccessError')
      expect(err.message).toBe('blocked')
      expect(err).toBeInstanceOf(Error)
    })
  })

  describe('fetchStationTable', () => {
    it('fetches and parses station table with DMS→decimal conversion', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(fakeStationTable()),
      } as unknown as Response)
      globalThis.fetch = fetchMock as unknown as typeof fetch

      const stations = await fetchStationTable()
      expect(stations.length).toBe(3)
      const tokyo = stations.find((s) => s.stationId === '11001')
      expect(tokyo).toBeTruthy()
      expect(tokyo?.kjName).toBe('東京')
      expect(tokyo?.enName).toBe('Tokyo')
      expect(tokyo?.type).toBe('C')
      expect(tokyo?.elems).toBe('11111010')
      expect(tokyo?.altitude).toBe(10)
      // lat = 35 + 30/60 = 35.5
      expect(tokyo?.latitude).toBeCloseTo(35.5, 5)
      // lon = 139 + 45/60 = 139.75
      expect(tokyo?.longitude).toBeCloseTo(139.75, 5)
    })

    it('caches station table on subsequent calls', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(fakeStationTable()),
      } as unknown as Response)
      globalThis.fetch = fetchMock as unknown as typeof fetch

      await fetchStationTable()
      await fetchStationTable()
      await fetchStationTable()
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('clearStationTableCache forces a re-fetch', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(fakeStationTable()),
      } as unknown as Response)
      globalThis.fetch = fetchMock as unknown as typeof fetch

      await fetchStationTable()
      clearStationTableCache()
      await fetchStationTable()
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })
  })

  describe('findNearestStation', () => {
    it('returns nearest station with required elements (temp + precipitation)', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(fakeStationTable()),
      } as unknown as Response)
      globalThis.fetch = fetchMock as unknown as typeof fetch

      // Query near Tokyo
      const nearest = await findNearestStation(35.6, 139.7)
      expect(nearest).not.toBeNull()
      expect(nearest?.stationId).toBe('11001')
      expect(nearest?.kjName).toBe('東京')
    })

    it('skips stations missing required observation elements', async () => {
      // Only Osaka has missing precip (elems='10000000') — query near it, should fall back
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(fakeStationTable()),
      } as unknown as Response)
      globalThis.fetch = fetchMock as unknown as typeof fetch

      // lat/lon very close to Osaka
      const nearest = await findNearestStation(34.75, 135.5)
      // Should NOT return '11002' (Osaka) — picks Tokyo (closer than Sapporo)
      expect(nearest).not.toBeNull()
      expect(nearest?.stationId).not.toBe('11002')
    })

    it('returns null when no stations match required elements', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () =>
          Promise.resolve({
            '99999': {
              type: 'C',
              elems: '00000000',
              lat: [0, 0],
              lon: [0, 0],
              alt: 0,
              kjName: 'X',
              knName: 'X',
              enName: 'X',
            },
          }),
      } as unknown as Response)
      globalThis.fetch = fetchMock as unknown as typeof fetch

      const nearest = await findNearestStation(35, 139)
      expect(nearest).toBeNull()
    })
  })
})
