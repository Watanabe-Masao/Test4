/**
 * SyncService のユニットテスト
 *
 * IndexedDBRepository と SupabaseRepository をモックし、
 * IndexedDB → Supabase の同期ロジックを検証する。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SyncService } from '../SyncService'
import { createEmptyImportedData } from '@/domain/models'

// ─── モック ──────────────────────────────────────────────

function createMockLocal() {
  return {
    loadMonthlyData: vi.fn(),
  }
}

function createMockRemote() {
  return {
    saveMonthlyData: vi.fn().mockResolvedValue(undefined),
    saveDataSlice: vi.fn().mockResolvedValue(undefined),
    writeSyncLog: vi.fn().mockResolvedValue(undefined),
  }
}

describe('SyncService', () => {
  let local: ReturnType<typeof createMockLocal>
  let remote: ReturnType<typeof createMockRemote>
  let service: SyncService

  beforeEach(() => {
    local = createMockLocal()
    remote = createMockRemote()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new SyncService(local as any, remote as any)
  })

  describe('pushToRemote', () => {
    it('データを Supabase に保存する', async () => {
      const data = createEmptyImportedData()

      const result = await service.pushToRemote(2026, 1, data)

      expect(result.success).toBe(true)
      expect(result.syncedTypes).toEqual(['*'])
      expect(result.failedTypes).toHaveLength(0)
      expect(remote.saveMonthlyData).toHaveBeenCalledWith(data, 2026, 1)
    })

    it('エラー時は失敗を記録する', async () => {
      const data = createEmptyImportedData()
      remote.saveMonthlyData.mockRejectedValue(new Error('DB down'))

      const result = await service.pushToRemote(2026, 1, data)

      expect(result.success).toBe(false)
      expect(result.failedTypes).toHaveLength(1)
      expect(result.failedTypes[0].error).toBe('DB down')
    })

    it('同期ログを記録する', async () => {
      const data = createEmptyImportedData()

      await service.pushToRemote(2026, 1, data)

      expect(remote.writeSyncLog).toHaveBeenCalledWith(2026, 1, '*', 'success', undefined)
    })
  })

  describe('pushSlicesToRemote', () => {
    it('指定データ種別を Supabase に保存する', async () => {
      const data = createEmptyImportedData()

      const result = await service.pushSlicesToRemote(2026, 1, data, ['classifiedSales', 'purchase'])

      expect(result.success).toBe(true)
      expect(result.syncedTypes).toEqual(['classifiedSales', 'purchase'])
      expect(remote.saveDataSlice).toHaveBeenCalledWith(data, 2026, 1, ['classifiedSales', 'purchase'])
    })

    it('エラー時は全種別を失敗として記録する', async () => {
      const data = createEmptyImportedData()
      remote.saveDataSlice.mockRejectedValue(new Error('timeout'))

      const result = await service.pushSlicesToRemote(2026, 1, data, ['classifiedSales'])

      expect(result.success).toBe(false)
      expect(result.failedTypes[0]).toEqual({ dataType: 'classifiedSales', error: 'timeout' })
    })
  })

  describe('syncFromLocal', () => {
    it('ローカルデータを読み込んでリモートにプッシュする', async () => {
      const data = createEmptyImportedData()
      local.loadMonthlyData.mockResolvedValue(data)

      const result = await service.syncFromLocal(2026, 1)

      expect(result.success).toBe(true)
      expect(remote.saveMonthlyData).toHaveBeenCalledWith(data, 2026, 1)
    })

    it('ローカルにデータがない場合は何もしない', async () => {
      local.loadMonthlyData.mockResolvedValue(null)

      const result = await service.syncFromLocal(2026, 1)

      expect(result.success).toBe(true)
      expect(result.syncedTypes).toHaveLength(0)
      expect(remote.saveMonthlyData).not.toHaveBeenCalled()
    })

    it('ローカル読み込みエラー時は失敗を返す', async () => {
      local.loadMonthlyData.mockRejectedValue(new Error('IndexedDB error'))

      const result = await service.syncFromLocal(2026, 1)

      expect(result.success).toBe(false)
      expect(result.failedTypes[0].error).toBe('IndexedDB error')
    })
  })
})
