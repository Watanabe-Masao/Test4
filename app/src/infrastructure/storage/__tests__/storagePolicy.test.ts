/**
 * storagePolicy のユニットテスト
 *
 * formatBytes、ストレージ状態判定、クリーンアップアクション生成をテストする。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// formatBytes は private なので getStorageStatus 経由でテストする
// getCleanupActions は直接テスト可能
import { getStorageStatus, getCleanupActions } from '../storagePolicy'

// storagePersistence モジュールをモック
vi.mock('../storagePersistence', () => ({
  getStorageEstimate: vi.fn(),
}))

import { getStorageEstimate } from '../storagePersistence'

const mockGetStorageEstimate = vi.mocked(getStorageEstimate)

describe('storagePolicy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getStorageStatus', () => {
    it('estimate が取得できない場合は normal / N/A', async () => {
      mockGetStorageEstimate.mockResolvedValue(null)
      const status = await getStorageStatus()

      expect(status.level).toBe('normal')
      expect(status.estimate).toBeNull()
      expect(status.usageFormatted).toBe('N/A')
      expect(status.quotaFormatted).toBe('N/A')
    })

    it('使用率 < 80% で normal', async () => {
      mockGetStorageEstimate.mockResolvedValue({
        usage: 500 * 1024 * 1024, // 500 MB
        quota: 1024 * 1024 * 1024, // 1 GB
        usageRatio: 0.5,
      })
      const status = await getStorageStatus()

      expect(status.level).toBe('normal')
      expect(status.usageFormatted).toBe('500.0 MB')
      expect(status.quotaFormatted).toBe('1.0 GB')
    })

    it('使用率 >= 80% で warning', async () => {
      mockGetStorageEstimate.mockResolvedValue({
        usage: 820 * 1024 * 1024,
        quota: 1024 * 1024 * 1024,
        usageRatio: 0.8,
      })
      const status = await getStorageStatus()

      expect(status.level).toBe('warning')
    })

    it('使用率 >= 95% で critical', async () => {
      mockGetStorageEstimate.mockResolvedValue({
        usage: 970 * 1024 * 1024,
        quota: 1024 * 1024 * 1024,
        usageRatio: 0.95,
      })
      const status = await getStorageStatus()

      expect(status.level).toBe('critical')
    })

    it('formatBytes: 0 バイト', async () => {
      mockGetStorageEstimate.mockResolvedValue({
        usage: 0,
        quota: 1024,
        usageRatio: 0,
      })
      const status = await getStorageStatus()

      expect(status.usageFormatted).toBe('0 B')
    })

    it('formatBytes: KB 表示', async () => {
      mockGetStorageEstimate.mockResolvedValue({
        usage: 1536, // 1.5 KB
        quota: 1024 * 1024,
        usageRatio: 0.001,
      })
      const status = await getStorageStatus()

      expect(status.usageFormatted).toBe('1.5 KB')
    })
  })

  describe('getCleanupActions', () => {
    it('オプション無しでは空配列', () => {
      const actions = getCleanupActions({})
      expect(actions).toHaveLength(0)
    })

    it('clearQueryCache のみ指定', () => {
      const mockClear = vi.fn()
      const actions = getCleanupActions({ clearQueryCache: mockClear })

      expect(actions).toHaveLength(1)
      expect(actions[0].id).toBe('query-cache')
    })

    it('全オプション指定で3つのアクション', () => {
      const actions = getCleanupActions({
        clearQueryCache: vi.fn(),
        deleteDuckDBFile: vi.fn().mockResolvedValue(true),
        clearOldMonths: vi.fn().mockResolvedValue(2),
      })

      expect(actions).toHaveLength(3)
      expect(actions.map((a) => a.id)).toEqual(['query-cache', 'duckdb-opfs', 'old-months'])
    })

    it('execute() が対応する関数を呼ぶ', async () => {
      const mockClear = vi.fn()
      const actions = getCleanupActions({ clearQueryCache: mockClear })

      await actions[0].execute()
      expect(mockClear).toHaveBeenCalledTimes(1)
    })

    it('deleteDuckDBFile の execute() が関数を呼ぶ', async () => {
      const mockDelete = vi.fn().mockResolvedValue(true)
      const actions = getCleanupActions({ deleteDuckDBFile: mockDelete })

      await actions[0].execute()
      expect(mockDelete).toHaveBeenCalledTimes(1)
    })

    it('clearOldMonths の execute() が keepRecent=3 で呼ぶ', async () => {
      const mockClear = vi.fn().mockResolvedValue(2)
      const actions = getCleanupActions({ clearOldMonths: mockClear })

      await actions[0].execute()
      expect(mockClear).toHaveBeenCalledWith(3)
    })
  })
})
