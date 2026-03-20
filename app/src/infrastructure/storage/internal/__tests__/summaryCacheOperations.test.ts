/**
 * summaryCacheOperations.ts のユニットテスト
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { StoreDaySummaryCache } from '@/domain/models/record'

// ── Mock dbHelpers ──
vi.mock('../dbHelpers', () => ({
  openDB: vi.fn(),
  dbGet: vi.fn().mockResolvedValue(undefined),
  dbBatchPut: vi.fn().mockResolvedValue(undefined),
  STORE_MONTHLY: 'monthlyData',
}))

import { dbGet, dbBatchPut } from '../dbHelpers'
import { saveStoreDaySummaryCache, loadStoreDaySummaryCache } from '../summaryCacheOperations'

const mockDbGet = vi.mocked(dbGet)
const mockDbBatchPut = vi.mocked(dbBatchPut)

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── saveStoreDaySummaryCache ───────────────────────────────────────────────

describe('saveStoreDaySummaryCache', () => {
  it('dbBatchPut を正しいキーで呼ぶ', async () => {
    const cache: StoreDaySummaryCache = {
      sourceFingerprint: 'fp-abc',
      builtAt: '2025-06-01T00:00:00Z',
      summaries: {},
    }

    await saveStoreDaySummaryCache(cache, 2025, 6)

    expect(mockDbBatchPut).toHaveBeenCalledTimes(1)
    const [entries] = mockDbBatchPut.mock.calls[0]
    expect(entries).toHaveLength(1)
    expect(entries[0].storeName).toBe('monthlyData')
    expect(entries[0].key).toBe('2025-06_summaryCache')
    expect(entries[0].value).toBe(cache)
  })

  it('異なる年月でキーが変わる', async () => {
    const cache: StoreDaySummaryCache = {
      sourceFingerprint: 'fp',
      builtAt: '2024-12-01T00:00:00Z',
      summaries: {},
    }

    await saveStoreDaySummaryCache(cache, 2024, 12)

    const [entries] = mockDbBatchPut.mock.calls[0]
    expect(entries[0].key).toBe('2024-12_summaryCache')
  })
})

// ─── loadStoreDaySummaryCache ──────────────────────────────────────────────

describe('loadStoreDaySummaryCache', () => {
  it('データがない場合は null を返す', async () => {
    mockDbGet.mockResolvedValue(undefined)

    const result = await loadStoreDaySummaryCache(2025, 1)
    expect(result).toBeNull()
    expect(mockDbGet).toHaveBeenCalledWith('monthlyData', '2025-01_summaryCache')
  })

  it('null が返ってきた場合も null を返す', async () => {
    mockDbGet.mockResolvedValue(null)
    const result = await loadStoreDaySummaryCache(2025, 1)
    expect(result).toBeNull()
  })

  it('正常な StoreDaySummaryCache を返す', async () => {
    const cache: StoreDaySummaryCache = {
      sourceFingerprint: 'fp-xyz',
      builtAt: '2025-06-01T10:00:00Z',
      summaries: {
        S001: {
          1: {
            day: 1,
            sales: 100,
            coreSales: 100,
            grossSales: 100,
            discountAmount: 0,
            discountAbsolute: 0,
            discountEntries: [],
            purchaseCost: 0,
            purchasePrice: 0,
            interStoreInCost: 0,
            interStoreInPrice: 0,
            interStoreOutCost: 0,
            interStoreOutPrice: 0,
            interDeptInCost: 0,
            interDeptInPrice: 0,
            interDeptOutCost: 0,
            interDeptOutPrice: 0,
            flowersCost: 0,
            flowersPrice: 0,
            directProduceCost: 0,
            directProducePrice: 0,
            costInclusionCost: 0,
            customers: 10,
          },
        },
      },
    }
    mockDbGet.mockResolvedValue(cache)

    const result = await loadStoreDaySummaryCache(2025, 6)
    expect(result).toEqual(cache)
  })

  it('sourceFingerprint が string でない場合は null を返す（構造チェック）', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockDbGet.mockResolvedValue({
      sourceFingerprint: 123, // number → 不正
      builtAt: '2025-06-01T10:00:00Z',
      summaries: {},
    })

    const result = await loadStoreDaySummaryCache(2025, 6)
    expect(result).toBeNull()
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid StoreDaySummaryCache structure'),
    )
    consoleSpy.mockRestore()
  })

  it('builtAt が string でない場合は null を返す', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockDbGet.mockResolvedValue({
      sourceFingerprint: 'fp',
      builtAt: null, // null → 不正
      summaries: {},
    })

    const result = await loadStoreDaySummaryCache(2025, 6)
    expect(result).toBeNull()
    consoleSpy.mockRestore()
  })

  it('summaries が object でない場合は null を返す', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockDbGet.mockResolvedValue({
      sourceFingerprint: 'fp',
      builtAt: '2025-06-01T00:00:00Z',
      summaries: null, // null → 不正
    })

    const result = await loadStoreDaySummaryCache(2025, 6)
    expect(result).toBeNull()
    consoleSpy.mockRestore()
  })

  it('summaries が null の場合は null を返す', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockDbGet.mockResolvedValue({
      sourceFingerprint: 'fp',
      builtAt: '2025-06-01T00:00:00Z',
      summaries: null,
    })

    const result = await loadStoreDaySummaryCache(2025, 6)
    expect(result).toBeNull()
    consoleSpy.mockRestore()
  })

  it('raw が object でない場合（primitive）は null を返す', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockDbGet.mockResolvedValue('just-a-string' as unknown as StoreDaySummaryCache)

    const result = await loadStoreDaySummaryCache(2025, 6)
    expect(result).toBeNull()
    consoleSpy.mockRestore()
  })

  it('正しいキーで dbGet を呼ぶ', async () => {
    mockDbGet.mockResolvedValue(undefined)
    await loadStoreDaySummaryCache(2024, 11)
    expect(mockDbGet).toHaveBeenCalledWith('monthlyData', '2024-11_summaryCache')
  })
})
