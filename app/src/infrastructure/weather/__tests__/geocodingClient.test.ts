/**
 * geocodingClient.ts — 国土地理院 API client test (fetch mocked)
 *
 * 検証対象:
 * - PREFECTURE_NAMES: 47 件すべてに都道府県名が設定されている
 * - searchLocation:
 *   - 空文字 → 空配列
 *   - fetch レスポンスを GeocodingResult[] に変換
 *   - MAX_RESULTS (5) で切り詰め
 *   - 空データ → 空配列
 *   - fetch エラー → throw
 * - reverseGeocode:
 *   - muniCd から都道府県名を解決
 *   - muniCd が 4 桁 → padStart で正規化
 *   - muniCd 無 → null
 *   - 不明な prefCode → null
 *   - fetch 失敗 → null
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { searchLocation, reverseGeocode, PREFECTURE_NAMES } from '../geocodingClient'

const originalFetch = globalThis.fetch

beforeEach(() => {
  globalThis.fetch = vi.fn()
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

// ─── PREFECTURE_NAMES ───────────────────────

describe('PREFECTURE_NAMES', () => {
  it('47 都道府県すべて設定', () => {
    expect(Object.keys(PREFECTURE_NAMES)).toHaveLength(47)
  })

  it("'01' → '北海道'", () => {
    expect(PREFECTURE_NAMES['01']).toBe('北海道')
  })

  it("'13' → '東京都'", () => {
    expect(PREFECTURE_NAMES['13']).toBe('東京都')
  })

  it("'47' → '沖縄県'", () => {
    expect(PREFECTURE_NAMES['47']).toBe('沖縄県')
  })

  it("'27' → '大阪府'", () => {
    expect(PREFECTURE_NAMES['27']).toBe('大阪府')
  })

  it('キーは 2 桁 zero pad', () => {
    const keys = Object.keys(PREFECTURE_NAMES)
    for (const k of keys) {
      expect(k).toMatch(/^\d{2}$/)
    }
  })
})

// ─── searchLocation ─────────────────────────

describe('searchLocation', () => {
  it('空文字 → 空配列 (fetch されない)', async () => {
    const result = await searchLocation('')
    expect(result).toEqual([])
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('空白のみ → 空配列', async () => {
    const result = await searchLocation('   ')
    expect(result).toEqual([])
  })

  it('レスポンスを GeocodingResult[] に変換', async () => {
    const mockResponse = [
      {
        geometry: { coordinates: [139.6917, 35.6895], type: 'Point' },
        type: 'Feature',
        properties: { title: '東京駅' },
      },
    ]
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    })

    const result = await searchLocation('東京駅')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('東京駅')
    expect(result[0].latitude).toBe(35.6895) // GeoJSON [lon, lat]
    expect(result[0].longitude).toBe(139.6917)
    expect(result[0].country).toBe('日本')
  })

  it('5 件以上 → 5 件に切り詰め', async () => {
    const mockResponse = Array.from({ length: 10 }, (_, i) => ({
      geometry: { coordinates: [0, 0], type: 'Point' },
      type: 'Feature',
      properties: { title: `地点${i}` },
    }))
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    })

    const result = await searchLocation('東京')
    expect(result).toHaveLength(5)
  })

  it('空配列レスポンス → 空配列', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => [],
    })
    const result = await searchLocation('存在しない場所')
    expect(result).toEqual([])
  })

  it('fetch 失敗 → throw', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    })
    await expect(searchLocation('東京')).rejects.toThrow(/500/)
  })

  it('非配列レスポンス → 空配列', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ notAnArray: true }),
    })
    const result = await searchLocation('東京')
    expect(result).toEqual([])
  })
})

// ─── reverseGeocode ─────────────────────────

describe('reverseGeocode', () => {
  it('muniCd から 都道府県名を解決 (東京)', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ results: { muniCd: '13101' } }), // 13 = 東京都
    })
    const result = await reverseGeocode(35.6895, 139.6917)
    expect(result?.prefectureName).toBe('東京都')
  })

  it('muniCd 4桁 → padStart で正規化 (北海道)', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ results: { muniCd: '1100' } }), // pad → 01100 → '01'
    })
    const result = await reverseGeocode(43, 141)
    expect(result?.prefectureName).toBe('北海道')
  })

  it('muniCd 無 → null', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ results: {} }),
    })
    const result = await reverseGeocode(0, 0)
    expect(result).toBeNull()
  })

  it('muniCd が空 → null', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ results: { muniCd: '' } }),
    })
    const result = await reverseGeocode(0, 0)
    expect(result).toBeNull()
  })

  it('不明な prefCode → null', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ results: { muniCd: '99999' } }),
    })
    const result = await reverseGeocode(0, 0)
    expect(result).toBeNull()
  })

  it('fetch 失敗 → null', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
    })
    const result = await reverseGeocode(35, 139)
    expect(result).toBeNull()
  })
})
