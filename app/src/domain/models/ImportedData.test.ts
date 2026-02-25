import { describe, it, expect } from 'vitest'
import { createEmptyImportedData } from './ImportedData'

describe('createEmptyImportedData', () => {
  it('全フィールドが空で初期化される', () => {
    const data = createEmptyImportedData()

    expect(data.stores.size).toBe(0)
    expect(data.suppliers.size).toBe(0)
    expect(Object.keys(data.purchase)).toHaveLength(0)
    expect(data.classifiedSales.records).toHaveLength(0)
    expect(data.prevYearClassifiedSales.records).toHaveLength(0)
    expect(Object.keys(data.interStoreIn)).toHaveLength(0)
    expect(Object.keys(data.interStoreOut)).toHaveLength(0)
    expect(Object.keys(data.flowers)).toHaveLength(0)
    expect(Object.keys(data.directProduce)).toHaveLength(0)
    expect(Object.keys(data.consumables)).toHaveLength(0)
    expect(data.settings.size).toBe(0)
    expect(data.budget.size).toBe(0)
  })
})
