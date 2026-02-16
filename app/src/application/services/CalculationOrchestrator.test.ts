import { describe, it, expect } from 'vitest'
import { calculateStoreResult, calculateAllStores } from './CalculationOrchestrator'
import { createEmptyImportedData } from '@/infrastructure/ImportService'
import type { ImportedData } from '@/infrastructure/ImportService'
import { DEFAULT_SETTINGS } from '@/domain/constants/defaults'

function buildTestData(overrides: Partial<ImportedData> = {}): ImportedData {
  return {
    ...createEmptyImportedData(),
    stores: new Map([['1', { id: '1', code: '0001', name: '店舗A' }]]),
    ...overrides,
  }
}

describe('calculateStoreResult', () => {
  it('仕入＋売上の基本計算', () => {
    const data = buildTestData({
      purchase: {
        '1': {
          1: {
            suppliers: {
              '0000001': { name: '取引先A', cost: 10000, price: 13000 },
            },
            total: { cost: 10000, price: 13000 },
          },
        },
      },
      sales: {
        '1': { 1: { sales: 15000 } },
      },
    })

    const result = calculateStoreResult('1', data, DEFAULT_SETTINGS, 28)

    expect(result.totalSales).toBe(15000)
    expect(result.totalCost).toBe(10000)
    expect(result.salesDays).toBe(1)
    expect(result.elapsedDays).toBe(1)
    expect(result.daily.size).toBe(1)
    expect(result.daily.get(1)?.sales).toBe(15000)
  })

  it('在庫法: 期首・期末在庫ありで粗利計算', () => {
    const data = buildTestData({
      purchase: {
        '1': {
          1: { suppliers: {}, total: { cost: 50000, price: 65000 } },
        },
      },
      sales: {
        '1': { 1: { sales: 80000 } },
      },
      settings: new Map([
        ['1', { storeId: '1', openingInventory: 100000, closingInventory: 120000, grossProfitBudget: null }],
      ]),
    })

    const result = calculateStoreResult('1', data, DEFAULT_SETTINGS, 28)

    // COGS = 100000 + 50000 - 120000 = 30000
    expect(result.invMethodCogs).toBe(30000)
    // 粗利 = 80000 - 30000 = 50000
    expect(result.invMethodGrossProfit).toBe(50000)
    // 粗利率 = 50000 / 80000 = 0.625
    expect(result.invMethodGrossProfitRate).toBeCloseTo(0.625)
  })

  it('在庫法: 在庫設定なしで null', () => {
    const data = buildTestData({
      purchase: {
        '1': { 1: { suppliers: {}, total: { cost: 10000, price: 13000 } } },
      },
      sales: {
        '1': { 1: { sales: 15000 } },
      },
    })

    const result = calculateStoreResult('1', data, DEFAULT_SETTINGS, 28)

    expect(result.invMethodCogs).toBeNull()
    expect(result.invMethodGrossProfit).toBeNull()
  })

  it('花データの掛け率適用', () => {
    const data = buildTestData({
      sales: { '1': { 1: { sales: 50000 } } },
      flowers: { '1': { 1: { price: 10000, cost: 8000 } } },
    })

    const result = calculateStoreResult('1', data, DEFAULT_SETTINGS, 28)

    expect(result.flowerSalesPrice).toBe(10000)
    expect(result.deliverySalesPrice).toBe(10000)
    expect(result.deliverySalesCost).toBe(8000)
    expect(result.totalCoreSales).toBe(40000) // 50000 - 10000
  })

  it('売変データの集計', () => {
    const data = buildTestData({
      sales: { '1': { 1: { sales: 50000 } } },
      discount: { '1': { 1: { sales: 50000, discount: 5000 } } },
    })

    const result = calculateStoreResult('1', data, DEFAULT_SETTINGS, 28)

    expect(result.totalDiscount).toBe(5000)
    expect(result.grossSales).toBe(55000) // 50000 + 5000
    // 売変率 = 5000 / (50000 + 5000) ≈ 0.0909
    expect(result.discountRate).toBeCloseTo(5000 / 55000, 4)
  })

  it('消耗品の集計', () => {
    const data = buildTestData({
      sales: { '1': { 1: { sales: 50000 } } },
      consumables: {
        '1': {
          1: { cost: 3000, items: [{ accountCode: '81257', itemCode: 'A', itemName: 'X', quantity: 1, cost: 3000 }] },
        },
      },
    })

    const result = calculateStoreResult('1', data, DEFAULT_SETTINGS, 28)

    expect(result.totalConsumable).toBe(3000)
    expect(result.consumableRate).toBeCloseTo(3000 / 50000, 6)
  })

  it('店間移動の集計', () => {
    const data = buildTestData({
      sales: { '1': { 1: { sales: 50000 } } },
      interStoreIn: {
        '1': {
          1: {
            interStoreIn: [{ day: 1, cost: 5000, price: 6500, fromStoreId: '2', toStoreId: '1', isDepartmentTransfer: false }],
            interStoreOut: [],
            interDepartmentIn: [],
            interDepartmentOut: [],
          },
        },
      },
    })

    const result = calculateStoreResult('1', data, DEFAULT_SETTINGS, 28)

    expect(result.transferDetails.interStoreIn.cost).toBe(5000)
    expect(result.transferDetails.interStoreIn.price).toBe(6500)
  })

  it('予算分析', () => {
    const data = buildTestData({
      sales: {
        '1': {
          1: { sales: 200000 },
          2: { sales: 250000 },
        },
      },
      budget: new Map([
        ['1', { storeId: '1', daily: new Map([[1, 200000], [2, 200000]]), total: 6000000 }],
      ]),
    })

    const result = calculateStoreResult('1', data, DEFAULT_SETTINGS, 28)

    expect(result.budget).toBe(6000000)
    expect(result.averageDailySales).toBeCloseTo(225000)
    expect(result.salesDays).toBe(2)
  })

  it('複数日の集計', () => {
    const data = buildTestData({
      purchase: {
        '1': {
          1: { suppliers: { '001': { name: 'A', cost: 10000, price: 13000 } }, total: { cost: 10000, price: 13000 } },
          2: { suppliers: { '001': { name: 'A', cost: 20000, price: 26000 } }, total: { cost: 20000, price: 26000 } },
        },
      },
      sales: {
        '1': { 1: { sales: 15000 }, 2: { sales: 30000 } },
      },
    })

    const result = calculateStoreResult('1', data, DEFAULT_SETTINGS, 28)

    expect(result.totalSales).toBe(45000)
    expect(result.totalCost).toBe(30000)
    expect(result.daily.size).toBe(2)
    expect(result.supplierTotals.get('001')?.cost).toBe(30000)
    expect(result.supplierTotals.get('001')?.price).toBe(39000)
  })
})

describe('calculateAllStores', () => {
  it('全店舗の結果を生成', () => {
    const data: ImportedData = {
      ...createEmptyImportedData(),
      stores: new Map([
        ['1', { id: '1', code: '0001', name: '店舗A' }],
        ['2', { id: '2', code: '0002', name: '店舗B' }],
      ]),
      sales: {
        '1': { 1: { sales: 10000 } },
        '2': { 1: { sales: 20000 } },
      },
    }

    const results = calculateAllStores(data, DEFAULT_SETTINGS, 28)

    expect(results.size).toBe(2)
    expect(results.get('1')?.totalSales).toBe(10000)
    expect(results.get('2')?.totalSales).toBe(20000)
  })

  it('空データでは空マップ', () => {
    const results = calculateAllStores(createEmptyImportedData(), DEFAULT_SETTINGS, 28)
    expect(results.size).toBe(0)
  })
})
