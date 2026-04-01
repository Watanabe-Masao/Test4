/**
 * usePersistence フックのテスト
 *
 * 保存・差分確認・差分判定・ダイアログ制御ロジックを検証する。
 * PersistenceProvider でラップして Context 経由の復元状態を提供する。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { useDataStore } from '@/application/stores/dataStore'
import { useUiStore } from '@/application/stores/uiStore'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { createEmptyImportedData } from '@/domain/models/storeTypes'
import { createEmptyMonthlyData } from '@/domain/models/MonthlyData'
import type { DiffResult } from '@/domain/models/analysis'
import type { ImportedData } from '@/domain/models/storeTypes'
import type { PersistedSessionMeta } from '@/domain/repositories/DataRepository'

// ── Mocks ─────────────────────────────────────────────

const mockRepo = {
  isAvailable: vi.fn(() => true),
  saveMonthlyData: vi.fn(() => Promise.resolve()),
  loadMonthlyData: vi.fn<() => Promise<ImportedData | null>>(() => Promise.resolve(null)),
  clearMonth: vi.fn(() => Promise.resolve()),
  clearAll: vi.fn(() => Promise.resolve()),
  getSessionMeta: vi.fn<() => Promise<PersistedSessionMeta | null>>(() => Promise.resolve(null)),
  listStoredMonths: vi.fn(() => Promise.resolve([])),
  loadDataSlice: vi.fn(() => Promise.resolve(null)),
  loadSummaryCache: vi.fn(() => Promise.resolve(null)),
  saveSummaryCache: vi.fn(() => Promise.resolve()),
}

vi.mock('@/application/context/useRepository', () => ({
  useRepository: () => mockRepo,
}))

vi.mock('@/application/services/diffCalculator', () => ({
  calculateDiff: vi.fn(() => ({ needsConfirmation: false, diffs: [] })),
}))

import { usePersistence } from '../usePersistence'
import { PersistenceProvider } from '@/application/context/PersistenceProvider'
import { calculateDiff } from '@/application/services/diffCalculator'

// ── Provider wrapper for renderHook ──────────────────

function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <PersistenceProvider>{children}</PersistenceProvider>
  }
}

// ── Setup ──────────────────────────────────────────────

beforeEach(() => {
  useDataStore.getState().reset()
  useUiStore.getState().resetTransientState()
  useSettingsStore.getState().reset()
  vi.clearAllMocks()
})

// ── Tests ──────────────────────────────────────────────

describe('usePersistence', () => {
  describe('initial state', () => {
    it('available is true when repo.isAvailable() returns true', async () => {
      mockRepo.isAvailable.mockReturnValue(true)
      mockRepo.getSessionMeta.mockResolvedValue(null)
      const { result } = renderHook(() => usePersistence(), { wrapper: createWrapper() })
      await waitFor(() => {
        expect(result.current.available).toBe(true)
      })
    })

    it('available is false when repo.isAvailable() returns false', async () => {
      mockRepo.isAvailable.mockReturnValue(false)
      const { result } = renderHook(() => usePersistence(), { wrapper: createWrapper() })
      await waitFor(() => {
        expect(result.current.available).toBe(false)
      })
    })

    it('showDiffDialog is false initially', async () => {
      mockRepo.getSessionMeta.mockResolvedValue(null)
      const { result } = renderHook(() => usePersistence(), { wrapper: createWrapper() })
      await waitFor(() => {
        expect(result.current.showDiffDialog).toBe(false)
      })
    })

    it('diffResult is null initially', async () => {
      mockRepo.getSessionMeta.mockResolvedValue(null)
      const { result } = renderHook(() => usePersistence(), { wrapper: createWrapper() })
      await waitFor(() => {
        expect(result.current.diffResult).toBeNull()
      })
    })

    it('isSaving is false initially', async () => {
      mockRepo.getSessionMeta.mockResolvedValue(null)
      const { result } = renderHook(() => usePersistence(), { wrapper: createWrapper() })
      await waitFor(() => {
        expect(result.current.isSaving).toBe(false)
      })
    })

    it('autoRestored is false while restore is in progress', () => {
      mockRepo.isAvailable.mockReturnValue(true)
      mockRepo.getSessionMeta.mockReturnValue(new Promise(() => {})) // pending
      const { result } = renderHook(() => usePersistence(), { wrapper: createWrapper() })
      expect(result.current.autoRestored).toBe(false)
    })

    it('autoRestored is true when repo is not available (restore skipped)', async () => {
      mockRepo.isAvailable.mockReturnValue(false)
      const { result } = renderHook(() => usePersistence(), { wrapper: createWrapper() })
      await waitFor(() => {
        expect(result.current.autoRestored).toBe(true)
      })
    })
  })

  describe('auto restore on mount', () => {
    it('sets autoRestored when session meta and data are available', async () => {
      mockRepo.isAvailable.mockReturnValue(true)
      mockRepo.getSessionMeta.mockResolvedValue({
        year: 2025,
        month: 3,
        savedAt: '2025-03-01T00:00:00.000Z',
      })
      const data = {
        ...createEmptyImportedData(),
        stores: new Map([['s1', { id: 's1', code: '001', name: 'Loaded' }]]),
      }
      mockRepo.loadMonthlyData.mockResolvedValue(data)

      const { result } = renderHook(() => usePersistence(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.autoRestored).toBe(true)
      })
      expect(useDataStore.getState().currentMonthData?.stores.size).toBe(1)
    })

    it('sets autoRestored true even when getSessionMeta returns null (no data to restore)', async () => {
      mockRepo.isAvailable.mockReturnValue(true)
      mockRepo.getSessionMeta.mockResolvedValue(null)

      const { result } = renderHook(() => usePersistence(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(mockRepo.getSessionMeta).toHaveBeenCalled()
        // 復元すべきデータがなくても「復元処理は完了」として扱う
        expect(result.current.autoRestored).toBe(true)
      })
    })

    it('does not restore when not available', async () => {
      mockRepo.isAvailable.mockReturnValue(false)

      renderHook(() => usePersistence(), { wrapper: createWrapper() })

      // wait a tick
      await new Promise((r) => setTimeout(r, 10))
      expect(mockRepo.getSessionMeta).not.toHaveBeenCalled()
    })
  })

  describe('saveCurrentData', () => {
    it('calls repo.saveMonthlyData with current data and year/month', async () => {
      mockRepo.isAvailable.mockReturnValue(true)
      useSettingsStore.getState().updateSettings({ targetYear: 2025, targetMonth: 7 })
      // currentMonthData を設定（saveCurrentData は currentMonthData が null なら早期 return）
      useDataStore
        .getState()
        .setCurrentMonthData(createEmptyMonthlyData({ year: 2025, month: 7, importedAt: '' }))

      const { result } = renderHook(() => usePersistence(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.saveCurrentData()
      })

      expect(mockRepo.saveMonthlyData).toHaveBeenCalledWith(expect.anything(), 2025, 7)
    })

    it('does not save when not available', async () => {
      mockRepo.isAvailable.mockReturnValue(false)

      const { result } = renderHook(() => usePersistence(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.saveCurrentData()
      })

      expect(mockRepo.saveMonthlyData).not.toHaveBeenCalled()
    })

    it('isSaving is false after save completes', async () => {
      mockRepo.isAvailable.mockReturnValue(true)

      const { result } = renderHook(() => usePersistence(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.saveCurrentData()
      })

      expect(result.current.isSaving).toBe(false)
    })
  })

  describe('checkDiffBeforeImport', () => {
    it('returns null when not available', async () => {
      mockRepo.isAvailable.mockReturnValue(false)

      const { result } = renderHook(() => usePersistence(), { wrapper: createWrapper() })

      let returned: DiffResult | null | undefined
      await act(async () => {
        returned = await result.current.checkDiffBeforeImport(
          createEmptyImportedData(),
          new Set(['purchase']),
        )
      })
      expect(returned).toBeNull()
    })

    it('returns null when no existing data', async () => {
      mockRepo.isAvailable.mockReturnValue(true)
      mockRepo.loadMonthlyData.mockResolvedValue(null)

      const { result } = renderHook(() => usePersistence(), { wrapper: createWrapper() })

      let returned: DiffResult | null | undefined
      await act(async () => {
        returned = await result.current.checkDiffBeforeImport(
          createEmptyImportedData(),
          new Set(['purchase']),
        )
      })
      expect(returned).toBeNull()
    })

    it('returns null when diff does not need confirmation', async () => {
      mockRepo.isAvailable.mockReturnValue(true)
      mockRepo.loadMonthlyData.mockResolvedValue(createEmptyImportedData())
      vi.mocked(calculateDiff).mockReturnValue({
        needsConfirmation: false,
        diffs: [],
      } as unknown as DiffResult)

      const { result } = renderHook(() => usePersistence(), { wrapper: createWrapper() })

      let returned: DiffResult | null | undefined
      await act(async () => {
        returned = await result.current.checkDiffBeforeImport(
          createEmptyImportedData(),
          new Set(['purchase']),
        )
      })
      expect(returned).toBeNull()
    })

    it('shows diff dialog and returns diff when confirmation needed', async () => {
      mockRepo.isAvailable.mockReturnValue(true)
      mockRepo.loadMonthlyData.mockResolvedValue(createEmptyImportedData())

      const fakeDiff: DiffResult = {
        needsConfirmation: true,
        diffs: [],
      } as unknown as DiffResult
      vi.mocked(calculateDiff).mockReturnValue(fakeDiff)

      const { result } = renderHook(() => usePersistence(), { wrapper: createWrapper() })

      let returned: DiffResult | null | undefined
      await act(async () => {
        returned = await result.current.checkDiffBeforeImport(
          createEmptyImportedData(),
          new Set(['purchase']),
        )
      })

      expect(returned).toBe(fakeDiff)
      expect(result.current.showDiffDialog).toBe(true)
      expect(result.current.diffResult).toBe(fakeDiff)
    })
  })

  describe('applyDiffDecision', () => {
    it('overwrite: returns incoming data as-is', async () => {
      mockRepo.getSessionMeta.mockResolvedValue(null)
      const { result } = renderHook(() => usePersistence(), { wrapper: createWrapper() })
      await waitFor(() => expect(result.current.autoRestored).toBe(true))

      const incoming = {
        ...createEmptyImportedData(),
        stores: new Map([['s1', { id: 's1', code: '001', name: 'New' }]]),
      }
      const existing = createEmptyImportedData()

      const applied = result.current.applyDiffDecision('overwrite', incoming, existing)
      expect(applied).toBe(incoming)
    })

    it('keep-existing: merges inserts only and preserves existing stores', async () => {
      mockRepo.getSessionMeta.mockResolvedValue(null)
      const { result } = renderHook(() => usePersistence(), { wrapper: createWrapper() })
      await waitFor(() => expect(result.current.autoRestored).toBe(true))

      const existing = {
        ...createEmptyImportedData(),
        stores: new Map([['s1', { id: 's1', code: '001', name: 'Existing' }]]),
      }
      const incoming = createEmptyImportedData()

      const applied = result.current.applyDiffDecision('keep-existing', incoming, existing)
      // keep-existing は既存データを基盤にするため、既存 stores が保持される
      expect(applied.stores.has('s1')).toBe(true)
    })
  })

  describe('dismissDiffDialog', () => {
    it('clears showDiffDialog and diffResult', async () => {
      mockRepo.isAvailable.mockReturnValue(true)
      mockRepo.loadMonthlyData.mockResolvedValue(createEmptyImportedData())
      vi.mocked(calculateDiff).mockReturnValue({
        needsConfirmation: true,
        diffs: [],
      } as unknown as DiffResult)

      const { result } = renderHook(() => usePersistence(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.checkDiffBeforeImport(createEmptyImportedData(), new Set(['purchase']))
      })
      expect(result.current.showDiffDialog).toBe(true)

      act(() => {
        result.current.dismissDiffDialog()
      })
      expect(result.current.showDiffDialog).toBe(false)
      expect(result.current.diffResult).toBeNull()
    })
  })

  describe('clearCurrentMonth', () => {
    it('calls repo.clearMonth with current year/month', async () => {
      mockRepo.isAvailable.mockReturnValue(true)
      useSettingsStore.getState().updateSettings({ targetYear: 2025, targetMonth: 5 })

      const { result } = renderHook(() => usePersistence(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.clearCurrentMonth()
      })

      expect(mockRepo.clearMonth).toHaveBeenCalledWith(2025, 5)
    })

    it('does not call clearMonth when not available', async () => {
      mockRepo.isAvailable.mockReturnValue(false)

      const { result } = renderHook(() => usePersistence(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.clearCurrentMonth()
      })

      expect(mockRepo.clearMonth).not.toHaveBeenCalled()
    })
  })

  describe('clearAll', () => {
    it('calls repo.clearAll', async () => {
      mockRepo.isAvailable.mockReturnValue(true)

      const { result } = renderHook(() => usePersistence(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.clearAll()
      })

      expect(mockRepo.clearAll).toHaveBeenCalled()
    })

    it('does not call clearAll when not available', async () => {
      mockRepo.isAvailable.mockReturnValue(false)

      const { result } = renderHook(() => usePersistence(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.clearAll()
      })

      expect(mockRepo.clearAll).not.toHaveBeenCalled()
    })
  })
})
