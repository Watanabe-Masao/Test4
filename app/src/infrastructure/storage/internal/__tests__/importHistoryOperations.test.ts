/**
 * importHistoryOperations.ts のユニットテスト
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ImportHistoryEntry } from '@/domain/models/analysis'

// ── Mock dbHelpers ──
vi.mock('../dbHelpers', () => ({
  openDB: vi.fn(),
  dbGet: vi.fn().mockResolvedValue(undefined),
  dbBatchPutWithReadModify: vi.fn().mockResolvedValue(undefined),
  STORE_MONTHLY: 'monthlyData',
  STORE_META: 'metadata',
}))

import { dbGet, dbBatchPutWithReadModify } from '../dbHelpers'
import { saveImportHistory, loadImportHistory } from '../importHistoryOperations'

const mockDbGet = vi.mocked(dbGet)
const mockDbBatchPutWithReadModify = vi.mocked(dbBatchPutWithReadModify)

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── saveImportHistory ──────────────────────────────────────────────────────

describe('saveImportHistory', () => {
  it('dbBatchPutWithReadModify を空 entries + readModifyOp で呼ぶ', async () => {
    const entry: ImportHistoryEntry = {
      importedAt: '2025-06-01T10:00:00Z',
      files: [{ filename: 'purchase.csv', type: 'purchase', typeName: '仕入', rowCount: 100 }],
      successCount: 1,
      failureCount: 0,
    }

    await saveImportHistory(2025, 6, entry)

    expect(mockDbBatchPutWithReadModify).toHaveBeenCalledTimes(1)
    const [entries, readModifyOps] = mockDbBatchPutWithReadModify.mock.calls[0]
    expect(entries).toEqual([])
    expect(readModifyOps).toHaveLength(1)
  })

  it('readModifyOp のキーは importHistoryKey(year, month)', async () => {
    const entry: ImportHistoryEntry = {
      importedAt: '2025-01-01T00:00:00Z',
      files: [{ filename: 'f.csv', type: 'purchase', typeName: '仕入', rowCount: 10 }],
      successCount: 1,
      failureCount: 0,
    }

    await saveImportHistory(2025, 3, entry)

    const [, readModifyOps] = mockDbBatchPutWithReadModify.mock.calls[0]
    const op = (
      readModifyOps as unknown as Array<{
        storeName: string
        key: string
        modify: (e: unknown) => unknown
      }>
    )[0]
    expect(op.storeName).toBe('monthlyData')
    expect(op.key).toBe('2025-03_importHistory')
  })

  it('modify: 既存なし → [entry] を返す', async () => {
    const entry: ImportHistoryEntry = {
      importedAt: '2025-01-01T00:00:00Z',
      files: [{ filename: 'f.csv', type: 'purchase', typeName: '仕入', rowCount: 10 }],
      successCount: 1,
      failureCount: 0,
    }

    await saveImportHistory(2025, 1, entry)

    const [, readModifyOps] = mockDbBatchPutWithReadModify.mock.calls[0]
    const op = (readModifyOps as unknown as Array<{ modify: (e: unknown) => unknown }>)[0]

    // undefined → 新規
    const result = op.modify(undefined) as ImportHistoryEntry[]
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(entry)
  })

  it('modify: 既存あり → entry を先頭に追加', async () => {
    const existing: ImportHistoryEntry[] = [
      {
        importedAt: '2025-01-01T00:00:00Z',
        files: [{ filename: 'f.csv', type: 'flowers', typeName: '花', rowCount: 5 }],
        successCount: 1,
        failureCount: 0,
      },
    ]
    const newEntry: ImportHistoryEntry = {
      importedAt: '2025-01-02T00:00:00Z',
      files: [{ filename: 'p.csv', type: 'purchase', typeName: '仕入', rowCount: 10 }],
      successCount: 1,
      failureCount: 0,
    }

    await saveImportHistory(2025, 1, newEntry)

    const [, readModifyOps] = mockDbBatchPutWithReadModify.mock.calls[0]
    const op = (readModifyOps as unknown as Array<{ modify: (e: unknown) => unknown }>)[0]
    const result = op.modify(existing) as ImportHistoryEntry[]

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual(newEntry) // 先頭が新しいエントリ
    expect(result[1]).toEqual(existing[0])
  })

  it('modify: 20件超の場合は末尾を切り捨てる', async () => {
    const existing: ImportHistoryEntry[] = Array.from({ length: 20 }, (_, i) => ({
      importedAt: `2025-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
      files: [{ filename: `f${i}.csv`, type: 'purchase', typeName: '仕入', rowCount: i }],
      successCount: 1,
      failureCount: 0,
    }))
    const newEntry: ImportHistoryEntry = {
      importedAt: '2025-02-01T00:00:00Z',
      files: [{ filename: 'new.csv', type: 'flowers', typeName: '花', rowCount: 99 }],
      successCount: 1,
      failureCount: 0,
    }

    await saveImportHistory(2025, 1, newEntry)

    const [, readModifyOps] = mockDbBatchPutWithReadModify.mock.calls[0]
    const op = (readModifyOps as unknown as Array<{ modify: (e: unknown) => unknown }>)[0]
    const result = op.modify(existing) as ImportHistoryEntry[]

    expect(result).toHaveLength(20) // 20件上限
    expect(result[0]).toEqual(newEntry) // 先頭が新エントリ
  })

  it('modify: 配列でない既存値は空配列として扱う', async () => {
    const entry: ImportHistoryEntry = {
      importedAt: '2025-01-01T00:00:00Z',
      files: [{ filename: 'f.csv', type: 'purchase', typeName: '仕入', rowCount: 1 }],
      successCount: 1,
      failureCount: 0,
    }

    await saveImportHistory(2025, 1, entry)

    const [, readModifyOps] = mockDbBatchPutWithReadModify.mock.calls[0]
    const op = (readModifyOps as unknown as Array<{ modify: (e: unknown) => unknown }>)[0]

    // null, string, number → 空配列として扱う
    expect((op.modify(null) as ImportHistoryEntry[])[0]).toEqual(entry)
    expect((op.modify('not-array') as ImportHistoryEntry[])[0]).toEqual(entry)
  })
})

// ─── loadImportHistory ──────────────────────────────────────────────────────

describe('loadImportHistory', () => {
  it('データがない場合は空配列を返す', async () => {
    mockDbGet.mockResolvedValue(undefined)

    const result = await loadImportHistory(2025, 1)
    expect(result).toEqual([])
    expect(mockDbGet).toHaveBeenCalledWith('monthlyData', '2025-01_importHistory')
  })

  it('null が返ってきた場合は空配列を返す', async () => {
    mockDbGet.mockResolvedValue(null)
    const result = await loadImportHistory(2025, 1)
    expect(result).toEqual([])
  })

  it('配列が保存されている場合はそのまま返す', async () => {
    const history: ImportHistoryEntry[] = [
      {
        importedAt: '2025-01-01T00:00:00Z',
        files: [{ filename: 'p.csv', type: 'purchase', typeName: '仕入', rowCount: 100 }],
        successCount: 1,
        failureCount: 0,
      },
    ]
    mockDbGet.mockResolvedValue(history)

    const result = await loadImportHistory(2025, 1)
    expect(result).toEqual(history)
  })

  it('年月に対応した正しいキーで dbGet を呼ぶ', async () => {
    mockDbGet.mockResolvedValue(undefined)

    await loadImportHistory(2024, 12)
    expect(mockDbGet).toHaveBeenCalledWith('monthlyData', '2024-12_importHistory')
  })
})
