import { describe, it, expect } from 'vitest'
import { createEmptyImportedData, getComparisonFields } from './ImportedData'

describe('createEmptyImportedData', () => {
  it('全フィールドが空で初期化される', () => {
    const data = createEmptyImportedData()

    expect(data.stores.size).toBe(0)
    expect(data.suppliers.size).toBe(0)
    expect(data.purchase.records).toHaveLength(0)
    expect(data.classifiedSales.records).toHaveLength(0)
    expect(data.prevYearClassifiedSales.records).toHaveLength(0)
    expect(data.interStoreIn.records).toHaveLength(0)
    expect(data.interStoreOut.records).toHaveLength(0)
    expect(data.flowers.records).toHaveLength(0)
    expect(data.directProduce.records).toHaveLength(0)
    expect(data.consumables.records).toHaveLength(0)
    expect(data.settings.size).toBe(0)
    expect(data.budget.size).toBe(0)
  })
})

describe('getComparisonFields', () => {
  it('prevYear フィールドを comparison 名でアクセスできる', () => {
    const data = createEmptyImportedData()
    const fields = getComparisonFields(data)
    expect(fields.comparisonClassifiedSales).toBe(data.prevYearClassifiedSales)
    expect(fields.comparisonCategoryTimeSales).toBe(data.prevYearCategoryTimeSales)
    expect(fields.comparisonFlowers).toBe(data.prevYearFlowers)
  })
})
