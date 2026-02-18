import { describe, it, expect } from 'vitest'
import { calculateStoreResult, calculateAllStores, aggregateStoreResults } from './CalculationOrchestrator'
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

  it('総仕入原価に売上納品原価が反映される', () => {
    const data = buildTestData({
      purchase: {
        '1': {
          1: { suppliers: { '0000001': { name: '取引先A', cost: 30000, price: 40000 } }, total: { cost: 30000, price: 40000 } },
        },
      },
      sales: { '1': { 1: { sales: 60000 } } },
      flowers: { '1': { 1: { price: 10000, cost: 8000 } } },
      directProduce: { '1': { 1: { price: 5000, cost: 4250 } } },
    })

    const result = calculateStoreResult('1', data, DEFAULT_SETTINGS, 28)

    // 売上納品原価 = 花(8000) + 産直(4250) = 12250
    expect(result.deliverySalesCost).toBe(12250)
    // 在庫仕入原価 = 仕入原価(30000)（移動なし）
    expect(result.inventoryCost).toBe(30000)
    // 総仕入原価 = 在庫仕入原価(30000) + 売上納品原価(12250) = 42250
    expect(result.totalCost).toBe(42250)
  })

  it('在庫法: 売上納品原価が総仕入原価に含まれてCOGS計算される', () => {
    const data = buildTestData({
      purchase: {
        '1': {
          1: { suppliers: { '0000001': { name: '取引先A', cost: 30000, price: 40000 } }, total: { cost: 30000, price: 40000 } },
        },
      },
      sales: { '1': { 1: { sales: 60000 } } },
      flowers: { '1': { 1: { price: 10000, cost: 8000 } } },
      settings: new Map([
        ['1', { storeId: '1', openingInventory: 100000, closingInventory: 110000, grossProfitBudget: null }],
      ]),
    })

    const result = calculateStoreResult('1', data, DEFAULT_SETTINGS, 28)

    // 総仕入原価 = 仕入原価(30000) + 花原価(8000) = 38000
    expect(result.totalCost).toBe(38000)
    // COGS = 期首(100000) + 総仕入原価(38000) - 期末(110000) = 28000
    expect(result.invMethodCogs).toBe(28000)
    // 粗利 = 売上(60000) - COGS(28000) = 32000
    expect(result.invMethodGrossProfit).toBe(32000)
  })

  it('平均値入率は花・産直を含み、コア値入率は仕入のみ', () => {
    const data = buildTestData({
      purchase: {
        '1': {
          1: { suppliers: { '001': { name: 'A', cost: 30000, price: 40000 } }, total: { cost: 30000, price: 40000 } },
        },
      },
      sales: { '1': { 1: { sales: 60000 } } },
      flowers: { '1': { 1: { price: 10000, cost: 8000 } } },
      directProduce: { '1': { 1: { price: 5000, cost: 4250 } } },
    })

    const result = calculateStoreResult('1', data, DEFAULT_SETTINGS, 28)

    // コア値入率 = (40000 - 30000) / 40000 = 0.25
    expect(result.coreMarkupRate).toBeCloseTo(0.25, 4)
    // 平均値入率 = (40000+10000+5000 - 30000-8000-4250) / (40000+10000+5000)
    //            = 12750 / 55000 ≈ 0.2318
    expect(result.averageMarkupRate).toBeCloseTo(12750 / 55000, 4)
    // 花・産直の掛け率(0.80, 0.85)は仕入より低いので平均値入率 < コア値入率
    expect(result.averageMarkupRate).toBeLessThan(result.coreMarkupRate)
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
      purchase: {
        '1': {
          1: { suppliers: { '001': { name: 'A', cost: 10000, price: 13000 } }, total: { cost: 10000, price: 13000 } },
        },
      },
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
      interStoreOut: {
        '1': {
          1: {
            interStoreIn: [],
            interStoreOut: [{ day: 1, cost: -3000, price: -3900, fromStoreId: '1', toStoreId: '3', isDepartmentTransfer: false }],
            interDepartmentIn: [],
            interDepartmentOut: [],
          },
        },
      },
    })

    const result = calculateStoreResult('1', data, DEFAULT_SETTINGS, 28)

    expect(result.transferDetails.interStoreIn.cost).toBe(5000)
    expect(result.transferDetails.interStoreIn.price).toBe(6500)
    expect(result.transferDetails.interStoreOut.cost).toBe(-3000)
    expect(result.transferDetails.interStoreOut.price).toBe(-3900)
    // 総仕入原価 = 仕入原価(10000) + 店間入(5000) + 店間出(-3000) = 12000
    expect(result.totalCost).toBe(12000)
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

describe('aggregateStoreResults', () => {
  it('複数店舗の合算', () => {
    const data: ImportedData = {
      ...createEmptyImportedData(),
      stores: new Map([
        ['1', { id: '1', code: '0001', name: '店舗A' }],
        ['2', { id: '2', code: '0002', name: '店舗B' }],
      ]),
      purchase: {
        '1': { 1: { suppliers: { '001': { name: 'A', cost: 10000, price: 13000 } }, total: { cost: 10000, price: 13000 } } },
        '2': { 1: { suppliers: { '001': { name: 'A', cost: 20000, price: 26000 } }, total: { cost: 20000, price: 26000 } } },
      },
      sales: {
        '1': { 1: { sales: 15000 } },
        '2': { 1: { sales: 30000 } },
      },
    }

    const allResults = calculateAllStores(data, DEFAULT_SETTINGS, 28)
    const results = Array.from(allResults.values())
    const aggregated = aggregateStoreResults(results, 28)

    expect(aggregated.totalSales).toBe(45000) // 15000 + 30000
    expect(aggregated.totalCost).toBe(30000) // 10000 + 20000
    expect(aggregated.daily.get(1)?.sales).toBe(45000)
    expect(aggregated.storeId).toBe('aggregate')
  })

  it('在庫法集計: 両店舗に在庫設定がある場合', () => {
    const data: ImportedData = {
      ...createEmptyImportedData(),
      stores: new Map([
        ['1', { id: '1', code: '0001', name: '店舗A' }],
        ['2', { id: '2', code: '0002', name: '店舗B' }],
      ]),
      purchase: {
        '1': { 1: { suppliers: {}, total: { cost: 10000, price: 13000 } } },
        '2': { 1: { suppliers: {}, total: { cost: 20000, price: 26000 } } },
      },
      sales: {
        '1': { 1: { sales: 50000 } },
        '2': { 1: { sales: 80000 } },
      },
      settings: new Map([
        ['1', { storeId: '1', openingInventory: 100000, closingInventory: 95000, grossProfitBudget: null }],
        ['2', { storeId: '2', openingInventory: 200000, closingInventory: 190000, grossProfitBudget: null }],
      ]),
    }

    const allResults = calculateAllStores(data, DEFAULT_SETTINGS, 28)
    const results = Array.from(allResults.values())
    const agg = aggregateStoreResults(results, 28)

    // 合算期首 = 100000 + 200000 = 300000
    expect(agg.openingInventory).toBe(300000)
    // 合算期末 = 95000 + 190000 = 285000
    expect(agg.closingInventory).toBe(285000)
    // 在庫法COGS = 300000 + 30000 - 285000 = 45000
    expect(agg.invMethodCogs).toBe(45000)
    // 在庫法粗利 = 130000 - 45000 = 85000
    expect(agg.invMethodGrossProfit).toBe(85000)
  })

  it('0件でエラーをスロー', () => {
    expect(() => aggregateStoreResults([], 28)).toThrow('Cannot aggregate 0 results')
  })
})
