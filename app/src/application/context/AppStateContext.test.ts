import { describe, it, expect } from 'vitest'
import { appReducer, initialState } from './AppStateContext'
import { createEmptyImportedData } from '@/infrastructure/ImportService'

describe('appReducer', () => {
  it('SET_IMPORTED_DATA: データ更新 + isCalculated false', () => {
    const state = { ...initialState, ui: { ...initialState.ui, isCalculated: true } }
    const data = {
      ...createEmptyImportedData(),
      stores: new Map([['1', { id: '1', code: '0001', name: 'A' }]]),
    }
    const next = appReducer(state, { type: 'SET_IMPORTED_DATA', payload: data })

    expect(next.data.stores.size).toBe(1)
    expect(next.ui.isCalculated).toBe(false)
  })

  it('SET_STORE_RESULTS: 計算結果セット + isCalculated true', () => {
    const results = new Map()
    const next = appReducer(initialState, { type: 'SET_STORE_RESULTS', payload: results })

    expect(next.storeResults).toBe(results)
    expect(next.ui.isCalculated).toBe(true)
  })

  it('SET_VALIDATION_MESSAGES', () => {
    const messages = [{ level: 'error' as const, message: 'テスト' }]
    const next = appReducer(initialState, { type: 'SET_VALIDATION_MESSAGES', payload: messages })

    expect(next.validationMessages).toHaveLength(1)
  })

  it('SET_CURRENT_STORE', () => {
    const next = appReducer(initialState, { type: 'SET_CURRENT_STORE', payload: '1' })
    expect(next.ui.currentStoreId).toBe('1')
  })

  it('SET_CURRENT_VIEW', () => {
    const next = appReducer(initialState, { type: 'SET_CURRENT_VIEW', payload: 'forecast' })
    expect(next.ui.currentView).toBe('forecast')
  })

  it('SET_IMPORTING', () => {
    const next = appReducer(initialState, { type: 'SET_IMPORTING', payload: true })
    expect(next.ui.isImporting).toBe(true)
  })

  it('UPDATE_SETTINGS: 部分更新 + isCalculated false', () => {
    const state = { ...initialState, ui: { ...initialState.ui, isCalculated: true } }
    const next = appReducer(state, {
      type: 'UPDATE_SETTINGS',
      payload: { flowerCostRate: 0.75 },
    })

    expect(next.settings.flowerCostRate).toBe(0.75)
    expect(next.settings.targetGrossProfitRate).toBe(0.25) // 他は変更なし
    expect(next.ui.isCalculated).toBe(false)
  })

  it('RESET: 初期状態に戻る', () => {
    const modified = appReducer(initialState, {
      type: 'SET_CURRENT_STORE',
      payload: '3',
    })
    const reset = appReducer(modified, { type: 'RESET' })

    expect(reset).toEqual(initialState)
  })

  it('未知のアクションは状態を返す', () => {
    // @ts-expect-error testing unknown action
    const next = appReducer(initialState, { type: 'UNKNOWN' })
    expect(next).toBe(initialState)
  })
})
