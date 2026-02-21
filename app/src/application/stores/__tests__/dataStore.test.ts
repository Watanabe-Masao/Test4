import { describe, it, expect, beforeEach } from 'vitest'
import { useDataStore } from '../dataStore'
import { createEmptyImportedData } from '@/domain/models'

describe('dataStore', () => {
  beforeEach(() => {
    // ストアをリセット
    useDataStore.getState().reset()
  })

  it('初期状態は空のデータ', () => {
    const state = useDataStore.getState()
    expect(state.data.stores.size).toBe(0)
    expect(state.storeResults.size).toBe(0)
    expect(state.validationMessages).toEqual([])
  })

  it('setImportedData でデータを設定できる', () => {
    const data = {
      ...createEmptyImportedData(),
      stores: new Map([['s1', { id: 's1', code: '001', name: 'テスト店' }]]),
    }
    useDataStore.getState().setImportedData(data)

    expect(useDataStore.getState().data.stores.size).toBe(1)
    expect(useDataStore.getState().data.stores.get('s1')?.name).toBe('テスト店')
  })

  it('setStoreResults で計算結果を設定できる', () => {
    const results = new Map([['s1', { storeId: 's1' }]]) as ReadonlyMap<string, unknown>
    useDataStore.getState().setStoreResults(results as never)

    expect(useDataStore.getState().storeResults.size).toBe(1)
  })

  it('setValidationMessages でバリデーションメッセージを設定できる', () => {
    const messages = [
      { level: 'error' as const, message: 'テストエラー' },
      { level: 'warning' as const, message: 'テスト警告' },
    ]
    useDataStore.getState().setValidationMessages(messages)

    expect(useDataStore.getState().validationMessages).toHaveLength(2)
    expect(useDataStore.getState().validationMessages[0].message).toBe('テストエラー')
  })

  it('setPrevYearAutoData で前年データを設定できる', () => {
    const prevYearSales = { s1: { 1: { sales: 100 } } }
    const prevYearDiscount = { s1: { 1: { sales: 100, discount: 10 } } }
    const prevYearCategoryTimeSales = { records: [] }

    useDataStore.getState().setPrevYearAutoData({
      prevYearSales,
      prevYearDiscount,
      prevYearCategoryTimeSales,
    })

    const state = useDataStore.getState()
    expect(Object.keys(state.data.prevYearSales)).toContain('s1')
  })

  it('updateInventory で在庫設定を更新できる', () => {
    useDataStore.getState().updateInventory('s1', {
      openingInventory: 1000,
      closingInventory: 2000,
    })

    const config = useDataStore.getState().data.settings.get('s1')
    expect(config?.openingInventory).toBe(1000)
    expect(config?.closingInventory).toBe(2000)
  })

  it('updateInventory で既存設定を部分更新できる', () => {
    useDataStore.getState().updateInventory('s1', {
      openingInventory: 1000,
    })
    useDataStore.getState().updateInventory('s1', {
      closingInventory: 2000,
    })

    const config = useDataStore.getState().data.settings.get('s1')
    expect(config?.openingInventory).toBe(1000)
    expect(config?.closingInventory).toBe(2000)
  })

  it('reset でストアが初期状態に戻る', () => {
    useDataStore.getState().setValidationMessages([
      { level: 'info', message: 'test' },
    ])
    expect(useDataStore.getState().validationMessages).toHaveLength(1)

    useDataStore.getState().reset()
    expect(useDataStore.getState().validationMessages).toEqual([])
    expect(useDataStore.getState().data.stores.size).toBe(0)
  })
})
