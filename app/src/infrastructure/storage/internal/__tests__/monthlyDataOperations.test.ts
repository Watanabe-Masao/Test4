import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { StorageDataType } from '@/domain/models'
// createEmptyImportedData is available via mock setup

// ── Mock dbHelpers ──
vi.mock('../dbHelpers', () => ({
  openDB: vi.fn(),
  dbGet: vi.fn().mockResolvedValue(undefined),
  dbBatchDelete: vi.fn().mockResolvedValue(undefined),
  dbGetAllKeys: vi.fn().mockResolvedValue([]),
  dbBatchPutWithReadModify: vi.fn().mockResolvedValue(undefined),
  dbAtomicDeleteWithReadModify: vi.fn().mockResolvedValue(undefined),
  STORE_MONTHLY: 'monthlyData',
  STORE_META: 'metadata',
}))

vi.mock('../serialization', async () => {
  const actual = await vi.importActual<typeof import('../serialization')>('../serialization')
  return {
    ...actual,
    wrapEnvelope: vi.fn((value: unknown, year: number, month: number) => ({
      origin: { year, month, importedAt: '2025-01-01T00:00:00Z' },
      payload: value,
      checksum: 12345,
    })),
    unwrapEnvelope: vi.fn((raw: unknown) => {
      if (raw === undefined || raw === null) return null
      if (typeof raw === 'object' && raw !== null && 'payload' in raw) {
        return { value: (raw as Record<string, unknown>).payload, origin: null }
      }
      return { value: raw, origin: null }
    }),
  }
})

vi.mock('../metaOperations', () => ({
  sessionsReadModifyOp: vi.fn().mockReturnValue({
    storeName: 'metadata',
    key: 'sessions',
    modify: vi.fn().mockReturnValue([]),
  }),
}))

import { dbBatchDelete, dbGetAllKeys, dbGet, dbAtomicDeleteWithReadModify } from '../dbHelpers'
import {
  clearAllData,
  clearMonthData,
  loadMonthlySlice,
  getMonthDataSummary,
} from '../monthlyDataOperations'

const mockDbBatchDelete = vi.mocked(dbBatchDelete)
const mockDbGetAllKeys = vi.mocked(dbGetAllKeys)
const mockDbGet = vi.mocked(dbGet)
const mockDbAtomicDeleteWithReadModify = vi.mocked(dbAtomicDeleteWithReadModify)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('clearAllData', () => {
  it('deletes all monthly data keys and meta keys', async () => {
    mockDbGetAllKeys.mockResolvedValue(['2025-01_purchase', '2025-01_stores'])

    await clearAllData()

    expect(mockDbGetAllKeys).toHaveBeenCalledWith('monthlyData')
    expect(mockDbBatchDelete).toHaveBeenCalledTimes(1)

    const deleteEntries = mockDbBatchDelete.mock.calls[0][0] as Array<{
      storeName: string
      key: string
    }>

    // Should include the 2 monthly keys + lastSession + sessions
    expect(deleteEntries).toHaveLength(4)

    // Monthly data keys
    expect(deleteEntries[0]).toEqual({ storeName: 'monthlyData', key: '2025-01_purchase' })
    expect(deleteEntries[1]).toEqual({ storeName: 'monthlyData', key: '2025-01_stores' })

    // Meta keys
    expect(deleteEntries[2]).toEqual({ storeName: 'metadata', key: 'lastSession' })
    expect(deleteEntries[3]).toEqual({ storeName: 'metadata', key: 'sessions' })
  })

  it('handles empty keys list', async () => {
    mockDbGetAllKeys.mockResolvedValue([])

    await clearAllData()

    const deleteEntries = mockDbBatchDelete.mock.calls[0][0] as Array<{
      storeName: string
      key: string
    }>
    // Only lastSession and sessions
    expect(deleteEntries).toHaveLength(2)
  })
})

describe('clearMonthData', () => {
  it('creates delete entries for all data types of the month', async () => {
    await clearMonthData(2025, 1)

    expect(mockDbAtomicDeleteWithReadModify).toHaveBeenCalledTimes(1)

    const [deleteEntries, conditionalDeletes, readModifyOps] =
      mockDbAtomicDeleteWithReadModify.mock.calls[0]

    // Should have entries for:
    // 6 STORE_DAY_FIELDS + stores + suppliers + settings + budget
    // + classifiedSales + categoryTimeSales + departmentKpi + summaryCache + importHistory
    expect((deleteEntries as unknown[]).length).toBeGreaterThanOrEqual(10)

    // Verify keys contain correct year-month prefix
    for (const entry of deleteEntries as Array<{ storeName: string; key: string }>) {
      if (entry.storeName === 'monthlyData') {
        expect(entry.key).toContain('2025-01')
      }
    }

    // Conditional delete for lastSession
    expect((conditionalDeletes as unknown[]).length).toBe(1)

    // Read-modify-write for sessions
    expect((readModifyOps as unknown[]).length).toBe(1)
  })

  it('conditional delete only removes lastSession if year/month matches', async () => {
    await clearMonthData(2025, 6)

    const conditionalDeletes = mockDbAtomicDeleteWithReadModify.mock.calls[0][1] as Array<{
      storeName: string
      key: string
      shouldDelete: (existing: unknown) => boolean
    }>

    const shouldDelete = conditionalDeletes[0].shouldDelete

    // Matching year/month
    expect(shouldDelete({ year: 2025, month: 6 })).toBe(true)

    // Non-matching year/month
    expect(shouldDelete({ year: 2025, month: 7 })).toBe(false)
    expect(shouldDelete({ year: 2024, month: 6 })).toBe(false)

    // Null/undefined
    expect(shouldDelete(null)).toBe(false)
    expect(shouldDelete(undefined)).toBe(false)

    // Non-object
    expect(shouldDelete('string')).toBe(false)
  })

  it('read-modify-write removes the target month from sessions', async () => {
    await clearMonthData(2025, 3)

    const readModifyOps = mockDbAtomicDeleteWithReadModify.mock.calls[0][2] as Array<{
      storeName: string
      key: string
      modify: (existing: unknown) => unknown
    }>

    const modify = readModifyOps[0].modify

    // With existing sessions
    const sessions = [
      { year: 2025, month: 3, savedAt: '2025-03-01' },
      { year: 2025, month: 4, savedAt: '2025-04-01' },
    ]
    const result = modify(sessions) as Array<{ year: number; month: number }>
    expect(result).toHaveLength(1)
    expect(result[0].month).toBe(4)

    // With non-array input
    const resultNonArray = modify(null) as unknown[]
    expect(resultNonArray).toEqual([])

    // With empty array
    const resultEmpty = modify([]) as unknown[]
    expect(resultEmpty).toEqual([])
  })
})

