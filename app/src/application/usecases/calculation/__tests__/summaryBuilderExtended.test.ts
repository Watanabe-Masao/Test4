/**
 * summaryBuilder 拡張テスト
 *
 * summaryBuilder.test.ts がカバーする基本ケースを除き、
 * エッジケース・複合条件・キャッシュ境界をテストする。
 */
import { describe, it, expect } from 'vitest'
import {
  buildStoreDaySummaryIndex,
  buildStoreDaySummaryCache,
  computeSummaryFingerprint,
} from '../summaryBuilder'
import { createEmptyMonthlyData } from '@/domain/models/MonthlyData'
import type { MonthlyData } from '@/domain/models/MonthlyData'
import type { ClassifiedSalesRecord } from '@/domain/models/ClassifiedSales'

// ─── テストヘルパー ──────────────────────────────────────

function makeCSRecord(
  day: number,
  storeId: string,
  salesAmount: number,
  overrides: Partial<
    Pick<ClassifiedSalesRecord, 'discount71' | 'discount72' | 'discount73' | 'discount74'>
  > = {},
): ClassifiedSalesRecord {
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
    discount71: overrides.discount71 ?? 0,
    discount72: overrides.discount72 ?? 0,
    discount73: overrides.discount73 ?? 0,
    discount74: overrides.discount74 ?? 0,
  }
}

function buildTestData(overrides: Partial<MonthlyData> = {}): MonthlyData {
  return {
    ...createEmptyMonthlyData({ year: 2025, month: 1, importedAt: '' }),
    stores: new Map([['1', { id: '1', code: '0001', name: '店舗A' }]]),
    ...overrides,
  }
}

// ─── エッジケーステスト ──────────────────────────────────

