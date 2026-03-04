/**
 * dataSummary 純粋関数のユニットテスト
 */
import { describe, it, expect } from 'vitest'
import { createEmptyImportedData } from '@/domain/models'
import type { ImportedData } from '@/domain/models'
import {
  computeHasAnyData,
  computeLoadedTypes,
  computeMaxDayByType,
  computeCtsRecordStats,
  computeRecordDays,
  analyzeStoreDayRecord,
  analyzeClassifiedSales,
  buildDataOverview,
} from '../dataSummary'

function buildTestData(overrides: Partial<ImportedData> = {}): ImportedData {
  return {
    ...createEmptyImportedData(),
    stores: new Map([
      ['1', { id: '1', code: '0001', name: '店舗A' }],
      ['2', { id: '2', code: '0002', name: '店舗B' }],
    ]),
    ...overrides,
  }
}

function makeCSRecord(day: number, storeId: string, salesAmount: number) {
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
    discount71: 0,
    discount72: 0,
    discount73: 0,
    discount74: 0,
  }
}

function makeCtsRecord(day: number, storeId: string) {
  return {
    year: 2025,
    month: 1,
    day,
    storeId,
    department: { code: 'D01', name: '青果' },
    line: { code: 'L01', name: '果物' },
    klass: { code: 'K01', name: 'りんご' },
    totalAmount: 10000,
    totalQuantity: 50,
    timeSlots: [],
  }
}

// ─── computeHasAnyData ────────────────────────────────

describe('computeHasAnyData', () => {
  it('空データでは false', () => {
    expect(computeHasAnyData(createEmptyImportedData())).toBe(false)
  })

  it('仕入データありで true', () => {
    const data = buildTestData({
      purchase: { '1': { 1: { suppliers: {}, total: { cost: 100, price: 130 } } } },
    })
    expect(computeHasAnyData(data)).toBe(true)
  })

  it('売上データありで true', () => {
    const data = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 15000)] },
    })
    expect(computeHasAnyData(data)).toBe(true)
  })

  it('花データのみでは false（仕入・売上チェックのみ）', () => {
    const data = buildTestData({
      flowers: { '1': { 1: { price: 10000, cost: 8000 } } },
    })
    expect(computeHasAnyData(data)).toBe(false)
  })
})

// ─── computeLoadedTypes ────────────────────────────────

describe('computeLoadedTypes', () => {
  it('空データでは空セット', () => {
    const types = computeLoadedTypes(createEmptyImportedData())
    expect(types.size).toBe(0)
  })

  it('仕入のみ', () => {
    const data = buildTestData({
      purchase: { '1': { 1: { suppliers: {}, total: { cost: 100, price: 130 } } } },
    })
    const types = computeLoadedTypes(data)
    expect(types.has('purchase')).toBe(true)
    expect(types.size).toBe(1)
  })

  it('複数種別のロード', () => {
    const data = buildTestData({
      purchase: { '1': { 1: { suppliers: {}, total: { cost: 100, price: 130 } } } },
      classifiedSales: { records: [makeCSRecord(1, '1', 15000)] },
      flowers: { '1': { 1: { price: 10000, cost: 8000 } } },
      budget: new Map([['1', { storeId: '1', total: 6000000, daily: new Map() }]]),
    })
    const types = computeLoadedTypes(data)
    expect(types.has('purchase')).toBe(true)
    expect(types.has('classifiedSales')).toBe(true)
    expect(types.has('flowers')).toBe(true)
    expect(types.has('budget')).toBe(true)
    expect(types.size).toBe(4)
  })

  it('categoryTimeSales の検出', () => {
    const data = buildTestData({
      categoryTimeSales: { records: [makeCtsRecord(1, '1')] },
    })
    const types = computeLoadedTypes(data)
    expect(types.has('categoryTimeSales')).toBe(true)
  })

  it('settings (initialSettings) の検出', () => {
    const data = buildTestData({
      settings: new Map([
        [
          '1',
          {
            storeId: '1',
            openingInventory: 100000,
            closingInventory: 120000,
            grossProfitBudget: null,
            productInventory: null,
            costInclusionInventory: null,
            inventoryDate: null,
            closingInventoryDay: null,
          },
        ],
      ]),
    })
    const types = computeLoadedTypes(data)
    expect(types.has('initialSettings')).toBe(true)
  })
})

// ─── computeMaxDayByType ────────────────────────────────

