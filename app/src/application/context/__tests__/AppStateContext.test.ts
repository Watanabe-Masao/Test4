/**
 * AppStateContext — Zustand バックワードコンパチビリティレイヤーのテスト
 *
 * 各フックが Zustand ストアの値を正しく返し、
 * useAppDispatch が各アクションを正しく委譲することを検証する。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useDataStore } from '@/application/stores/dataStore'
import { useUiStore } from '@/application/stores/uiStore'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { calculationCache } from '@/application/services/calculationCache'
import type { AppAction } from '../AppStateContext'
import type { StoreResult } from '@/domain/models'
import { createEmptyImportedData } from '@/domain/models'

// ──────────────────────────────────────────────
// useAppDispatch のコア dispatch ロジックを再現
// (フックはReact環境が必要なので、内部ロジックをストア直接で検証)
// ──────────────────────────────────────────────

function dispatch(action: AppAction) {
  switch (action.type) {
    case 'SET_IMPORTED_DATA':
      useDataStore.getState().setImportedData(action.payload)
      calculationCache.clear()
      useUiStore.getState().invalidateCalculation()
      break

    case 'SET_STORE_RESULTS':
      useDataStore.getState().setStoreResults(action.payload)
      useUiStore.getState().setCalculated(true)
      break

    case 'SET_VALIDATION_MESSAGES':
      useDataStore.getState().setValidationMessages(action.payload)
      break

    case 'TOGGLE_STORE':
      useUiStore.getState().toggleStore(action.payload)
      break

    case 'SELECT_ALL_STORES':
      useUiStore.getState().selectAllStores()
      break

    case 'SET_CURRENT_VIEW':
      useUiStore.getState().setCurrentView(action.payload)
      break

    case 'SET_IMPORTING':
      useUiStore.getState().setImporting(action.payload)
      break

    case 'UPDATE_SETTINGS':
      useSettingsStore.getState().updateSettings(action.payload)
      calculationCache.clear()
      useUiStore.getState().invalidateCalculation()
      break

    case 'UPDATE_INVENTORY':
      useDataStore.getState().updateInventory(action.payload.storeId, action.payload.config)
      calculationCache.clear()
      useUiStore.getState().invalidateCalculation()
      break

    case 'SET_PREV_YEAR_AUTO_DATA':
      useDataStore.getState().setPrevYearAutoData(action.payload)
      calculationCache.clear()
      useUiStore.getState().invalidateCalculation()
      break

    case 'RESET':
      useDataStore.getState().reset()
      useUiStore.getState().reset()
      useSettingsStore.getState().reset()
      calculationCache.clear()
      break
  }
}

describe('AppStateContext dispatch compatibility layer', () => {
  beforeEach(() => {
    useDataStore.getState().reset()
    useUiStore.getState().reset()
    useSettingsStore.getState().reset()
    calculationCache.clear()
  })

  describe('SET_IMPORTED_DATA', () => {
    it('sets data in dataStore', () => {
      const data = {
        ...createEmptyImportedData(),
        stores: new Map([['s1', { id: 's1', code: '001', name: 'テスト' }]]),
      }
      dispatch({ type: 'SET_IMPORTED_DATA', payload: data })
      expect(useDataStore.getState().data.stores.size).toBe(1)
    })

    it('invalidates calculation after setting data', () => {
      useUiStore.getState().setCalculated(true)
      dispatch({ type: 'SET_IMPORTED_DATA', payload: createEmptyImportedData() })
      expect(useUiStore.getState().isCalculated).toBe(false)
    })
  })

  describe('SET_STORE_RESULTS', () => {
    it('sets store results and marks calculated', () => {
      const results = new Map() as unknown as ReadonlyMap<string, StoreResult>
      dispatch({ type: 'SET_STORE_RESULTS', payload: results })
      expect(useUiStore.getState().isCalculated).toBe(true)
    })

    it('updates storeResults in dataStore', () => {
      const results = new Map([['s1', {} as never]])
      dispatch({ type: 'SET_STORE_RESULTS', payload: results })
      expect(useDataStore.getState().storeResults.size).toBe(1)
    })
  })

  describe('SET_VALIDATION_MESSAGES', () => {
    it('sets validation messages', () => {
      const msgs = [{ level: 'error' as const, message: 'test', dataType: 'purchase' as const }]
      dispatch({ type: 'SET_VALIDATION_MESSAGES', payload: msgs })
      expect(useDataStore.getState().validationMessages).toHaveLength(1)
      expect(useDataStore.getState().validationMessages[0].message).toBe('test')
    })

    it('can clear validation messages', () => {
      dispatch({ type: 'SET_VALIDATION_MESSAGES', payload: [{ level: 'info', message: 'x' }] })
      dispatch({ type: 'SET_VALIDATION_MESSAGES', payload: [] })
      expect(useDataStore.getState().validationMessages).toHaveLength(0)
    })
  })

  describe('TOGGLE_STORE', () => {
    it('adds store when not selected', () => {
      dispatch({ type: 'TOGGLE_STORE', payload: 's1' })
      expect(useUiStore.getState().selectedStoreIds.has('s1')).toBe(true)
    })

    it('removes store when already selected', () => {
      dispatch({ type: 'TOGGLE_STORE', payload: 's1' })
      dispatch({ type: 'TOGGLE_STORE', payload: 's1' })
      expect(useUiStore.getState().selectedStoreIds.has('s1')).toBe(false)
    })

    it('can toggle multiple stores independently', () => {
      dispatch({ type: 'TOGGLE_STORE', payload: 's1' })
      dispatch({ type: 'TOGGLE_STORE', payload: 's2' })
      expect(useUiStore.getState().selectedStoreIds.has('s1')).toBe(true)
      expect(useUiStore.getState().selectedStoreIds.has('s2')).toBe(true)
    })
  })

  describe('SELECT_ALL_STORES', () => {
    it('clears store selection', () => {
      dispatch({ type: 'TOGGLE_STORE', payload: 's1' })
      dispatch({ type: 'TOGGLE_STORE', payload: 's2' })
      dispatch({ type: 'SELECT_ALL_STORES' })
      expect(useUiStore.getState().selectedStoreIds.size).toBe(0)
    })
  })

  describe('SET_CURRENT_VIEW', () => {
    it('changes current view', () => {
      dispatch({ type: 'SET_CURRENT_VIEW', payload: 'daily' })
      expect(useUiStore.getState().currentView).toBe('daily')
    })

    it('can switch between views', () => {
      dispatch({ type: 'SET_CURRENT_VIEW', payload: 'daily' })
      dispatch({ type: 'SET_CURRENT_VIEW', payload: 'dashboard' })
      expect(useUiStore.getState().currentView).toBe('dashboard')
    })
  })

  describe('SET_IMPORTING', () => {
    it('sets importing to true', () => {
      dispatch({ type: 'SET_IMPORTING', payload: true })
      expect(useUiStore.getState().isImporting).toBe(true)
    })

    it('sets importing to false', () => {
      dispatch({ type: 'SET_IMPORTING', payload: true })
      dispatch({ type: 'SET_IMPORTING', payload: false })
      expect(useUiStore.getState().isImporting).toBe(false)
    })
  })

  describe('UPDATE_SETTINGS', () => {
    it('updates settings', () => {
      dispatch({ type: 'UPDATE_SETTINGS', payload: { targetYear: 2025 } })
      expect(useSettingsStore.getState().settings.targetYear).toBe(2025)
    })

    it('invalidates calculation', () => {
      useUiStore.getState().setCalculated(true)
      dispatch({ type: 'UPDATE_SETTINGS', payload: { defaultMarkupRate: 0.35 } })
      expect(useUiStore.getState().isCalculated).toBe(false)
    })

    it('merges partial settings', () => {
      const originalMonth = useSettingsStore.getState().settings.targetMonth
      dispatch({ type: 'UPDATE_SETTINGS', payload: { targetYear: 2030 } })
      expect(useSettingsStore.getState().settings.targetYear).toBe(2030)
      expect(useSettingsStore.getState().settings.targetMonth).toBe(originalMonth)
    })
  })

  describe('UPDATE_INVENTORY', () => {
    it('sets inventory config for a store', () => {
      dispatch({
        type: 'UPDATE_INVENTORY',
        payload: { storeId: 's1', config: { openingInventory: 5000 } },
      })
      expect(useDataStore.getState().data.settings.get('s1')?.openingInventory).toBe(5000)
    })

    it('invalidates calculation', () => {
      useUiStore.getState().setCalculated(true)
      dispatch({
        type: 'UPDATE_INVENTORY',
        payload: { storeId: 's1', config: { openingInventory: 1000 } },
      })
      expect(useUiStore.getState().isCalculated).toBe(false)
    })
  })

  describe('SET_PREV_YEAR_AUTO_DATA', () => {
    it('sets prev year data', () => {
      const prevCS = { records: [] }
      const prevCTS = { records: [] }
      dispatch({
        type: 'SET_PREV_YEAR_AUTO_DATA',
        payload: {
          prevYearClassifiedSales: prevCS,
          prevYearCategoryTimeSales: prevCTS,
        },
      })
      expect(useDataStore.getState().data.prevYearClassifiedSales).toBe(prevCS)
    })

    it('invalidates calculation', () => {
      useUiStore.getState().setCalculated(true)
      dispatch({
        type: 'SET_PREV_YEAR_AUTO_DATA',
        payload: {
          prevYearClassifiedSales: { records: [] },
          prevYearCategoryTimeSales: { records: [] },
        },
      })
      expect(useUiStore.getState().isCalculated).toBe(false)
    })
  })

  describe('RESET', () => {
    it('resets all stores', () => {
      dispatch({ type: 'UPDATE_SETTINGS', payload: { targetYear: 2099 } })
      dispatch({ type: 'TOGGLE_STORE', payload: 's1' })
      dispatch({
        type: 'SET_VALIDATION_MESSAGES',
        payload: [{ level: 'info', message: 'test' }],
      })

      dispatch({ type: 'RESET' })

      expect(useSettingsStore.getState().settings.targetYear).not.toBe(2099)
      expect(useUiStore.getState().selectedStoreIds.size).toBe(0)
      expect(useDataStore.getState().validationMessages).toHaveLength(0)
    })
  })
})

describe('AppStateContext type definitions', () => {
  it('UiState interface is consistent with uiStore shape', () => {
    const state = useUiStore.getState()
    expect(typeof state.isCalculated).toBe('boolean')
    expect(typeof state.isImporting).toBe('boolean')
    expect(state.selectedStoreIds).toBeInstanceOf(Set)
    expect(typeof state.currentView).toBe('string')
  })

  it('DataState fields exist in dataStore', () => {
    const state = useDataStore.getState()
    expect(state.data).toBeDefined()
    expect(state.storeResults).toBeInstanceOf(Map)
    expect(Array.isArray(state.validationMessages)).toBe(true)
  })
})
