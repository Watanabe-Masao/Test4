/**
 * useStoreSelection フックのテスト
 *
 * 店舗選択・集計・店舗名ラベル生成ロジックを検証する。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useStoreSelection } from '../useStoreSelection'
import { useDataStore } from '@/application/stores/dataStore'
import { useUiStore } from '@/application/stores/uiStore'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { createEmptyMonthlyData } from '@/domain/models/MonthlyData'

// ── Setup ──────────────────────────────────────────────

beforeEach(() => {
  useDataStore.getState().reset()
  useUiStore.getState().resetTransientState()
  useSettingsStore.getState().reset()
})

// ── Tests ───────────────────────────────────────────────

describe('useStoreSelection', () => {
  describe('initial state', () => {
    it('isAllStores is true when no stores selected', () => {
      const { result } = renderHook(() => useStoreSelection())
      expect(result.current.isAllStores).toBe(true)
    })

    it('selectedStoreIds is empty set initially', () => {
      const { result } = renderHook(() => useStoreSelection())
      expect(result.current.selectedStoreIds.size).toBe(0)
    })

    it('currentResult is null when storeResults is empty', () => {
      const { result } = renderHook(() => useStoreSelection())
      expect(result.current.currentResult).toBeNull()
    })

    it('storeName is 全店合計 when no stores selected', () => {
      const { result } = renderHook(() => useStoreSelection())
      expect(result.current.storeName).toBe('全店合計')
    })
  })

  describe('toggleStore', () => {
    it('adds a store to selection', () => {
      const { result } = renderHook(() => useStoreSelection())
      act(() => {
        result.current.toggleStore('s1')
      })
      expect(result.current.selectedStoreIds.has('s1')).toBe(true)
    })

    it('removes a store from selection when toggled again', () => {
      const { result } = renderHook(() => useStoreSelection())
      act(() => {
        result.current.toggleStore('s1')
      })
      act(() => {
        result.current.toggleStore('s1')
      })
      expect(result.current.selectedStoreIds.has('s1')).toBe(false)
    })

    it('isAllStores becomes false after toggle', () => {
      const { result } = renderHook(() => useStoreSelection())
      act(() => {
        result.current.toggleStore('s1')
      })
      expect(result.current.isAllStores).toBe(false)
    })
  })

  describe('selectAllStores', () => {
    it('clears store selection', () => {
      const { result } = renderHook(() => useStoreSelection())
      act(() => {
        result.current.toggleStore('s1')
      })
      act(() => {
        result.current.toggleStore('s2')
      })
      act(() => {
        result.current.selectAllStores()
      })
      expect(result.current.isAllStores).toBe(true)
      expect(result.current.selectedStoreIds.size).toBe(0)
    })
  })

  describe('storeName', () => {
    it('shows 全店合計 when no store selected', () => {
      const { result } = renderHook(() => useStoreSelection())
      expect(result.current.storeName).toBe('全店合計')
    })

    it('shows store name when exactly one store selected and name exists', () => {
      // Set up store data with a named store
      const data = {
        ...createEmptyMonthlyData({ year: 2025, month: 1, importedAt: '' }),
        stores: new Map([['s1', { id: 's1', code: '001', name: 'テスト店' }]]),
      }
      act(() => {
        useDataStore.getState().setCurrentMonthData(data)
      })

      const { result } = renderHook(() => useStoreSelection())
      act(() => {
        result.current.toggleStore('s1')
      })
      expect(result.current.storeName).toBe('テスト店')
    })

    it('falls back to store id when store name not found', () => {
      const { result } = renderHook(() => useStoreSelection())
      act(() => {
        result.current.toggleStore('unknown-id')
      })
      expect(result.current.storeName).toBe('unknown-id')
    })

    it('shows N店舗合計 when multiple stores selected', () => {
      const { result } = renderHook(() => useStoreSelection())
      act(() => {
        result.current.toggleStore('s1')
      })
      act(() => {
        result.current.toggleStore('s2')
      })
      expect(result.current.storeName).toBe('2店舗合計')
    })

    it('shows N店舗合計 for three stores', () => {
      const { result } = renderHook(() => useStoreSelection())
      act(() => {
        result.current.toggleStore('s1')
      })
      act(() => {
        result.current.toggleStore('s2')
      })
      act(() => {
        result.current.toggleStore('s3')
      })
      expect(result.current.storeName).toBe('3店舗合計')
    })
  })

  describe('selectedResults', () => {
    it('returns empty array when storeResults is empty', () => {
      const { result } = renderHook(() => useStoreSelection())
      expect(result.current.selectedResults).toHaveLength(0)
    })
  })

  describe('stores', () => {
    it('exposes stores from dataStore', () => {
      const data = {
        ...createEmptyMonthlyData({ year: 2025, month: 1, importedAt: '' }),
        stores: new Map([
          ['s1', { id: 's1', code: '001', name: 'Store A' }],
          ['s2', { id: 's2', code: '002', name: 'Store B' }],
        ]),
      }
      act(() => {
        useDataStore.getState().setCurrentMonthData(data)
      })
      const { result } = renderHook(() => useStoreSelection())
      expect(result.current.stores.size).toBe(2)
    })
  })
})
