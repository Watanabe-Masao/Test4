/**
 * SyncedRepository のユニットテスト
 *
 * IndexedDB（プライマリ）+ Supabase（非同期バックアップ）の
 * オーケストレーションを検証する。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SyncedRepository } from '../SyncedRepository'
import { createEmptyImportedData } from '@/domain/models'

// ─── モック ──────────────────────────────────────────────

function createMockLocal() {
  return {
    isAvailable: vi.fn().mockReturnValue(true),
    saveMonthlyData: vi.fn().mockResolvedValue(undefined),
    loadMonthlyData: vi.fn(),
    saveDataSlice: vi.fn().mockResolvedValue(undefined),
    loadDataSlice: vi.fn(),
    getSessionMeta: vi.fn(),
    clearMonth: vi.fn().mockResolvedValue(undefined),
    clearAll: vi.fn().mockResolvedValue(undefined),
    listStoredMonths: vi.fn().mockResolvedValue([]),
    getDataSummary: vi.fn().mockResolvedValue([]),
  }
}

function createMockRemote() {
  return {
    isAvailable: vi.fn().mockReturnValue(true),
    saveMonthlyData: vi.fn().mockResolvedValue(undefined),
    loadMonthlyData: vi.fn(),
    saveDataSlice: vi.fn().mockResolvedValue(undefined),
    loadDataSlice: vi.fn(),
    getSessionMeta: vi.fn(),
    clearMonth: vi.fn().mockResolvedValue(undefined),
    clearAll: vi.fn().mockResolvedValue(undefined),
    listStoredMonths: vi.fn().mockResolvedValue([]),
    getDataSummary: vi.fn().mockResolvedValue([]),
    getAllSerializedSlices: vi.fn().mockResolvedValue(new Map()),
    getSerializedSlice: vi.fn(),
    writeSyncLog: vi.fn().mockResolvedValue(undefined),
  }
}

describe('SyncedRepository', () => {
  let local: ReturnType<typeof createMockLocal>
  let remote: ReturnType<typeof createMockRemote>
  let repo: SyncedRepository

  beforeEach(() => {
    vi.clearAllMocks()
    local = createMockLocal()
    remote = createMockRemote()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repo = new SyncedRepository(local as any, remote as any)
  })

  describe('saveMonthlyData', () => {
    it('IndexedDB に保存し、Supabase への非同期バックアップをトリガーする', async () => {
      const data = createEmptyImportedData()

      await repo.saveMonthlyData(data, 2026, 1)

      expect(local.saveMonthlyData).toHaveBeenCalledWith(data, 2026, 1)
    })
  })

  describe('loadMonthlyData', () => {
    it('IndexedDB から読み込む（ローカルヒット）', async () => {
      const data = createEmptyImportedData()
      local.loadMonthlyData.mockResolvedValue(data)

      const result = await repo.loadMonthlyData(2026, 1)

      expect(result).toBe(data)
      // Supabase には問い合わせない
      expect(remote.loadMonthlyData).not.toHaveBeenCalled()
    })

    it('ローカルに無い場合は Supabase にフォールバック', async () => {
      local.loadMonthlyData.mockResolvedValue(null)
      remote.loadMonthlyData.mockResolvedValue(createEmptyImportedData())

      const result = await repo.loadMonthlyData(2026, 1)

      expect(result).not.toBeNull()
      expect(remote.loadMonthlyData).toHaveBeenCalledWith(2026, 1)
    })

    it('Supabase から取得したデータを IndexedDB にキャッシュする', async () => {
      const data = createEmptyImportedData()
      local.loadMonthlyData.mockResolvedValue(null)
      remote.loadMonthlyData.mockResolvedValue(data)

      await repo.loadMonthlyData(2026, 1)

      // IndexedDB にキャッシュ書き込みが呼ばれる
      expect(local.saveMonthlyData).toHaveBeenCalledWith(data, 2026, 1)
    })

    it('Supabase エラー時は null を返す', async () => {
      local.loadMonthlyData.mockResolvedValue(null)
      remote.loadMonthlyData.mockRejectedValue(new Error('Network error'))

      const result = await repo.loadMonthlyData(2026, 1)

      expect(result).toBeNull()
    })

    it('Supabase が利用不可の場合は null を返す', async () => {
      local.loadMonthlyData.mockResolvedValue(null)
      remote.isAvailable.mockReturnValue(false)

      const result = await repo.loadMonthlyData(2026, 1)

      expect(result).toBeNull()
      expect(remote.loadMonthlyData).not.toHaveBeenCalled()
    })
  })

  describe('loadDataSlice', () => {
    it('IndexedDB から読み、見つからなければ Supabase にフォールバック', async () => {
      local.loadDataSlice.mockResolvedValue(null)
      remote.loadDataSlice.mockResolvedValue({ store1: { 1: { cost: 100, price: 130 } } })

      const result = await repo.loadDataSlice(2026, 1, 'purchase')

      expect(result).toEqual({ store1: { 1: { cost: 100, price: 130 } } })
      expect(remote.loadDataSlice).toHaveBeenCalled()
    })

    it('IndexedDB にデータがあれば Supabase に問い合わせない', async () => {
      local.loadDataSlice.mockResolvedValue({ store1: { 1: { cost: 200, price: 260 } } })

      const result = await repo.loadDataSlice(2026, 1, 'purchase')

      expect(result).toEqual({ store1: { 1: { cost: 200, price: 260 } } })
      expect(remote.loadDataSlice).not.toHaveBeenCalled()
    })
  })

  describe('getSessionMeta', () => {
    it('IndexedDB から取得する', async () => {
      local.getSessionMeta.mockResolvedValue({ year: 2026, month: 1, savedAt: '2026-01-15' })

      const result = await repo.getSessionMeta()

      expect(result).toEqual({ year: 2026, month: 1, savedAt: '2026-01-15' })
      expect(remote.getSessionMeta).not.toHaveBeenCalled()
    })

    it('ローカルに無い場合は Supabase にフォールバック', async () => {
      local.getSessionMeta.mockResolvedValue(null)
      remote.getSessionMeta.mockResolvedValue({ year: 2026, month: 1, savedAt: '2026-01-15' })

      const result = await repo.getSessionMeta()

      expect(result).toEqual({ year: 2026, month: 1, savedAt: '2026-01-15' })
    })
  })

  describe('clearMonth', () => {
    it('IndexedDB をクリアし、Supabase にも非同期で削除を伝播する', async () => {
      await repo.clearMonth(2026, 1)

      expect(local.clearMonth).toHaveBeenCalledWith(2026, 1)
      // remote.clearMonth は非同期で呼ばれる（fire-and-forget）
    })
  })

  describe('isAvailable', () => {
    it('IndexedDB の可用性を返す', () => {
      expect(repo.isAvailable()).toBe(true)
    })
  })

  describe('listStoredMonths', () => {
    it('IndexedDB のデータを返す', async () => {
      local.listStoredMonths.mockResolvedValue([{ year: 2026, month: 1 }])

      const result = await repo.listStoredMonths()

      expect(result).toEqual([{ year: 2026, month: 1 }])
    })
  })
})
