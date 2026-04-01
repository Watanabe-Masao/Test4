import { describe, it, expect } from 'vitest'
import {
  buildStoreDaySummaryIndex,
  buildStoreDaySummaryCache,
  computeSummaryFingerprint,
} from '../summaryBuilder'
import { buildDailyRecords } from '../dailyBuilder'
import { createEmptyMonthlyData } from '@/domain/models/MonthlyData'
import type { MonthlyData } from '@/domain/models/MonthlyData'

// ─── テストヘルパー ──────────────────────────────────────

function makeCSRecord(
  day: number,
  storeId: string,
  salesAmount: number,
  d71 = 0,
  d72 = 0,
  d73 = 0,
  d74 = 0,
) {
  return {
    year: 2025,
    month: 1,
    day,
    storeId,
    storeName: `Store ${storeId}`,
    groupName: 'G',
    departmentName: 'D',
    lineName: 'L',
    className: 'C',
    salesAmount,
    discount71: d71,
    discount72: d72,
    discount73: d73,
    discount74: d74,
  }
}

function buildTestData(overrides: Partial<MonthlyData> = {}): MonthlyData {
  return {
    ...createEmptyMonthlyData({ year: 2025, month: 1, importedAt: '' }),
    stores: new Map([['1', { id: '1', code: '0001', name: '店舗A' }]]),
    ...overrides,
  }
}

// ─── テスト ──────────────────────────────────────────────

