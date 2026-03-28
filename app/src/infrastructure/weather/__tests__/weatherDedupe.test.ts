/**
 * Weather inflight dedupe テスト
 *
 * 同一 station/year/month の並列リクエストが 1 HTTP fetch に集約されることを検証。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// fetchHtmlWithRetry をモック
const mockFetchHtml = vi.fn<(url: string) => Promise<string>>()
vi.mock('../etrnHttpClient', () => ({
  REQUEST_DELAY_MS: 0,
  EtrnNotFoundError: class extends Error {
    name = 'EtrnNotFoundError'
  },
  delay: () => Promise.resolve(),
  fetchHtmlWithRetry: (...args: unknown[]) => mockFetchHtml(args[0] as string),
}))

// parseDailyTable をモック
vi.mock('../etrnTableParser', () => ({
  parseDailyTable: () => [{ day: 1, weatherCode: 100, maxTemp: 20, minTemp: 10 }],
}))

// DOMParser をモック
vi.stubGlobal(
  'DOMParser',
  class {
    parseFromString() {
      return {}
    }
  },
)

import { fetchEtrnDailyWeather } from '../jmaEtrnClient'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('fetchEtrnDailyWeather inflight dedupe', () => {
  it('同一 key の並列リクエストは 1 HTTP fetch に集約される', async () => {
    mockFetchHtml.mockResolvedValue('<html></html>')

    // 同じパラメータで並列に2回呼ぶ
    const [r1, r2] = await Promise.all([
      fetchEtrnDailyWeather(44, '47662', 's1', 2026, 3),
      fetchEtrnDailyWeather(44, '47662', 's1', 2026, 3),
    ])

    // HTTP fetch は 1 回だけ
    expect(mockFetchHtml).toHaveBeenCalledTimes(1)
    // 両方同じ結果
    expect(r1).toEqual(r2)
  })

  it('完了後に inflight cache がクリアされる', async () => {
    mockFetchHtml.mockResolvedValue('<html></html>')

    // 1回目
    await fetchEtrnDailyWeather(44, '47662', 's1', 2026, 3)
    expect(mockFetchHtml).toHaveBeenCalledTimes(1)

    // 2回目（完了後なので新規 fetch が発生する）
    await fetchEtrnDailyWeather(44, '47662', 's1', 2026, 3)
    expect(mockFetchHtml).toHaveBeenCalledTimes(2)
  })

  it('エラー後も inflight cache がクリアされる', async () => {
    mockFetchHtml.mockRejectedValueOnce(new Error('network error'))
    mockFetchHtml.mockResolvedValueOnce('<html></html>')

    // 1回目はエラー
    await expect(fetchEtrnDailyWeather(44, '47662', 's1', 2026, 3)).rejects.toThrow()

    // 2回目は成功する（cache がクリアされているため新規 fetch）
    const result = await fetchEtrnDailyWeather(44, '47662', 's1', 2026, 3)
    expect(result).toHaveLength(1)
    expect(mockFetchHtml).toHaveBeenCalledTimes(2)
  })

  it('異なる month は dedupe しない', async () => {
    mockFetchHtml.mockResolvedValue('<html></html>')

    await Promise.all([
      fetchEtrnDailyWeather(44, '47662', 's1', 2026, 3),
      fetchEtrnDailyWeather(44, '47662', 's1', 2025, 3),
    ])

    // 別の year → 別の fetch
    expect(mockFetchHtml).toHaveBeenCalledTimes(2)
  })
})
