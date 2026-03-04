import { describe, it, expect } from 'vitest'
import { appReducer, initialState } from '../legacyReducer'
import type { AppState, AppAction } from '../legacyReducer'
import { createEmptyImportedData } from '@/domain/models'
import type {
  StoreResult,
  ViewType,
  ClassifiedSalesData,
  CategoryTimeSalesData,
} from '@/domain/models'

describe('appReducer', () => {
  describe('initialState', () => {
    it('has empty data', () => {
      expect(initialState.data).toBeDefined()
      expect(initialState.storeResults.size).toBe(0)
      expect(initialState.validationMessages).toHaveLength(0)
    })

    it('has default UI state', () => {
      expect(initialState.ui.selectedStoreIds.size).toBe(0)
      expect(initialState.ui.currentView).toBe('dashboard')
      expect(initialState.ui.isCalculated).toBe(false)
      expect(initialState.ui.isImporting).toBe(false)
    })

    it('has default settings', () => {
      expect(initialState.settings).toBeDefined()
      expect(initialState.settings.targetYear).toBeGreaterThan(2000)
    })
  })

  describe('SET_IMPORTED_DATA', () => {
    it('replaces data and resets isCalculated', () => {
      const data = createEmptyImportedData()
      const state: AppState = { ...initialState, ui: { ...initialState.ui, isCalculated: true } }
      const result = appReducer(state, { type: 'SET_IMPORTED_DATA', payload: data })
      expect(result.data).toBe(data)
      expect(result.ui.isCalculated).toBe(false)
    })
  })

  describe('SET_STORE_RESULTS', () => {
    it('sets store results and marks isCalculated', () => {
      const results = new Map<string, StoreResult>()
      const result = appReducer(initialState, { type: 'SET_STORE_RESULTS', payload: results })
      expect(result.storeResults).toBe(results)
      expect(result.ui.isCalculated).toBe(true)
    })
  })

  describe('SET_VALIDATION_MESSAGES', () => {
    it('sets validation messages', () => {
      const msgs = [{ level: 'error' as const, message: 'test', dataType: 'purchase' as const }]
      const result = appReducer(initialState, { type: 'SET_VALIDATION_MESSAGES', payload: msgs })
      expect(result.validationMessages).toBe(msgs)
    })
  })

  describe('TOGGLE_STORE', () => {
    it('adds store if not selected', () => {
      const result = appReducer(initialState, { type: 'TOGGLE_STORE', payload: 'S001' })
      expect(result.ui.selectedStoreIds.has('S001')).toBe(true)
    })

    it('removes store if already selected', () => {
      const state: AppState = {
        ...initialState,
        ui: { ...initialState.ui, selectedStoreIds: new Set(['S001', 'S002']) },
      }
      const result = appReducer(state, { type: 'TOGGLE_STORE', payload: 'S001' })
      expect(result.ui.selectedStoreIds.has('S001')).toBe(false)
      expect(result.ui.selectedStoreIds.has('S002')).toBe(true)
    })
  })

  describe('SELECT_ALL_STORES', () => {
    it('clears store selection', () => {
      const state: AppState = {
        ...initialState,
        ui: { ...initialState.ui, selectedStoreIds: new Set(['S001']) },
      }
      const result = appReducer(state, { type: 'SELECT_ALL_STORES' })
      expect(result.ui.selectedStoreIds.size).toBe(0)
    })
  })

  describe('SET_CURRENT_VIEW', () => {
    it('changes the current view', () => {
      const result = appReducer(initialState, {
        type: 'SET_CURRENT_VIEW',
        payload: 'daily' as ViewType,
      })
      expect(result.ui.currentView).toBe('daily')
    })
  })

  describe('SET_IMPORTING', () => {
    it('sets importing flag', () => {
      const result = appReducer(initialState, { type: 'SET_IMPORTING', payload: true })
      expect(result.ui.isImporting).toBe(true)
    })
  })

  describe('UPDATE_SETTINGS', () => {
    it('merges settings and resets isCalculated', () => {
      const state: AppState = { ...initialState, ui: { ...initialState.ui, isCalculated: true } }
      const result = appReducer(state, {
        type: 'UPDATE_SETTINGS',
        payload: { defaultMarkupRate: 0.35 },
      })
      expect(result.settings.defaultMarkupRate).toBe(0.35)
      expect(result.ui.isCalculated).toBe(false)
    })
  })

  describe('UPDATE_INVENTORY', () => {
    it('creates new inventory config if not existing', () => {
      const result = appReducer(initialState, {
        type: 'UPDATE_INVENTORY',
        payload: { storeId: 'S001', config: { openingInventory: 5000 } },
      })
      const inv = result.data.settings.get('S001')
      expect(inv).toBeDefined()
      expect(inv!.openingInventory).toBe(5000)
      expect(inv!.closingInventory).toBeNull()
      expect(result.ui.isCalculated).toBe(false)
    })

    it('updates existing inventory config', () => {
      const data = createEmptyImportedData()
      const settings = new Map(data.settings)
      settings.set('S001', {
        storeId: 'S001',
        openingInventory: 1000,
        closingInventory: 2000,
        grossProfitBudget: null,
        productInventory: null,
        costInclusionInventory: null,
        inventoryDate: null,
        closingInventoryDay: null,
      })
      const state: AppState = {
        ...initialState,
        data: { ...data, settings },
        ui: { ...initialState.ui, isCalculated: true },
      }
      const result = appReducer(state, {
        type: 'UPDATE_INVENTORY',
        payload: { storeId: 'S001', config: { closingInventory: 3000 } },
      })
      const inv = result.data.settings.get('S001')
      expect(inv!.openingInventory).toBe(1000) // preserved
      expect(inv!.closingInventory).toBe(3000) // updated
    })
  })

  describe('SET_PREV_YEAR_AUTO_DATA', () => {
    it('sets prevYear data and resets isCalculated', () => {
      const prevCS: ClassifiedSalesData = { records: [] }
      const prevCTS: CategoryTimeSalesData = { records: [] }
      const state: AppState = { ...initialState, ui: { ...initialState.ui, isCalculated: true } }
      const result = appReducer(state, {
        type: 'SET_PREV_YEAR_AUTO_DATA',
        payload: {
          prevYearClassifiedSales: prevCS,
          prevYearCategoryTimeSales: prevCTS,
        },
      })
      expect(result.data.prevYearClassifiedSales).toBe(prevCS)
      expect(result.data.prevYearCategoryTimeSales).toBe(prevCTS)
      expect(result.ui.isCalculated).toBe(false)
    })
  })

  describe('RESET', () => {
    it('returns initialState', () => {
      const state: AppState = {
        ...initialState,
        ui: { ...initialState.ui, isCalculated: true, isImporting: true },
      }
      const result = appReducer(state, { type: 'RESET' })
      expect(result).toBe(initialState)
    })
  })

  describe('unknown action', () => {
    it('returns state unchanged', () => {
      const result = appReducer(initialState, { type: 'UNKNOWN' } as unknown as AppAction)
      expect(result).toBe(initialState)
    })
  })
})
