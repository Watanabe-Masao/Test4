/**
 * metaOperations.ts のユニットテスト
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PersistedMeta } from '@/domain/models/analysis'

// ── Mock dbHelpers ──
vi.mock('../dbHelpers', () => ({
  openDB: vi.fn(),
  dbGet: vi.fn().mockResolvedValue(undefined),
  dbGetAllKeys: vi.fn().mockResolvedValue([]),
  STORE_META: 'metadata',
  STORE_MONTHLY: 'monthlyData',
}))

import { dbGet, dbGetAllKeys } from '../dbHelpers'
import { sessionsReadModifyOp, getPersistedMeta, listStoredMonths } from '../metaOperations'

const mockDbGet = vi.mocked(dbGet)
const mockDbGetAllKeys = vi.mocked(dbGetAllKeys)

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── sessionsReadModifyOp ───────────────────────────────────────────────────

describe('sessionsReadModifyOp', () => {
  it('ReadModifyWriteOp を生成する', () => {
    const op = sessionsReadModifyOp(2025, 6, '2025-06-01T00:00:00Z')
    expect(op.storeName).toBe('metadata')
    expect(op.key).toBe('sessions')
    expect(typeof op.modify).toBe('function')
  })

  it('modify: 新規 (undefined) → [新エントリ] を返す', () => {
    const op = sessionsReadModifyOp(2025, 6, '2025-06-01T00:00:00Z')
    const result = op.modify(undefined) as Array<{ year: number; month: number; savedAt: string }>

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ year: 2025, month: 6, savedAt: '2025-06-01T00:00:00Z' })
  })

  it('modify: 既存なし (null) → [新エントリ]', () => {
    const op = sessionsReadModifyOp(2025, 3, '2025-03-01T00:00:00Z')
    const result = op.modify(null) as Array<{ year: number; month: number }>
    expect(result).toHaveLength(1)
    expect(result[0].year).toBe(2025)
    expect(result[0].month).toBe(3)
  })

  it('modify: 既存の同年月エントリを上書きする（重複なし）', () => {
    const existing = [
      { year: 2025, month: 6, savedAt: '2025-06-01T00:00:00Z' },
      { year: 2025, month: 5, savedAt: '2025-05-01T00:00:00Z' },
    ]
    const op = sessionsReadModifyOp(2025, 6, '2025-06-15T00:00:00Z')
    const result = op.modify(existing) as typeof existing

    // 2025-06 の重複を除去して新しいエントリを追加
    expect(result).toHaveLength(2)
    const jun = result.find((s) => s.month === 6)!
    expect(jun.savedAt).toBe('2025-06-15T00:00:00Z')
  })

  it('modify: 年月降順でソートされる', () => {
    const existing = [
      { year: 2025, month: 1, savedAt: '2025-01-01T00:00:00Z' },
      { year: 2024, month: 12, savedAt: '2024-12-01T00:00:00Z' },
    ]
    const op = sessionsReadModifyOp(2025, 6, '2025-06-01T00:00:00Z')
    const result = op.modify(existing) as typeof existing

    expect(result[0].year).toBe(2025)
    expect(result[0].month).toBe(6)
    expect(result[1].month).toBe(1)
    expect(result[2].month).toBe(12)
  })

  it('modify: 同じ年で月が降順', () => {
    const existing = [
      { year: 2025, month: 3, savedAt: 'a' },
      { year: 2025, month: 1, savedAt: 'b' },
    ]
    const op = sessionsReadModifyOp(2025, 2, '2025-02-01T00:00:00Z')
    const result = op.modify(existing) as typeof existing

    expect(result.map((s) => s.month)).toEqual([3, 2, 1])
  })

  it('modify: 配列でない既存値は空配列として扱う', () => {
    const op = sessionsReadModifyOp(2025, 6, '2025-06-01T00:00:00Z')
    const result = op.modify('invalid') as unknown[]
    expect(result).toHaveLength(1)
  })
})

// ─── getPersistedMeta ─────────────────────────────────────────────────────────

describe('getPersistedMeta', () => {
  it('lastSession が存在する場合はそれを返す', async () => {
    const meta: PersistedMeta = { year: 2025, month: 6, savedAt: '2025-06-01T00:00:00Z' }
    mockDbGet.mockResolvedValue(meta)

    const result = await getPersistedMeta()
    expect(result).toEqual(meta)
    expect(mockDbGet).toHaveBeenCalledWith('metadata', 'lastSession')
  })

  it('lastSession が存在しない場合は null を返す', async () => {
    mockDbGet.mockResolvedValue(undefined)

    const result = await getPersistedMeta()
    expect(result).toBeNull()
  })

  it('null が返ってきた場合も null を返す', async () => {
    mockDbGet.mockResolvedValue(null)
    const result = await getPersistedMeta()
    expect(result).toBeNull()
  })
})

// ─── listStoredMonths ─────────────────────────────────────────────────────────

describe('listStoredMonths', () => {
  it('sessions メタデータがある場合は高速パスで返す', async () => {
    const sessions = [
      { year: 2025, month: 6, savedAt: '2025-06-01T00:00:00Z' },
      { year: 2025, month: 5, savedAt: '2025-05-01T00:00:00Z' },
    ]
    mockDbGet.mockResolvedValue(sessions)

    const result = await listStoredMonths()
    expect(result).toEqual([
      { year: 2025, month: 6 },
      { year: 2025, month: 5 },
    ])
    // dbGetAllKeys は呼ばれない
    expect(mockDbGetAllKeys).not.toHaveBeenCalled()
  })

  it('sessions が空配列の場合はキーパースフォールバックを使う', async () => {
    mockDbGet.mockResolvedValue([]) // 空 sessions
    mockDbGetAllKeys.mockResolvedValue(['2025-06_purchase', '2025-06_stores', '2025-05_purchase'])

    const result = await listStoredMonths()
    expect(result).toHaveLength(2)
    expect(result.some((m) => m.year === 2025 && m.month === 6)).toBe(true)
    expect(result.some((m) => m.year === 2025 && m.month === 5)).toBe(true)
  })

  it('sessions が undefined の場合はキーパースフォールバックを使う', async () => {
    mockDbGet.mockResolvedValue(undefined)
    mockDbGetAllKeys.mockResolvedValue(['2024-12_purchase', '2024-12_stores', '2024-11_purchase'])

    const result = await listStoredMonths()
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ year: 2024, month: 12 }) // 降順
  })

  it('フォールバック: 年月キーのパターンに合わないキーは無視する', async () => {
    mockDbGet.mockResolvedValue(undefined)
    mockDbGetAllKeys.mockResolvedValue([
      '2025-06_purchase',
      'invalid-key',
      'lastSession',
      '2025-06_stores',
    ])

    const result = await listStoredMonths()
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ year: 2025, month: 6 })
  })

  it('フォールバック: 年月降順でソートされる', async () => {
    mockDbGet.mockResolvedValue(undefined)
    mockDbGetAllKeys.mockResolvedValue(['2025-01_purchase', '2024-12_purchase', '2025-06_purchase'])

    const result = await listStoredMonths()
    expect(result[0]).toEqual({ year: 2025, month: 6 })
    expect(result[1]).toEqual({ year: 2025, month: 1 })
    expect(result[2]).toEqual({ year: 2024, month: 12 })
  })

  it('フォールバック: 全キーが無効な場合は空配列を返す', async () => {
    mockDbGet.mockResolvedValue(undefined)
    mockDbGetAllKeys.mockResolvedValue(['invalid', 'also-invalid'])

    const result = await listStoredMonths()
    expect(result).toEqual([])
  })
})
