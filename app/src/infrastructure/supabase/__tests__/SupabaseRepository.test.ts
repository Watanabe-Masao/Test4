/**
 * SupabaseRepository のユニットテスト
 *
 * Supabase クライアントをモックし、DataRepository インターフェースの
 * 契約が正しく実装されていることを検証する。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SupabaseRepository } from '../SupabaseRepository'
import { createEmptyImportedData } from '@/domain/models'

// ─── Supabase クライアントモック ─────────────────────────

const mockFrom = vi.fn()
const mockClient = { from: mockFrom }

vi.mock('../client', () => ({
  getSupabaseClient: () => mockClient,
  isSupabaseAvailable: () => true,
}))

// チェーンモック用ヘルパー
function createChainMock(resolvedValue: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  chain.gte = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(resolvedValue)
  chain.upsert = vi.fn().mockResolvedValue({ error: null })
  chain.insert = vi.fn().mockResolvedValue({ error: null })
  chain.delete = vi.fn().mockReturnValue(chain)

  // select が呼ばれた場合は Promise-like にも対応
  const makeThenable = (obj: Record<string, ReturnType<typeof vi.fn>>) => {
    obj.then = vi.fn((resolve: (v: unknown) => void) => resolve(resolvedValue))
    return obj
  }
  makeThenable(chain)

  return chain
}

describe('SupabaseRepository', () => {
  let repo: SupabaseRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new SupabaseRepository()
  })

  describe('isAvailable', () => {
    it('Supabase が設定済みの場合 true を返す', () => {
      expect(repo.isAvailable()).toBe(true)
    })
  })

  describe('saveMonthlyData', () => {
    it('全データ種別を upsert で保存する', async () => {
      const chain = createChainMock({ error: null })
      mockFrom.mockReturnValue(chain)

      const data = createEmptyImportedData()
      await repo.saveMonthlyData(data, 2026, 1)

      // monthly_data と session_meta の2回呼ばれる
      expect(mockFrom).toHaveBeenCalledWith('monthly_data')
      expect(mockFrom).toHaveBeenCalledWith('session_meta')
    })
  })

  describe('loadMonthlyData', () => {
    it('セッションメタが一致しない場合 null を返す', async () => {
      // getSessionMeta → null
      const metaChain = createChainMock({ data: null, error: { message: 'not found' } })
      mockFrom.mockReturnValue(metaChain)

      const result = await repo.loadMonthlyData(2026, 1)
      expect(result).toBeNull()
    })
  })

  describe('clearMonth', () => {
    it('delete を年月条件で実行する', async () => {
      const chain = createChainMock({ error: null })
      // getSessionMeta も null を返す
      chain.single = vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } })
      mockFrom.mockReturnValue(chain)

      await repo.clearMonth(2026, 1)

      expect(mockFrom).toHaveBeenCalledWith('monthly_data')
      expect(chain.delete).toHaveBeenCalled()
    })
  })

  describe('listStoredMonths', () => {
    it('ユニークな年月リストをソートして返す', async () => {
      const rows = [
        { year: 2026, month: 1 },
        { year: 2026, month: 1 },
        { year: 2025, month: 12 },
        { year: 2026, month: 2 },
      ]
      const chain = createChainMock({ data: rows, error: null })
      // select が直接 Promise を返すようにする
      chain.select = vi.fn().mockResolvedValue({ data: rows, error: null })
      mockFrom.mockReturnValue(chain)

      const result = await repo.listStoredMonths()

      expect(result).toEqual([
        { year: 2026, month: 2 },
        { year: 2026, month: 1 },
        { year: 2025, month: 12 },
      ])
    })
  })

  describe('writeSyncLog', () => {
    it('同期ログを insert する', async () => {
      const chain = createChainMock({ error: null })
      mockFrom.mockReturnValue(chain)

      await repo.writeSyncLog(2026, 1, 'sales', 'success')

      expect(mockFrom).toHaveBeenCalledWith('sync_log')
      expect(chain.insert).toHaveBeenCalled()
    })
  })
})
