/**
 * useMonthSwitcher フックのテスト
 *
 * switchMonth / goToPrevMonth / goToNextMonth の月切替ロジックを検証する。
 * useRepository を mock してテストを独立させる。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDataStore } from '@/application/stores/dataStore'
import { useUiStore } from '@/application/stores/uiStore'
import { useSettingsStore } from '@/application/stores/settingsStore'
import type { ImportedData } from '@/domain/models'

// ── Mock useRepository ───────────────────────────────

const mockRepo = {
  isAvailable: vi.fn(() => true),
  saveMonthlyData: vi.fn(() => Promise.resolve()),
  loadMonthlyData: vi.fn<() => Promise<ImportedData | null>>(() => Promise.resolve(null)),
  clearMonth: vi.fn(() => Promise.resolve()),
  clearAll: vi.fn(() => Promise.resolve()),
  listStoredMonths: vi.fn(() => Promise.resolve([])),
  getSessionMeta: vi.fn(() => Promise.resolve(null)),
  loadDataSlice: vi.fn(() => Promise.resolve(null)),
  loadSummaryCache: vi.fn(() => Promise.resolve(null)),
  saveSummaryCache: vi.fn(() => Promise.resolve()),
}

vi.mock('@/application/context/useRepository', () => ({
  useRepository: () => mockRepo,
}))

import { useMonthSwitcher } from '../useMonthSwitcher'

// ── Setup ─────────────────────────────────────────────

beforeEach(() => {
  useDataStore.getState().reset()
  useUiStore.getState().reset()
  useSettingsStore.getState().reset()
  vi.clearAllMocks()
})

// ── Tests ──────────────────────────────────────────────

describe('useMonthSwitcher', () => {
  describe('initial state', () => {
    it('isSwitching is false initially', () => {
      const { result } = renderHook(() => useMonthSwitcher())
      expect(result.current.isSwitching).toBe(false)
    })
  })

  describe('switchMonth', () => {
    it('does nothing when switching to same year/month', async () => {
      const { result } = renderHook(() => useMonthSwitcher())
      const currentYear = useSettingsStore.getState().settings.targetYear
      const currentMonth = useSettingsStore.getState().settings.targetMonth

      await act(async () => {
        await result.current.switchMonth(currentYear, currentMonth)
      })

      // No save / load should have been called
      expect(mockRepo.saveMonthlyData).not.toHaveBeenCalled()
      expect(mockRepo.loadMonthlyData).not.toHaveBeenCalled()
    })

    it('updates targetYear and targetMonth in settingsStore', async () => {
      const { result } = renderHook(() => useMonthSwitcher())

      await act(async () => {
        await result.current.switchMonth(2025, 6)
      })

      expect(useSettingsStore.getState().settings.targetYear).toBe(2025)
      expect(useSettingsStore.getState().settings.targetMonth).toBe(6)
    })

    it('isSwitching returns to false after switching', async () => {
      const { result } = renderHook(() => useMonthSwitcher())

      await act(async () => {
        await result.current.switchMonth(2025, 5)
      })

      expect(result.current.isSwitching).toBe(false)
    })

    it('loads new month data from repo when available', async () => {
      const { result } = renderHook(() => useMonthSwitcher())

      await act(async () => {
        await result.current.switchMonth(2025, 3)
      })

      expect(mockRepo.loadMonthlyData).toHaveBeenCalledWith(2025, 3)
    })

    it('sets loaded data when repo returns data', async () => {
      const { createEmptyImportedData } = await import('@/domain/models')
      const loadedData = {
        ...createEmptyImportedData(),
        stores: new Map([['s1', { id: 's1', code: '001', name: 'Loaded' }]]),
      }
      mockRepo.loadMonthlyData.mockResolvedValueOnce(loadedData)

      const { result } = renderHook(() => useMonthSwitcher())

      await act(async () => {
        await result.current.switchMonth(2025, 3)
      })

      expect(useDataStore.getState().data.stores.size).toBe(1)
    })

    it('saves current data when hasData and repo is available', async () => {
      const { createEmptyImportedData } = await import('@/domain/models')
      const dataWithRecords = {
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
      act(() => {
        useDataStore.getState().setImportedData(dataWithRecords)
      })
      useSettingsStore.getState().updateSettings({ targetYear: 2025, targetMonth: 1 })

      const { result } = renderHook(() => useMonthSwitcher())

      await act(async () => {
        await result.current.switchMonth(2025, 2)
      })

      expect(mockRepo.saveMonthlyData).toHaveBeenCalled()
    })

    it('invalidates calculation after switching', async () => {
      useUiStore.getState().setCalculated(true)
      const { result } = renderHook(() => useMonthSwitcher())

      await act(async () => {
        await result.current.switchMonth(2025, 4)
      })

      expect(useUiStore.getState().isCalculated).toBe(false)
    })
  })

  describe('goToPrevMonth', () => {
    it('decrements month by 1', async () => {
      useSettingsStore.getState().updateSettings({ targetYear: 2025, targetMonth: 6 })
      const { result } = renderHook(() => useMonthSwitcher())

      await act(async () => {
        await result.current.goToPrevMonth()
      })

      expect(useSettingsStore.getState().settings.targetMonth).toBe(5)
      expect(useSettingsStore.getState().settings.targetYear).toBe(2025)
    })

    it('wraps month from January to December and decrements year', async () => {
      useSettingsStore.getState().updateSettings({ targetYear: 2025, targetMonth: 1 })
      const { result } = renderHook(() => useMonthSwitcher())

      await act(async () => {
        await result.current.goToPrevMonth()
      })

      expect(useSettingsStore.getState().settings.targetMonth).toBe(12)
      expect(useSettingsStore.getState().settings.targetYear).toBe(2024)
    })
  })

  describe('goToNextMonth', () => {
    it('increments month by 1', async () => {
      useSettingsStore.getState().updateSettings({ targetYear: 2025, targetMonth: 3 })
      const { result } = renderHook(() => useMonthSwitcher())

      await act(async () => {
        await result.current.goToNextMonth()
      })

      expect(useSettingsStore.getState().settings.targetMonth).toBe(4)
      expect(useSettingsStore.getState().settings.targetYear).toBe(2025)
    })

    it('wraps month from December to January and increments year', async () => {
      useSettingsStore.getState().updateSettings({ targetYear: 2025, targetMonth: 12 })
      const { result } = renderHook(() => useMonthSwitcher())

      await act(async () => {
        await result.current.goToNextMonth()
      })

      expect(useSettingsStore.getState().settings.targetMonth).toBe(1)
      expect(useSettingsStore.getState().settings.targetYear).toBe(2026)
    })
  })
})
