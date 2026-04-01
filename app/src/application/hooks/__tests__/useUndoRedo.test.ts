/**
 * useUndoRedo フックのテスト
 *
 * 設定変更・在庫設定変更のスナップショット保存と
 * undo/redo 操作を検証する。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUndoRedo } from '../useUndoRedo'
import { useDataStore } from '@/application/stores/dataStore'
import { useUiStore } from '@/application/stores/uiStore'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { createEmptyMonthlyData } from '@/domain/models/MonthlyData'

// ── Setup ─────────────────────────────────────────────

beforeEach(() => {
  useDataStore.getState().reset()
  useUiStore.getState().resetTransientState()
  useSettingsStore.getState().reset()
})

// ── Tests ─────────────────────────────────────────────

describe('useUndoRedo', () => {
  describe('initial state', () => {
    it('canUndo is false initially', () => {
      const { result } = renderHook(() => useUndoRedo())
      expect(result.current.canUndo).toBe(false)
    })

    it('canRedo is false initially', () => {
      const { result } = renderHook(() => useUndoRedo())
      expect(result.current.canRedo).toBe(false)
    })
  })

  describe('saveSnapshot', () => {
    it('enables canUndo after saving snapshot', () => {
      const { result } = renderHook(() => useUndoRedo())
      act(() => {
        result.current.saveSnapshot('設定変更')
      })
      expect(result.current.canUndo).toBe(true)
    })

    it('clears canRedo when a new snapshot is saved', () => {
      const { result } = renderHook(() => useUndoRedo())

      // save → undo → save again should clear redo
      act(() => {
        result.current.saveSnapshot('first')
      })
      act(() => {
        result.current.undo()
      })
      expect(result.current.canRedo).toBe(true)

      act(() => {
        result.current.saveSnapshot('second')
      })
      expect(result.current.canRedo).toBe(false)
    })

    it('can save multiple snapshots', () => {
      const { result } = renderHook(() => useUndoRedo())
      act(() => {
        result.current.saveSnapshot('op1')
      })
      act(() => {
        result.current.saveSnapshot('op2')
      })
      act(() => {
        result.current.saveSnapshot('op3')
      })
      expect(result.current.canUndo).toBe(true)
    })
  })

  describe('undo', () => {
    it('undo does nothing when stack is empty', () => {
      const { result } = renderHook(() => useUndoRedo())
      // Should not throw
      act(() => {
        result.current.undo()
      })
      expect(result.current.canUndo).toBe(false)
    })

    it('restores previous settings after undo', () => {
      const { result } = renderHook(() => useUndoRedo())

      // Save snapshot of current state (targetYear = default)
      const originalYear = useSettingsStore.getState().settings.targetYear
      act(() => {
        result.current.saveSnapshot('before change')
      })

      // Change settings
      act(() => {
        useSettingsStore.getState().updateSettings({ targetYear: 2099 })
      })

      // Undo → should restore original year
      act(() => {
        result.current.undo()
      })
      expect(useSettingsStore.getState().settings.targetYear).toBe(originalYear)
    })

    it('enables canRedo after undo', () => {
      const { result } = renderHook(() => useUndoRedo())
      act(() => {
        result.current.saveSnapshot('op')
      })
      act(() => {
        result.current.undo()
      })
      expect(result.current.canRedo).toBe(true)
    })

    it('canUndo becomes false when undo stack is empty', () => {
      const { result } = renderHook(() => useUndoRedo())
      act(() => {
        result.current.saveSnapshot('only snapshot')
      })
      act(() => {
        result.current.undo()
      })
      expect(result.current.canUndo).toBe(false)
    })

    it('invalidates calculation after undo', () => {
      const { result } = renderHook(() => useUndoRedo())
      act(() => {
        result.current.saveSnapshot('op')
      })
      useUiStore.getState().setCalculated(true)
      act(() => {
        result.current.undo()
      })
      expect(useUiStore.getState().isCalculated).toBe(false)
    })

    it('restores inventory settings after undo', () => {
      // currentMonthData を設定（updateInventory は currentMonthData が必要）
      act(() => {
        useDataStore
          .getState()
          .setCurrentMonthData(createEmptyMonthlyData({ year: 2025, month: 1, importedAt: '' }))
      })

      const { result } = renderHook(() => useUndoRedo())

      // Save snapshot before inventory change
      act(() => {
        result.current.saveSnapshot('before inventory change')
      })

      // Add inventory setting
      act(() => {
        useDataStore.getState().updateInventory('s1', { openingInventory: 9999 })
      })

      // Undo → inventory should be cleared (set to null)
      act(() => {
        result.current.undo()
      })
      const inv = useDataStore.getState().currentMonthData?.settings.get('s1')
      expect(inv?.openingInventory).toBeNull()
    })
  })

  describe('redo', () => {
    it('redo does nothing when redo stack is empty', () => {
      const { result } = renderHook(() => useUndoRedo())
      // Should not throw
      act(() => {
        result.current.redo()
      })
      expect(result.current.canRedo).toBe(false)
    })

    it('re-applies settings after redo', () => {
      const { result } = renderHook(() => useUndoRedo())

      // Save snapshot of initial state
      act(() => {
        result.current.saveSnapshot('before')
      })

      // Change settings
      act(() => {
        useSettingsStore.getState().updateSettings({ targetYear: 2099 })
      })

      // Undo
      act(() => {
        result.current.undo()
      })
      expect(useSettingsStore.getState().settings.targetYear).not.toBe(2099)

      // Redo → settings should be 2099 again
      act(() => {
        result.current.redo()
      })
      expect(useSettingsStore.getState().settings.targetYear).toBe(2099)
    })

    it('enables canUndo after redo', () => {
      const { result } = renderHook(() => useUndoRedo())
      act(() => {
        result.current.saveSnapshot('op')
      })
      act(() => {
        result.current.undo()
      })
      act(() => {
        result.current.redo()
      })
      expect(result.current.canUndo).toBe(true)
    })

    it('canRedo becomes false when redo stack is empty', () => {
      const { result } = renderHook(() => useUndoRedo())
      act(() => {
        result.current.saveSnapshot('op')
      })
      act(() => {
        result.current.undo()
      })
      act(() => {
        result.current.redo()
      })
      expect(result.current.canRedo).toBe(false)
    })

    it('invalidates calculation after redo', () => {
      const { result } = renderHook(() => useUndoRedo())
      act(() => {
        result.current.saveSnapshot('op')
      })
      act(() => {
        result.current.undo()
      })
      useUiStore.getState().setCalculated(true)
      act(() => {
        result.current.redo()
      })
      expect(useUiStore.getState().isCalculated).toBe(false)
    })
  })

  describe('undo/redo roundtrip', () => {
    it('multiple undo/redo cycle works correctly', () => {
      const { result } = renderHook(() => useUndoRedo())

      const year0 = useSettingsStore.getState().settings.targetYear

      // snapshot at year0
      act(() => {
        result.current.saveSnapshot('step 1')
      })
      act(() => {
        useSettingsStore.getState().updateSettings({ targetYear: 2030 })
      })

      // snapshot at 2030
      act(() => {
        result.current.saveSnapshot('step 2')
      })
      act(() => {
        useSettingsStore.getState().updateSettings({ targetYear: 2040 })
      })

      // undo → back to 2030
      act(() => {
        result.current.undo()
      })
      expect(useSettingsStore.getState().settings.targetYear).toBe(2030)

      // undo → back to year0
      act(() => {
        result.current.undo()
      })
      expect(useSettingsStore.getState().settings.targetYear).toBe(year0)

      // redo → 2030
      act(() => {
        result.current.redo()
      })
      expect(useSettingsStore.getState().settings.targetYear).toBe(2030)
    })
  })
})
