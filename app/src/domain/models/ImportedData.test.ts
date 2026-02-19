import { describe, it, expect } from 'vitest'
import { createEmptyImportedData } from './ImportedData'

describe('createEmptyImportedData', () => {
  it('全フィールドが空で初期化される', () => {
    const data = createEmptyImportedData()

    expect(data.stores.size).toBe(0)
    expect(data.suppliers.size).toBe(0)
    expect(Object.keys(data.purchase)).toHaveLength(0)
    expect(Object.keys(data.sales)).toHaveLength(0)
    expect(Object.keys(data.discount)).toHaveLength(0)
    expect(Object.keys(data.prevYearSales)).toHaveLength(0)
    expect(Object.keys(data.prevYearDiscount)).toHaveLength(0)
    expect(Object.keys(data.interStoreIn)).toHaveLength(0)
    expect(Object.keys(data.interStoreOut)).toHaveLength(0)
    expect(Object.keys(data.flowers)).toHaveLength(0)
    expect(Object.keys(data.directProduce)).toHaveLength(0)
    expect(Object.keys(data.consumables)).toHaveLength(0)
    expect(data.settings.size).toBe(0)
    expect(data.budget.size).toBe(0)
  })

  it('毎回新しいインスタンスが返される', () => {
    const data1 = createEmptyImportedData()
    const data2 = createEmptyImportedData()

    expect(data1).not.toBe(data2)
    expect(data1.stores).not.toBe(data2.stores)
  })

  it('stores は Map インスタンス', () => {
    const data = createEmptyImportedData()
    expect(data.stores instanceof Map).toBe(true)
  })

  it('settings は Map インスタンス', () => {
    const data = createEmptyImportedData()
    expect(data.settings instanceof Map).toBe(true)
  })

  it('budget は Map インスタンス', () => {
    const data = createEmptyImportedData()
    expect(data.budget instanceof Map).toBe(true)
  })
})