describe('computeMaxDayByType', () => {
  it('空データでは空マップ', () => {
    const result = computeMaxDayByType(createEmptyImportedData())
    expect(result.size).toBe(0)
  })

  it('売上の最大日を取得', () => {
    const data = buildTestData({
      classifiedSales: {
        records: [makeCSRecord(1, '1', 10000), makeCSRecord(15, '1', 20000)],
      },
    })
    const result = computeMaxDayByType(data)
    expect(result.get('classifiedSales')).toBe(15)
  })

  it('仕入の最大日を取得', () => {
    const data = buildTestData({
      purchase: {
        '1': {
          5: { suppliers: {}, total: { cost: 100, price: 130 } },
          20: { suppliers: {}, total: { cost: 200, price: 260 } },
        },
      },
    })
    const result = computeMaxDayByType(data)
    expect(result.get('purchase')).toBe(20)
  })

  it('複数種別の最大日', () => {
    const data = buildTestData({
      classifiedSales: { records: [makeCSRecord(10, '1', 10000)] },
      flowers: { '1': { 25: { price: 10000, cost: 8000 } } },
      categoryTimeSales: { records: [makeCtsRecord(18, '1')] },
    })
    const result = computeMaxDayByType(data)
    expect(result.get('classifiedSales')).toBe(10)
    expect(result.get('flowers')).toBe(25)
    expect(result.get('categoryTimeSales')).toBe(18)
  })
})

// ─── computeCtsRecordStats ────────────────────────────────

describe('computeCtsRecordStats', () => {
  it('空データ', () => {
    const stats = computeCtsRecordStats({ records: [] })
    expect(stats.recordCount).toBe(0)
    expect(stats.storeCount).toBe(0)
    expect(stats.dayRange).toBeNull()
  })

  it('単一レコード', () => {
    const stats = computeCtsRecordStats({ records: [makeCtsRecord(5, '1')] })
    expect(stats.recordCount).toBe(1)
    expect(stats.storeCount).toBe(1)
    expect(stats.dayRange).toEqual({ min: 5, max: 5 })
  })

  it('複数店舗・複数日', () => {
    const records = [
      makeCtsRecord(1, '1'),
      makeCtsRecord(15, '1'),
      makeCtsRecord(3, '2'),
      makeCtsRecord(20, '3'),
    ]
    const stats = computeCtsRecordStats({ records })
    expect(stats.recordCount).toBe(4)
    expect(stats.storeCount).toBe(3)
    expect(stats.dayRange).toEqual({ min: 1, max: 20 })
  })
})

// ─── computeRecordDays ────────────────────────────────

describe('computeRecordDays', () => {
  it('空データ', () => {
    const days = computeRecordDays({ records: [] })
    expect(days.size).toBe(0)
  })

  it('重複排除', () => {
    const records = [
      makeCSRecord(1, '1', 10000),
      makeCSRecord(1, '2', 20000),
      makeCSRecord(5, '1', 30000),
    ]
    const days = computeRecordDays({ records })
    expect(days.size).toBe(2)
    expect(days.has(1)).toBe(true)
    expect(days.has(5)).toBe(true)
  })
})

// ─── analyzeStoreDayRecord ────────────────────────────────

describe('analyzeStoreDayRecord', () => {
  const storeNames = new Map([
    ['1', { id: '1', code: '0001', name: '店舗A' }],
    ['2', { id: '2', code: '0002', name: '店舗B' }],
  ])

  it('空レコード', () => {
    const result = analyzeStoreDayRecord({}, 'テスト', storeNames)
    expect(result.storeCount).toBe(0)
    expect(result.totalRecords).toBe(0)
    expect(result.dayRange).toBeNull()
    expect(result.perStore).toHaveLength(0)
  })

  it('単一店舗', () => {
    const record = {
      '1': {
        1: { cost: 100, price: 130 },
        5: { cost: 200, price: 260 },
        10: { cost: 300, price: 390 },
      },
    }
    const result = analyzeStoreDayRecord(record, '仕入', storeNames)
    expect(result.storeCount).toBe(1)
    expect(result.totalRecords).toBe(3)
    expect(result.dayRange).toEqual({ min: 1, max: 10 })
    expect(result.perStore[0].storeName).toBe('店舗A')
    expect(result.perStore[0].days).toBe(3)
  })

  it('複数店舗', () => {
    const record = {
      '1': { 1: { cost: 100, price: 130 }, 5: { cost: 200, price: 260 } },
      '2': { 3: { cost: 300, price: 390 }, 15: { cost: 400, price: 520 } },
    }
    const result = analyzeStoreDayRecord(record, '仕入', storeNames)
    expect(result.storeCount).toBe(2)
    expect(result.totalRecords).toBe(4)
    expect(result.dayRange).toEqual({ min: 1, max: 15 })
  })

  it('客数チェック', () => {
    const record = {
      '1': { 1: { price: 10000, cost: 8000, customers: 30 } },
    }
    const result = analyzeStoreDayRecord(record, '花', storeNames, true)
    expect(result.hasCustomers).toBe(true)
  })

  it('客数なしの場合', () => {
    const record = {
      '1': { 1: { price: 10000, cost: 8000 } },
    }
    const result = analyzeStoreDayRecord(record, '花', storeNames, true)
    expect(result.hasCustomers).toBe(false)
  })

  it('不明な店舗IDのフォールバック名', () => {
    const record = {
      '99': { 1: { cost: 100, price: 130 } },
    }
    const result = analyzeStoreDayRecord(record, 'テスト', storeNames)
    expect(result.perStore[0].storeName).toBe('店舗99')
  })
})