describe('buildStoreDaySummaryIndex', () => {
  it('空データでは空のインデックスを返す（店舗キーは存在）', () => {
    const data = buildTestData()
    const index = buildStoreDaySummaryIndex(data, 31)

    expect(Object.keys(index)).toEqual(['1'])
    expect(Object.keys(index['1'])).toHaveLength(0)
  })

  it('売上＋仕入の基本結合', () => {
    const data = buildTestData({
      purchase: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: '1',
            suppliers: { '0001': { name: 'A', cost: 10000, price: 13000 } },
            total: { cost: 10000, price: 13000 },
          },
        ],
      },
      classifiedSales: {
        records: [makeCSRecord(1, '1', 15000)],
      },
    })

    const index = buildStoreDaySummaryIndex(data, 31)

    expect(index['1'][1]).toBeDefined()
    const s = index['1'][1]
    expect(s.day).toBe(1)
    expect(s.sales).toBe(15000)
    expect(s.purchaseCost).toBe(10000)
    expect(s.purchasePrice).toBe(13000)
    expect(s.coreSales).toBe(15000) // 花・産直なし → coreSales = sales
    expect(s.grossSales).toBe(15000) // 売変なし → grossSales = sales
  })

  it('花・産直データの結合', () => {
    const data = buildTestData({
      classifiedSales: {
        records: [makeCSRecord(1, '1', 20000)],
      },
      flowers: {
        records: [
          { year: 2025, month: 1, day: 1, storeId: '1', cost: 3000, price: 4000, customers: 100 },
        ],
      },
      directProduce: {
        records: [{ year: 2025, month: 1, day: 1, storeId: '1', cost: 2000, price: 2500 }],
      },
    })

    const index = buildStoreDaySummaryIndex(data, 31)
    const s = index['1'][1]

    expect(s.flowersCost).toBe(3000)
    expect(s.flowersPrice).toBe(4000)
    expect(s.directProduceCost).toBe(2000)
    expect(s.directProducePrice).toBe(2500)
    expect(s.customers).toBe(100)
    // coreSales = 20000 - 4000 - 2500 = 13500
    expect(s.coreSales).toBe(13500)
  })

  it('売変内訳の結合', () => {
    const data = buildTestData({
      classifiedSales: {
        records: [makeCSRecord(1, '1', 10000, -500, -300, -200, -100)],
      },
    })

    const index = buildStoreDaySummaryIndex(data, 31)
    const s = index['1'][1]

    expect(s.discountAbsolute).toBe(1100) // abs(-500 + -300 + -200 + -100) = 1100
    expect(s.grossSales).toBe(10000 + 1100) // sales + discountAbsolute
    expect(s.discountEntries).toHaveLength(4)
    expect(s.discountEntries.find((e) => e.type === '71')?.amount).toBe(500)
    expect(s.discountEntries.find((e) => e.type === '72')?.amount).toBe(300)
    expect(s.discountEntries.find((e) => e.type === '73')?.amount).toBe(200)
    expect(s.discountEntries.find((e) => e.type === '74')?.amount).toBe(100)
  })

  it('移動データの結合', () => {
    const data = buildTestData({
      classifiedSales: {
        records: [makeCSRecord(1, '1', 10000)],
      },
      interStoreIn: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: '1',
            interStoreIn: [
              {
                day: 1,
                cost: 1000,
                price: 1300,
                fromStoreId: '2',
                toStoreId: '1',
                isDepartmentTransfer: false,
              },
            ],
            interStoreOut: [],
            interDepartmentIn: [
              {
                day: 1,
                cost: 500,
                price: 600,
                fromStoreId: '2',
                toStoreId: '1',
                isDepartmentTransfer: true,
              },
            ],
            interDepartmentOut: [],
          },
        ],
      },
      interStoreOut: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: '1',
            interStoreIn: [],
            interStoreOut: [
              {
                day: 1,
                cost: 800,
                price: 1000,
                fromStoreId: '1',
                toStoreId: '3',
                isDepartmentTransfer: false,
              },
            ],
            interDepartmentIn: [],
            interDepartmentOut: [
              {
                day: 1,
                cost: 400,
                price: 500,
                fromStoreId: '1',
                toStoreId: '3',
                isDepartmentTransfer: true,
              },
            ],
          },
        ],
      },
    })

    const index = buildStoreDaySummaryIndex(data, 31)
    const s = index['1'][1]

    expect(s.interStoreInCost).toBe(1000)
    expect(s.interStoreInPrice).toBe(1300)
    expect(s.interDeptInCost).toBe(500)
    expect(s.interDeptInPrice).toBe(600)
    expect(s.interStoreOutCost).toBe(800)
    expect(s.interStoreOutPrice).toBe(1000)
    expect(s.interDeptOutCost).toBe(400)
    expect(s.interDeptOutPrice).toBe(500)
  })

  it('消耗品データの結合', () => {
    const data = buildTestData({
      consumables: {
        records: [{ year: 2025, month: 1, day: 1, storeId: '1', cost: 750, items: [] }],
      },
    })

    const index = buildStoreDaySummaryIndex(data, 31)
    const s = index['1'][1]

    expect(s.costInclusionCost).toBe(750)
  })

  it('データのない日はスキップされる', () => {
    const data = buildTestData({
      classifiedSales: {
        records: [makeCSRecord(1, '1', 10000), makeCSRecord(3, '1', 20000)],
      },
    })

    const index = buildStoreDaySummaryIndex(data, 31)

    expect(index['1'][1]).toBeDefined()
    expect(index['1'][2]).toBeUndefined()
    expect(index['1'][3]).toBeDefined()
  })

  it('複数店舗のサマリーが構築される', () => {
    const data = buildTestData({
      stores: new Map([
        ['1', { id: '1', code: '0001', name: '店舗A' }],
        ['2', { id: '2', code: '0002', name: '店舗B' }],
      ]),
      classifiedSales: {
        records: [makeCSRecord(1, '1', 10000), makeCSRecord(1, '2', 20000)],
      },
    })

    const index = buildStoreDaySummaryIndex(data, 31)

    expect(Object.keys(index)).toHaveLength(2)
    expect(index['1'][1].sales).toBe(10000)
    expect(index['2'][1].sales).toBe(20000)
  })
})

