/**
 * SyncService のユニットテスト
 *
 * SupabaseRepository と FirestoreReadCache をモックし、
 * Supabase → Firestore の同期ロジックを検証する。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SyncService } from '../SyncService'

// ─── モック ──────────────────────────────────────────────

function createMockSupabase() {
  return {
    getAllSerializedSlices: vi.fn(),
    getSerializedSlice: vi.fn(),
    writeSyncLog: vi.fn().mockResolvedValue(undefined),
  }
}

function createMockFirestore() {
  return {
    writeSlices: vi.fn().mockResolvedValue(undefined),
    writeSlice: vi.fn().mockResolvedValue(undefined),
    writeSessionMeta: vi.fn().mockResolvedValue(undefined),
    clearMonth: vi.fn().mockResolvedValue(undefined),
  }
}

describe('SyncService', () => {
  let supabase: ReturnType<typeof createMockSupabase>
  let firestore: ReturnType<typeof createMockFirestore>
  let service: SyncService

  beforeEach(() => {
    supabase = createMockSupabase()
    firestore = createMockFirestore()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new SyncService(supabase as any, firestore as any)
  })

  describe('syncAll', () => {
    it('Supabase の全スライスを Firestore に書き込む', async () => {
      const slices = new Map<string, unknown>([
        ['sales', { store1: { 1: { sales: 100 } } }],
        ['purchase', { store1: { 1: { total: { cost: 80, price: 100 } } } }],
      ])
      supabase.getAllSerializedSlices.mockResolvedValue(slices)

      const result = await service.syncAll(2026, 1)

      expect(result.success).toBe(true)
      expect(result.syncedTypes).toEqual(['sales', 'purchase'])
      expect(result.failedTypes).toHaveLength(0)
      expect(firestore.writeSlices).toHaveBeenCalledWith(2026, 1, slices)
      expect(firestore.writeSessionMeta).toHaveBeenCalledWith(2026, 1)
    })

    it('スライスが空の場合は何もしない', async () => {
      supabase.getAllSerializedSlices.mockResolvedValue(new Map())

      const result = await service.syncAll(2026, 1)

      expect(result.success).toBe(true)
      expect(result.syncedTypes).toHaveLength(0)
      expect(firestore.writeSlices).not.toHaveBeenCalled()
    })

    it('エラー時は失敗を記録する', async () => {
      supabase.getAllSerializedSlices.mockRejectedValue(new Error('DB down'))

      const result = await service.syncAll(2026, 1)

      expect(result.success).toBe(false)
      expect(result.failedTypes).toHaveLength(1)
      expect(result.failedTypes[0].error).toBe('DB down')
    })
  })

  describe('syncSlices', () => {
    it('指定スライスのみを同期する', async () => {
      supabase.getSerializedSlice
        .mockResolvedValueOnce({ store1: { 1: { sales: 100 } } })
        .mockResolvedValueOnce(null)

      const result = await service.syncSlices(2026, 1, ['sales', 'purchase'])

      expect(result.syncedTypes).toEqual(['sales'])
      expect(firestore.writeSlice).toHaveBeenCalledTimes(1)
      expect(firestore.writeSessionMeta).toHaveBeenCalled()
    })

    it('個別スライスのエラーを記録する', async () => {
      supabase.getSerializedSlice.mockRejectedValue(new Error('timeout'))

      const result = await service.syncSlices(2026, 1, ['sales'])

      expect(result.success).toBe(false)
      expect(result.failedTypes[0]).toEqual({ dataType: 'sales', error: 'timeout' })
    })
  })

  describe('clearFirestoreCache', () => {
    it('Firestore のキャッシュを削除する', async () => {
      await service.clearFirestoreCache(2026, 1)
      expect(firestore.clearMonth).toHaveBeenCalledWith(2026, 1)
    })
  })
})