// ─── analyzeClassifiedSales ────────────────────────────────

describe('analyzeClassifiedSales', () => {
  it('空データ', () => {
    const data = buildTestData()
    const result = analyzeClassifiedSales(data, '分類別売上', false)
    expect(result.storeCount).toBe(0)
    expect(result.totalRecords).toBe(0)
  })

  it('当年データの分析', () => {
    const data = buildTestData({
      classifiedSales: {
        records: [
          makeCSRecord(1, '1', 10000),
          makeCSRecord(5, '1', 20000),
          makeCSRecord(1, '2', 15000),
        ],
      },
    })
    const result = analyzeClassifiedSales(data, '分類別売上', false)
    expect(result.storeCount).toBe(2)
    expect(result.totalRecords).toBe(3) // day 1, day 5 for store 1 + day 1 for store 2
    expect(result.dayRange).toEqual({ min: 1, max: 5 })
  })

  it('前年データの分析', () => {
    const data = buildTestData({
      prevYearClassifiedSales: {
        records: [makeCSRecord(3, '1', 8000), makeCSRecord(20, '2', 12000)],
      },
    })
    const result = analyzeClassifiedSales(data, '前年分類別売上', true)
    expect(result.storeCount).toBe(2)
    expect(result.dayRange).toEqual({ min: 3, max: 20 })
  })

  it('同一店舗・同一日の重複レコード（日数はユニーク計算）', () => {
    const data = buildTestData({
      classifiedSales: {
        records: [
          makeCSRecord(1, '1', 10000),
          makeCSRecord(1, '1', 20000), // 同日・同店舗
          makeCSRecord(5, '1', 30000),
        ],
      },
    })
    const result = analyzeClassifiedSales(data, '分類別売上', false)
    expect(result.storeCount).toBe(1)
    // totalRecords = unique days per store, so store 1 has days {1, 5} = 2
    expect(result.totalRecords).toBe(2)
  })
})

// ─── buildDataOverview ────────────────────────────────

describe('buildDataOverview', () => {
  it('空データでは 8 エントリ返却（全種別）', () => {
    const overview = buildDataOverview(createEmptyImportedData())
    expect(overview).toHaveLength(8)
    for (const entry of overview) {
      expect(entry.storeCount).toBe(0)
      expect(entry.totalRecords).toBe(0)
    }
  })

  it('データありの場合に正しいラベルと統計', () => {
    const data = buildTestData({
      purchase: { '1': { 1: { suppliers: {}, total: { cost: 100, price: 130 } } } },
      classifiedSales: { records: [makeCSRecord(1, '1', 10000)] },
    })
    const overview = buildDataOverview(data)
    const purchaseEntry = overview.find((e) => e.label === '仕入')
    const salesEntry = overview.find((e) => e.label === '分類別売上')
    expect(purchaseEntry?.storeCount).toBe(1)
    expect(salesEntry?.storeCount).toBe(1)
  })

  it('全ラベルが含まれる', () => {
    const overview = buildDataOverview(createEmptyImportedData())
    const labels = overview.map((e) => e.label)
    expect(labels).toContain('仕入')
    expect(labels).toContain('分類別売上')
    expect(labels).toContain('花')
    expect(labels).toContain('産直')
    expect(labels).toContain('店間入')
    expect(labels).toContain('店間出')
    expect(labels).toContain('消耗品')
    expect(labels).toContain('前年分類別売上')
  })
})
