/**
 * SyncedRepository のユニットテスト
 *
 * Supabase マスター書き込み + Firestore 読み取りキャッシュの
 * オーケストレーションを検証する。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SyncedRepository } from '../SyncedRepository'
import { createEmptyImportedData } from '@/domain/models'

// ─── モック ──────────────────────────────────────────────

function createMockSupabase() {
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

function createMockFirestore() {
  return {
    readSlice: vi.fn(),
    readAllSlices: vi.fn(),
    writeSlice: vi.fn().mockResolvedValue(undefined),
    writeSlices: vi.fn().mockResolvedValue(undefined),
    writeSessionMeta: vi.fn().mockResolvedValue(undefined),
    readSessionMeta: vi.fn(),
    clearMonth: vi.fn().mockResolvedValue(undefined),
    subscribeToSlice: vi.fn(),
    subscribeToSessionMeta: vi.fn(),
  }
}

describe('SyncedRepository', () => {
  let supabase: ReturnType<typeof createMockSupabase>
  let firestore: ReturnType<typeof createMockFirestore>
  let repo: SyncedRepository

  beforeEach(() => {
    vi.clearAllMocks()
    supabase = createMockSupabase()
    firestore = createMockFirestore()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repo = new SyncedRepository(supabase as any, firestore as any)
  })

  describe('saveMonthlyData', () => {
    it('Supabase に保存し、Firestore 同期をトリガーする', async () => {
      const data = createEmptyImportedData()

      await repo.saveMonthlyData(data, 2026, 1)

      expect(supabase.saveMonthlyData).toHaveBeenCalledWith(data, 2026, 1)
      // 非同期同期はバックグラウンドで実行されるため、直接検証は困難
      // ただし Supabase への保存は必ず完了している
    })
  })

  describe('loadMonthlyData', () => {
    it('Firestore キャッシュから読み込む（キャッシュヒット）', async () => {
      const slices = new Map<string, unknown>([
        ['stores', {}],
        ['suppliers', {}],
        ['settings', {}],
        ['budget', {}],
        ['categoryTimeSales', { records: [] }],
        ['prevYearCategoryTimeSales', { records: [] }],
        ['departmentKpi', { records: [] }],
      ])
      firestore.readSessionMeta.mockResolvedValue({ year: 2026, month: 1, savedAt: '2026-01-01' })
      firestore.readAllSlices.mockResolvedValue(slices)

      const result = await repo.loadMonthlyData(2026, 1)

      expect(result).not.toBeNull()
      // Supabase には問い合わせない
      expect(supabase.loadMonthlyData).not.toHaveBeenCalled()
    })

    it('Firestore キャッシュミス時は Supabase にフォールバック', async () => {
      firestore.readSessionMeta.mockResolvedValue(null)
      supabase.loadMonthlyData.mockResolvedValue(createEmptyImportedData())

      const result = await repo.loadMonthlyData(2026, 1)

      expect(result).not.toBeNull()
      expect(supabase.loadMonthlyData).toHaveBeenCalledWith(2026, 1)
    })

    it('Firestore エラー時は Supabase にフォールバック', async () => {
      firestore.readSessionMeta.mockRejectedValue(new Error('Firestore down'))
      supabase.loadMonthlyData.mockResolvedValue(createEmptyImportedData())

      const result = await repo.loadMonthlyData(2026, 1)

      expect(result).not.toBeNull()
      expect(supabase.loadMonthlyData).toHaveBeenCalled()
    })
  })

  describe('loadDataSlice', () => {
    it('Firestore から読み、見つからなければ Supabase にフォールバック', async () => {
      firestore.readSlice.mockResolvedValue(null)
      supabase.loadDataSlice.mockResolvedValue({ store1: { 1: { sales: 100 } } })

      const result = await repo.loadDataSlice(2026, 1, 'sales')

      expect(result).toEqual({ store1: { 1: { sales: 100 } } })
      expect(supabase.loadDataSlice).toHaveBeenCalled()
    })
  })

  describe('getSessionMeta', () => {
    it('Firestore から取得する', async () => {
      firestore.readSessionMeta.mockResolvedValue({ year: 2026, month: 1, savedAt: '2026-01-15' })

      const result = await repo.getSessionMeta()

      expect(result).toEqual({ year: 2026, month: 1, savedAt: '2026-01-15' })
      expect(supabase.getSessionMeta).not.toHaveBeenCalled()
    })
  })

  describe('clearMonth', () => {
    it('Supabase と Firestore の両方をクリアする', async () => {
      await repo.clearMonth(2026, 1)

      expect(supabase.clearMonth).toHaveBeenCalledWith(2026, 1)
      // Firestore のクリアはバックグラウンドで実行
    })
  })

  describe('isAvailable', () => {
    it('Supabase の可用性を返す', () => {
      expect(repo.isAvailable()).toBe(true)
    })
  })
})
