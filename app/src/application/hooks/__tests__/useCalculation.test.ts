/**
 * useCalculation フックのテスト
 *
 * canCalculate フラグ、自動計算のスキップ条件、
 * 同期フォールバックの動作を検証する。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useDataStore } from '@/application/stores/dataStore'
import { useUiStore } from '@/application/stores/uiStore'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { createEmptyImportedData } from '@/domain/models/storeTypes'

// ── Mocks ────────────────────────────────────────────

vi.mock('@/application/workers', () => ({
  useWorkerCalculation: () => ({
    calculateAsync: vi.fn(() => Promise.resolve({ cacheKey: 'v1:sXX:d31', results: new Map() })),
    isComputing: false,
    isWorkerAvailable: false, // disable Worker so sync path is used
  }),
}))

vi.mock('../services/calculationCache', () => ({
  calculationCache: {
    getGlobalResultByCacheKey: vi.fn(() => null), // always cache miss
    setGlobalResultWithCacheKey: vi.fn(),
    clear: vi.fn(),
    currentGlobalCacheKey: null,
  },
  computeCacheKey: vi.fn(() => 'v1:sXX:d31'),
}))

// Also mock from the @/ path alias used by the hook
vi.mock('@/application/services/calculationCache', () => ({
  calculationCache: {
    getGlobalResultByCacheKey: vi.fn(() => null),
    setGlobalResultWithCacheKey: vi.fn(),
    clear: vi.fn(),
    currentGlobalCacheKey: null,
  },
  computeCacheKey: vi.fn(() => 'v1:sXX:d31'),
}))

vi.mock('@/application/usecases/calculation', () => ({
  calculateAllStores: vi.fn(() => new Map()),
  aggregateStoreResults: vi.fn(() => ({})),
}))

vi.mock('@/application/usecases/import', () => ({
  validateImportedData: vi.fn(() => []),
  hasValidationErrors: vi.fn(() => false),
}))

import { useCalculation } from '../useCalculation'
import { calculateAllStores } from '@/application/usecases/calculation'
import { validateImportedData, hasValidationErrors } from '@/application/usecases/import'

// ── Setup ─────────────────────────────────────────────

beforeEach(() => {
  useDataStore.getState().reset()
  useUiStore.getState().resetTransientState()
  useSettingsStore.getState().reset()
  vi.clearAllMocks()
})

// ── Helpers ────────────────────────────────────────────

function makeDataWithRecords() {
  const data = createEmptyImportedData()
  return {
    ...data,
    purchase: {
      records: [
        {
          year: 2025,
          month: 1,
          day: 1,
          storeId: 's1',
          suppliers: {},
          total: { cost: 0, price: 0 },
        },
      ],
    },
    classifiedSales: {
      records: [
        {
          year: 2025,
          month: 1,
          day: 1,
          storeId: 's1',
          storeName: 'S1',
          groupName: 'G',
          departmentName: 'D',
          lineName: 'L',
          className: 'C',
          salesAmount: 100,
          discount71: 0,
          discount72: 0,
          discount73: 0,
          discount74: 0,
        },
      ],
    },
  }
}

// ── Tests ──────────────────────────────────────────────

describe('useCalculation', () => {
  describe('canCalculate', () => {
    it('is false when no data is imported', () => {
      const { result } = renderHook(() => useCalculation())
      expect(result.current.canCalculate).toBe(false)
    })

    it('is false when classifiedSales is empty', () => {
      act(() => {
        const data = {
          ...createEmptyImportedData(),
          purchase: {
            records: [
              {
                year: 2025,
                month: 1,
                day: 1,
                storeId: 's1',
                suppliers: {},
                total: { cost: 0, price: 0 },
              },
            ],
          },
        }
        useDataStore.getState().setImportedData(data)
      })
      const { result } = renderHook(() => useCalculation())
      expect(result.current.canCalculate).toBe(false)
    })

    it('is true when classifiedSales has data (purchase optional)', () => {
      act(() => {
        useDataStore.getState().setImportedData(makeDataWithRecords() as never)
      })
      const { result } = renderHook(() => useCalculation())
      expect(result.current.canCalculate).toBe(true)
    })

    it('is true even without purchase data if classifiedSales exists', () => {
      act(() => {
        const data = {
          ...createEmptyImportedData(),
          classifiedSales: {
            records: [
              {
                year: 2025,
                month: 1,
                day: 1,
                storeId: 's1',
                storeName: 'S1',
                groupName: 'G',
                departmentName: 'D',
                lineName: 'L',
                className: 'C',
                salesAmount: 100,
                discount71: 0,
                discount72: 0,
                discount73: 0,
                discount74: 0,
              },
            ],
          },
        }
        useDataStore.getState().setImportedData(data as never)
      })
      const { result } = renderHook(() => useCalculation())
      expect(result.current.canCalculate).toBe(true)
    })
  })

  describe('initial state', () => {
    it('isCalculated is false initially', () => {
      const { result } = renderHook(() => useCalculation())
      expect(result.current.isCalculated).toBe(false)
    })

    it('storeResults is empty map initially', () => {
      const { result } = renderHook(() => useCalculation())
      expect(result.current.storeResults.size).toBe(0)
    })

    it('isComputing is false initially (worker disabled)', () => {
      const { result } = renderHook(() => useCalculation())
      expect(result.current.isComputing).toBe(false)
    })

    it('isWorkerAvailable is false (worker disabled in mock)', () => {
      const { result } = renderHook(() => useCalculation())
      expect(result.current.isWorkerAvailable).toBe(false)
    })

    it('daysInMonth matches current settings', () => {
      useSettingsStore.getState().updateSettings({ targetYear: 2025, targetMonth: 2 })
      const { result } = renderHook(() => useCalculation())
      // Feb 2025 = 28 days
      expect(result.current.daysInMonth).toBe(28)
    })
  })

  describe('calculate function', () => {
    it('returns false when validation errors exist', () => {
      vi.mocked(hasValidationErrors).mockReturnValue(true)

      const { result } = renderHook(() => useCalculation())
      let returned: boolean | undefined
      act(() => {
        returned = result.current.calculate()
      })
      expect(returned).toBe(false)
    })

    it('calls calculateAllStores when worker is unavailable and no cache', () => {
      vi.mocked(hasValidationErrors).mockReturnValue(false)
      vi.mocked(validateImportedData).mockReturnValue([])

      act(() => {
        useDataStore.getState().setImportedData(makeDataWithRecords() as never)
      })

      const { result } = renderHook(() => useCalculation())
      act(() => {
        result.current.calculate()
      })

      expect(calculateAllStores).toHaveBeenCalled()
    })

    it('sets isCalculated to true after calculation', () => {
      vi.mocked(hasValidationErrors).mockReturnValue(false)
      vi.mocked(calculateAllStores).mockReturnValue(new Map())

      act(() => {
        useDataStore.getState().setImportedData(makeDataWithRecords() as never)
      })

      const { result } = renderHook(() => useCalculation())
      act(() => {
        result.current.calculate()
      })

      expect(useUiStore.getState().isCalculated).toBe(true)
    })

    it('returns true on successful calculation', () => {
      vi.mocked(hasValidationErrors).mockReturnValue(false)
      vi.mocked(calculateAllStores).mockReturnValue(new Map())

      act(() => {
        useDataStore.getState().setImportedData(makeDataWithRecords() as never)
      })

      const { result } = renderHook(() => useCalculation())
      let returned: boolean | undefined
      act(() => {
        returned = result.current.calculate()
      })
      expect(returned).toBe(true)
    })
  })

  describe('auto calculation effect', () => {
    it('does not auto-calculate when isImporting is true', async () => {
      vi.mocked(hasValidationErrors).mockReturnValue(false)
      vi.mocked(calculateAllStores).mockReturnValue(new Map())

      act(() => {
        useDataStore.getState().setImportedData(makeDataWithRecords() as never)
        useUiStore.getState().setImporting(true)
      })

      renderHook(() => useCalculation())

      // Should not calculate while importing
      await new Promise((r) => setTimeout(r, 20))
      expect(calculateAllStores).not.toHaveBeenCalled()
    })

    it('does not auto-calculate when already calculated', async () => {
      vi.mocked(hasValidationErrors).mockReturnValue(false)
      vi.mocked(calculateAllStores).mockReturnValue(new Map())

      act(() => {
        useDataStore.getState().setImportedData(makeDataWithRecords() as never)
        useUiStore.getState().setCalculated(true)
      })

      renderHook(() => useCalculation())

      await new Promise((r) => setTimeout(r, 20))
      expect(calculateAllStores).not.toHaveBeenCalled()
    })

    it('auto-calculates when data is available and not importing/calculated', async () => {
      vi.mocked(hasValidationErrors).mockReturnValue(false)
      vi.mocked(calculateAllStores).mockReturnValue(new Map())

      act(() => {
        useDataStore.getState().setImportedData(makeDataWithRecords() as never)
      })

      renderHook(() => useCalculation())

      await waitFor(() => {
        expect(calculateAllStores).toHaveBeenCalled()
      })
    })
  })

  describe('setUseWorker', () => {
    it('exposes setUseWorker function', () => {
      const { result } = renderHook(() => useCalculation())
      expect(typeof result.current.setUseWorker).toBe('function')
    })
  })
})