describe('loadMonthlySlice', () => {
  it('returns null when no data exists', async () => {
    mockDbGet.mockResolvedValue(undefined)

    const result = await loadMonthlySlice<Record<string, unknown>>(2025, 1, 'purchase')

    expect(result).toBeNull()
    expect(mockDbGet).toHaveBeenCalledWith('monthlyData', '2025-01_purchase')
  })

  it('returns unwrapped value when data exists', async () => {
    const storedData = {
      payload: { S001: { 1: { suppliers: {} } } },
      origin: { year: 2025, month: 1 },
    }
    mockDbGet.mockResolvedValue(storedData)

    const result = await loadMonthlySlice<Record<string, unknown>>(2025, 1, 'purchase')

    expect(result).toEqual({ S001: { 1: { suppliers: {} } } })
  })

  it('constructs correct key for different data types', async () => {
    mockDbGet.mockResolvedValue(undefined)

    const dataTypes: StorageDataType[] = ['purchase', 'stores', 'classifiedSales', 'budget']
    for (const dt of dataTypes) {
      await loadMonthlySlice(2025, 6, dt)
    }

    const calls = mockDbGet.mock.calls
    expect(calls[0][1]).toBe('2025-06_purchase')
    expect(calls[1][1]).toBe('2025-06_stores')
    expect(calls[2][1]).toBe('2025-06_classifiedSales')
    expect(calls[3][1]).toBe('2025-06_budget')
  })
})

describe('getMonthDataSummary', () => {
  it('returns summary with zero counts when no data', async () => {
    mockDbGet.mockResolvedValue(undefined)

    const result = await getMonthDataSummary(2025, 1)

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)

    // All counts should be zero
    for (const entry of result) {
      expect(entry.recordCount).toBe(0)
      expect(typeof entry.label).toBe('string')
      expect(typeof entry.dataType).toBe('string')
    }
  })

  it('counts StoreDayRecord entries correctly', async () => {
    // For StoreDayRecord types (purchase, etc.), count is sum of day entries per store
    const purchaseData = {
      payload: {
        S001: { 1: {}, 2: {}, 3: {} },
        S002: { 1: {}, 2: {} },
      },
      origin: { year: 2025, month: 1 },
    }

    // Return purchase data for purchase key, undefined for others
    mockDbGet.mockImplementation((_store: string, key: string) => {
      if (typeof key === 'string' && key.includes('_purchase')) {
        return Promise.resolve(purchaseData)
      }
      return Promise.resolve(undefined)
    })

    const result = await getMonthDataSummary(2025, 1)
    const purchaseEntry = result.find((r) => r.dataType === 'purchase')

    expect(purchaseEntry).toBeDefined()
    // S001 has 3 days + S002 has 2 days = 5
    expect(purchaseEntry!.recordCount).toBe(5)
  })

  it('counts classifiedSales records from array', async () => {
    const csData = {
      payload: {
        records: [{ id: 1 }, { id: 2 }, { id: 3 }],
      },
      origin: { year: 2025, month: 1 },
    }

    mockDbGet.mockImplementation((_store: string, key: string) => {
      if (typeof key === 'string' && key.includes('_classifiedSales')) {
        return Promise.resolve(csData)
      }
      return Promise.resolve(undefined)
    })

    const result = await getMonthDataSummary(2025, 1)
    const csEntry = result.find((r) => r.dataType === 'classifiedSales')

    expect(csEntry).toBeDefined()
    expect(csEntry!.recordCount).toBe(3)
  })

  it('counts stores/suppliers/settings/budget from object keys', async () => {
    const storesData = {
      payload: { S001: { name: 'A' }, S002: { name: 'B' } },
      origin: { year: 2025, month: 1 },
    }

    mockDbGet.mockImplementation((_store: string, key: string) => {
      if (typeof key === 'string' && key.includes('_stores')) {
        return Promise.resolve(storesData)
      }
      return Promise.resolve(undefined)
    })

    const result = await getMonthDataSummary(2025, 1)
    const storesEntry = result.find((r) => r.dataType === 'stores')

    expect(storesEntry).toBeDefined()
    expect(storesEntry!.recordCount).toBe(2)
  })

  it('includes correct labels for data types', async () => {
    mockDbGet.mockResolvedValue(undefined)

    const result = await getMonthDataSummary(2025, 1)

    const purchaseEntry = result.find((r) => r.dataType === 'purchase')
    expect(purchaseEntry!.label).toBe('仕入')

    const csEntry = result.find((r) => r.dataType === 'classifiedSales')
    expect(csEntry!.label).toBe('分類別売上')

    const storesEntry = result.find((r) => r.dataType === 'stores')
    expect(storesEntry!.label).toBe('店舗')
  })
})