describe('buildStoreDaySummaryIndex — edge cases', () => {
  it('店舗がゼロ件のとき空オブジェクトを返す', () => {
    const data = buildTestData({ stores: new Map() })
    const index = buildStoreDaySummaryIndex(data, 31)

    expect(Object.keys(index)).toHaveLength(0)
  })

  it('daysInMonth=28（2月）の場合 29日以降は生成されない', () => {
    const data = buildTestData({
      classifiedSales: {
        records: [
          makeCSRecord(28, '1', 5000),
          makeCSRecord(29, '1', 3000), // 2月なら範囲外
        ],
      },
    })

    const index = buildStoreDaySummaryIndex(data, 28)

    expect(index['1'][28]).toBeDefined()
    expect(index['1'][28].sales).toBe(5000)
    // day=29 はレコードが存在しても daysInMonth=28 ではループ範囲外
    expect(index['1'][29]).toBeUndefined()
  })

  it('同日に同店舗の複数レコードがある場合、売上が合算される', () => {
    const data = buildTestData({
      classifiedSales: {
        records: [
          makeCSRecord(1, '1', 10000),
          {
            ...makeCSRecord(1, '1', 5000),
            departmentName: 'D2',
          },
        ],
      },
    })

    const index = buildStoreDaySummaryIndex(data, 31)

    expect(index['1'][1].sales).toBe(15000)
  })

  it('売上ゼロだが仕入のみある日はスキップされない', () => {
    const data = buildTestData({
      purchase: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 5,
            storeId: '1',
            suppliers: { S1: { name: 'Sup', cost: 3000, price: 4000 } },
            total: { cost: 3000, price: 4000 },
          },
        ],
      },
    })

    const index = buildStoreDaySummaryIndex(data, 31)

    expect(index['1'][5]).toBeDefined()
    expect(index['1'][5].purchaseCost).toBe(3000)
    expect(index['1'][5].sales).toBe(0)
  })

  it('売上ゼロだが売変のみある日はスキップされない', () => {
    const data = buildTestData({
      classifiedSales: {
        records: [makeCSRecord(2, '1', 0, { discount71: -100 })],
      },
    })

    const index = buildStoreDaySummaryIndex(data, 31)

    expect(index['1'][2]).toBeDefined()
    expect(index['1'][2].discountAbsolute).toBe(100)
    expect(index['1'][2].grossSales).toBe(100)
  })

  it('消耗品のみの日はスキップされない', () => {
    const data = buildTestData({
      consumables: {
        records: [{ year: 2025, month: 1, day: 10, storeId: '1', cost: 200, items: [] }],
      },
    })

    const index = buildStoreDaySummaryIndex(data, 31)

    expect(index['1'][10]).toBeDefined()
    expect(index['1'][10].costInclusionCost).toBe(200)
    expect(index['1'][10].sales).toBe(0)
  })

  it('移動データのみの日（売上ゼロ）はスキップされない', () => {
    const data = buildTestData({
      interStoreIn: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 7,
            storeId: '1',
            interStoreIn: [
              {
                day: 7,
                cost: 500,
                price: 600,
                fromStoreId: '2',
                toStoreId: '1',
                isDepartmentTransfer: false,
              },
            ],
            interStoreOut: [],
            interDepartmentIn: [],
            interDepartmentOut: [],
          },
        ],
      },
    })

    const index = buildStoreDaySummaryIndex(data, 31)

    expect(index['1'][7]).toBeDefined()
    expect(index['1'][7].interStoreInCost).toBe(500)
  })

  it('花データのみの日（売上ゼロ）はスキップされない', () => {
    const data = buildTestData({
      flowers: {
        records: [
          { year: 2025, month: 1, day: 3, storeId: '1', cost: 1000, price: 1500, customers: 50 },
        ],
      },
    })

    const index = buildStoreDaySummaryIndex(data, 31)

    expect(index['1'][3]).toBeDefined()
    expect(index['1'][3].flowersCost).toBe(1000)
    expect(index['1'][3].customers).toBe(50)
  })

  it('複数の移動レコードが同日にある場合、合算される', () => {
    const data = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 10000)] },
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
                cost: 100,
                price: 120,
                fromStoreId: '2',
                toStoreId: '1',
                isDepartmentTransfer: false,
              },
              {
                day: 1,
                cost: 200,
                price: 250,
                fromStoreId: '3',
                toStoreId: '1',
                isDepartmentTransfer: false,
              },
            ],
            interStoreOut: [],
            interDepartmentIn: [
              {
                day: 1,
                cost: 50,
                price: 60,
                fromStoreId: '4',
                toStoreId: '1',
                isDepartmentTransfer: true,
              },
            ],
            interDepartmentOut: [],
          },
        ],
      },
    })

    const index = buildStoreDaySummaryIndex(data, 31)
    const s = index['1'][1]

    expect(s.interStoreInCost).toBe(300) // 100 + 200
    expect(s.interStoreInPrice).toBe(370) // 120 + 250
    expect(s.interDeptInCost).toBe(50)
    expect(s.interDeptInPrice).toBe(60)
  })

  it('coreSales は花+産直売価が売上を超えるとゼロ以下になりうる', () => {
    const data = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 5000)] },
      flowers: {
        records: [
          { year: 2025, month: 1, day: 1, storeId: '1', cost: 2000, price: 3000, customers: 10 },
        ],
      },
      directProduce: {
        records: [{ year: 2025, month: 1, day: 1, storeId: '1', cost: 1500, price: 3000 }],
      },
    })

    const index = buildStoreDaySummaryIndex(data, 31)
    const s = index['1'][1]

    // coreSales = 5000 - 3000 - 3000 = -1000 (or clamped to 0 by calculateCoreSales)
    // calculateCoreSales clamps to 0 when overdelivery
    expect(s.coreSales).toBe(0)
  })

  it('全データ種別を持つ日は全フィールドが正しく設定される', () => {
    const data = buildTestData({
      purchase: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: '1',
            suppliers: { S1: { name: 'A', cost: 8000, price: 10000 } },
            total: { cost: 8000, price: 10000 },
          },
        ],
      },
      classifiedSales: {
        records: [makeCSRecord(1, '1', 25000, { discount71: -300, discount73: -200 })],
      },
      flowers: {
        records: [
          { year: 2025, month: 1, day: 1, storeId: '1', cost: 1000, price: 1500, customers: 120 },
        ],
      },
      directProduce: {
        records: [{ year: 2025, month: 1, day: 1, storeId: '1', cost: 800, price: 1000 }],
      },
      consumables: {
        records: [{ year: 2025, month: 1, day: 1, storeId: '1', cost: 450, items: [] }],
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
                cost: 600,
                price: 700,
                fromStoreId: '2',
                toStoreId: '1',
                isDepartmentTransfer: false,
              },
            ],
            interStoreOut: [],
            interDepartmentIn: [],
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
                cost: 300,
                price: 350,
                fromStoreId: '1',
                toStoreId: '3',
                isDepartmentTransfer: false,
              },
            ],
            interDepartmentIn: [],
            interDepartmentOut: [],
          },
        ],
      },
    })

    const index = buildStoreDaySummaryIndex(data, 31)
    const s = index['1'][1]

    expect(s.day).toBe(1)
    expect(s.sales).toBe(25000)
    expect(s.coreSales).toBe(25000 - 1500 - 1000) // 22500
    expect(s.discountAbsolute).toBe(500) // 300 + 200
    expect(s.grossSales).toBe(25000 + 500)
    expect(s.purchaseCost).toBe(8000)
    expect(s.purchasePrice).toBe(10000)
    expect(s.flowersCost).toBe(1000)
    expect(s.flowersPrice).toBe(1500)
    expect(s.directProduceCost).toBe(800)
    expect(s.directProducePrice).toBe(1000)
    expect(s.costInclusionCost).toBe(450)
    expect(s.customers).toBe(120)
    expect(s.interStoreInCost).toBe(600)
    expect(s.interStoreInPrice).toBe(700)
    expect(s.interStoreOutCost).toBe(300)
    expect(s.interStoreOutPrice).toBe(350)
  })
})

