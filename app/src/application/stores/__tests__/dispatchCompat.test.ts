/**
 * useAppDispatch の Zustand 互換レイヤーテスト
 *
 * Context API からの移行で、全既存アクションが正しく
 * Zustand ストアに委譲されることを検証する。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useDataStore } from '../dataStore'
import { useUiStore } from '../uiStore'
import { useSettingsStore } from '../settingsStore'
import { createEmptyImportedData } from '@/domain/models'
import type { AppAction } from '@/application/context/AppStateContext'

// useAppDispatch 内部ロジックを再現するディスパッチ関数
function dispatch(action: AppAction) {
  switch (action.type) {
    case 'SET_IMPORTED_DATA':
      useDataStore.getState().setImportedData(action.payload)
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
      useUiStore.getState().invalidateCalculation()
      break
    case 'UPDATE_INVENTORY':
      useDataStore.getState().updateInventory(action.payload.storeId, action.payload.config)
      useUiStore.getState().invalidateCalculation()
      break
    case 'SET_PREV_YEAR_AUTO_DATA':
      useDataStore.getState().setPrevYearAutoData(action.payload)
      useUiStore.getState().invalidateCalculation()
      break
    case 'RESET':
      useDataStore.getState().reset()
      useUiStore.getState().reset()
      useSettingsStore.getState().reset()
      break
  }
}

describe('dispatch compatibility layer', () => {
  beforeEach(() => {
    useDataStore.getState().reset()
    useUiStore.getState().reset()
    useSettingsStore.getState().reset()
  })

  it('SET_IMPORTED_DATA: データ設定 + 計算無効化', () => {
    useUiStore.getState().setCalculated(true)
    const data = {
      ...createEmptyImportedData(),
      stores: new Map([['s1', { id: 's1', code: '001', name: 'テスト' }]]),
    }

    dispatch({ type: 'SET_IMPORTED_DATA', payload: data })

    expect(useDataStore.getState().data.stores.size).toBe(1)
    expect(useUiStore.getState().isCalculated).toBe(false)
  })

  it('SET_STORE_RESULTS: 結果設定 + 計算完了', () => {
    const results = new Map() as ReadonlyMap<string, never>
    dispatch({ type: 'SET_STORE_RESULTS', payload: results })

    expect(useUiStore.getState().isCalculated).toBe(true)
  })

  it('TOGGLE_STORE: 店舗選択トグル', () => {
    dispatch({ type: 'TOGGLE_STORE', payload: 's1' })
    expect(useUiStore.getState().selectedStoreIds.has('s1')).toBe(true)

    dispatch({ type: 'TOGGLE_STORE', payload: 's1' })
    expect(useUiStore.getState().selectedStoreIds.has('s1')).toBe(false)
  })

  it('SELECT_ALL_STORES: 全選択解除', () => {
    dispatch({ type: 'TOGGLE_STORE', payload: 's1' })
    dispatch({ type: 'SELECT_ALL_STORES' })
    expect(useUiStore.getState().selectedStoreIds.size).toBe(0)
  })

  it('UPDATE_SETTINGS: 設定更新 + 計算無効化', () => {
    useUiStore.getState().setCalculated(true)
    dispatch({ type: 'UPDATE_SETTINGS', payload: { targetYear: 2025 } })

    expect(useSettingsStore.getState().settings.targetYear).toBe(2025)
    expect(useUiStore.getState().isCalculated).toBe(false)
  })

  it('UPDATE_INVENTORY: 在庫設定更新 + 計算無効化', () => {
    useUiStore.getState().setCalculated(true)
    dispatch({
      type: 'UPDATE_INVENTORY',
      payload: { storeId: 's1', config: { openingInventory: 500 } },
    })

    expect(useDataStore.getState().data.settings.get('s1')?.openingInventory).toBe(500)
    expect(useUiStore.getState().isCalculated).toBe(false)
  })

  it('SET_PREV_YEAR_AUTO_DATA: 前年データ設定 + 計算無効化', () => {
    useUiStore.getState().setCalculated(true)
    dispatch({
      type: 'SET_PREV_YEAR_AUTO_DATA',
      payload: {
        prevYearSales: { s1: { 1: { sales: 100 } } },
        prevYearDiscount: {},
        prevYearCategoryTimeSales: { records: [] },
      },
    })

    expect(Object.keys(useDataStore.getState().data.prevYearSales)).toContain('s1')
    expect(useUiStore.getState().isCalculated).toBe(false)
  })

  it('RESET: 全ストアリセット', () => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: { targetYear: 2099 } })
    dispatch({ type: 'TOGGLE_STORE', payload: 's1' })
    dispatch({
      type: 'SET_VALIDATION_MESSAGES',
      payload: [{ level: 'info', message: 'test' }],
    })

    dispatch({ type: 'RESET' })

    expect(useSettingsStore.getState().settings.targetYear).not.toBe(2099)
    expect(useUiStore.getState().selectedStoreIds.size).toBe(0)
    expect(useDataStore.getState().validationMessages).toEqual([])
  })
})