describe('summaryBuilder と dailyBuilder の一貫性', () => {
  it('売上・仕入・花・産直・移動・消耗品の数値が dailyBuilder と一致する', () => {
    const data = buildTestData({
      purchase: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: '1',
            suppliers: { '0001': { name: 'A', cost: 10000, price: 13000 } },
            total: { cost: 10000, price: 13000 },
          },
          {
            year: 2025,
            month: 1,
            day: 2,
            storeId: '1',
            suppliers: { '0002': { name: 'B', cost: 5000, price: 6500 } },
            total: { cost: 5000, price: 6500 },
          },
        ],
      },
      classifiedSales: {
        records: [
          makeCSRecord(1, '1', 15000, -200, -100, -50, -30),
          makeCSRecord(2, '1', 12000, -100, 0, -80, 0),
        ],
      },
      flowers: {
        records: [
          { year: 2025, month: 1, day: 1, storeId: '1', cost: 2000, price: 2500, customers: 80 },
          { year: 2025, month: 1, day: 2, storeId: '1', cost: 1500, price: 2000, customers: 60 },
        ],
      },
      directProduce: {
        records: [{ year: 2025, month: 1, day: 1, storeId: '1', cost: 1000, price: 1200 }],
      },
      consumables: {
        records: [{ year: 2025, month: 1, day: 1, storeId: '1', cost: 500, items: [] }],
      },
    })

    const daysInMonth = 28
    const summaryIndex = buildStoreDaySummaryIndex(data, daysInMonth)
    const dailyAcc = buildDailyRecords('1', data, daysInMonth)

    // Day 1
    const s1 = summaryIndex['1'][1]
    const d1 = dailyAcc.daily.get(1)!

    expect(s1.sales).toBe(d1.sales)
    expect(s1.purchaseCost).toBe(d1.purchase.cost)
    expect(s1.purchasePrice).toBe(d1.purchase.price)
    expect(s1.flowersCost).toBe(d1.flowers.cost)
    expect(s1.flowersPrice).toBe(d1.flowers.price)
    expect(s1.directProduceCost).toBe(d1.directProduce.cost)
    expect(s1.directProducePrice).toBe(d1.directProduce.price)
    expect(s1.customers).toBe(d1.customers)
    expect(s1.coreSales).toBe(d1.coreSales)
    expect(s1.grossSales).toBe(d1.grossSales)
    expect(s1.discountAbsolute).toBe(d1.discountAbsolute)
    expect(s1.costInclusionCost).toBe(d1.costInclusion.cost)
    expect(s1.interStoreInCost).toBe(d1.interStoreIn.cost)
    expect(s1.interStoreOutCost).toBe(d1.interStoreOut.cost)

    // Day 2
    const s2 = summaryIndex['1'][2]
    const d2 = dailyAcc.daily.get(2)!

    expect(s2.sales).toBe(d2.sales)
    expect(s2.purchaseCost).toBe(d2.purchase.cost)
    expect(s2.customers).toBe(d2.customers)
    expect(s2.coreSales).toBe(d2.coreSales)
  })
})

describe('computeSummaryFingerprint', () => {
  it('同一データで同一フィンガープリントを返す', () => {
    const data = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 10000)] },
    })

    const fp1 = computeSummaryFingerprint(data)
    const fp2 = computeSummaryFingerprint(data)

    expect(fp1).toBe(fp2)
    expect(fp1).toMatch(/^sds:/)
  })

  it('データが変わるとフィンガープリントが変わる', () => {
    const data1 = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 10000)] },
    })
    const data2 = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 20000)] },
    })

    const fp1 = computeSummaryFingerprint(data1)
    const fp2 = computeSummaryFingerprint(data2)

    expect(fp1).not.toBe(fp2)
  })
})

describe('buildStoreDaySummaryCache', () => {
  it('フィンガープリントとタイムスタンプを含むキャッシュを返す', () => {
    const data = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 10000)] },
    })

    const cache = buildStoreDaySummaryCache(data, 31)

    expect(cache.sourceFingerprint).toMatch(/^sds:/)
    expect(cache.builtAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(cache.summaries['1'][1].sales).toBe(10000)
  })

  it('フィンガープリントの一致で有効性を判定できる', () => {
    const data = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 10000)] },
    })

    const cache = buildStoreDaySummaryCache(data, 31)
    const currentFp = computeSummaryFingerprint(data)

    // 同じデータ → フィンガープリント一致 → キャッシュ有効
    expect(cache.sourceFingerprint).toBe(currentFp)

    // データ変更 → フィンガープリント不一致 → キャッシュ無効
    const modifiedData = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 99999)] },
    })
    const modifiedFp = computeSummaryFingerprint(modifiedData)
    expect(cache.sourceFingerprint).not.toBe(modifiedFp)
  })
})