// ─── フィンガープリントエッジケース ──────────────────────

describe('computeSummaryFingerprint — edge cases', () => {
  it('空データでもフィンガープリントが生成される', () => {
    const data = buildTestData()
    const fp = computeSummaryFingerprint(data)

    expect(fp).toMatch(/^sds:/)
    expect(fp.length).toBeGreaterThan(4)
  })

  it('stores の差異はフィンガープリントに影響する', () => {
    const data1 = buildTestData({
      stores: new Map([['1', { id: '1', code: '0001', name: '店舗A' }]]),
    })
    const data2 = buildTestData({
      stores: new Map([
        ['1', { id: '1', code: '0001', name: '店舗A' }],
        ['2', { id: '2', code: '0002', name: '店舗B' }],
      ]),
    })

    expect(computeSummaryFingerprint(data1)).not.toBe(computeSummaryFingerprint(data2))
  })

  it('仕入データの差異はフィンガープリントに影響する', () => {
    const data1 = buildTestData({
      purchase: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: '1',
            suppliers: { S1: { name: 'A', cost: 1000, price: 1200 } },
            total: { cost: 1000, price: 1200 },
          },
        ],
      },
    })
    const data2 = buildTestData({
      purchase: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: '1',
            suppliers: { S1: { name: 'A', cost: 2000, price: 2400 } },
            total: { cost: 2000, price: 2400 },
          },
        ],
      },
    })

    expect(computeSummaryFingerprint(data1)).not.toBe(computeSummaryFingerprint(data2))
  })

  it('settings/budget の差異はフィンガープリントに影響しない（含まないため）', () => {
    const data1 = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 10000)] },
      settings: new Map([
        [
          '1',
          {
            storeId: '1',
            openingInventory: 100000,
            closingInventory: null,
            grossProfitBudget: null,
            productInventory: null,
            costInclusionInventory: null,
            inventoryDate: null,
            closingInventoryDay: null,
          },
        ],
      ]),
    })
    const data2 = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 10000)] },
      settings: new Map([
        [
          '1',
          {
            storeId: '1',
            openingInventory: 999999,
            closingInventory: null,
            grossProfitBudget: null,
            productInventory: null,
            costInclusionInventory: null,
            inventoryDate: null,
            closingInventoryDay: null,
          },
        ],
      ]),
    })

    expect(computeSummaryFingerprint(data1)).toBe(computeSummaryFingerprint(data2))
  })
})

// ─── キャッシュ構築の追加テスト ──────────────────────────

describe('buildStoreDaySummaryCache — extended', () => {
  it('複数店舗のキャッシュが正しく構築される', () => {
    const data = buildTestData({
      stores: new Map([
        ['1', { id: '1', code: '0001', name: '店舗A' }],
        ['2', { id: '2', code: '0002', name: '店舗B' }],
      ]),
      classifiedSales: {
        records: [makeCSRecord(1, '1', 10000), makeCSRecord(1, '2', 20000)],
      },
    })

    const cache = buildStoreDaySummaryCache(data, 31)

    expect(cache.summaries['1'][1].sales).toBe(10000)
    expect(cache.summaries['2'][1].sales).toBe(20000)
    expect(cache.sourceFingerprint).toMatch(/^sds:/)
    expect(cache.builtAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('daysInMonth が異なるとサマリーの範囲が変わる', () => {
    const data = buildTestData({
      classifiedSales: {
        records: [makeCSRecord(30, '1', 5000), makeCSRecord(31, '1', 3000)],
      },
    })

    const cache30 = buildStoreDaySummaryCache(data, 30)
    const cache31 = buildStoreDaySummaryCache(data, 31)

    expect(cache30.summaries['1'][30]).toBeDefined()
    expect(cache30.summaries['1'][31]).toBeUndefined()
    expect(cache31.summaries['1'][31]).toBeDefined()
    expect(cache31.summaries['1'][31].sales).toBe(3000)
  })
})
