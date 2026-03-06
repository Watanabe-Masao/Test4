/**
 * dataSummary 追加テスト
 *
 * 既存 dataSummary.test.ts でカバーされていないエッジケース・境界条件を網羅する。
 */
import { describe, it, expect } from 'vitest'
import { createEmptyImportedData } from '@/domain/models'
import type { ImportedData, Store, TransferDayEntry, CostInclusionRecord } from '@/domain/models'
import {
  computeHasAnyData,
  computeLoadedTypes,
  computeMaxDayByType,
  computeCtsRecordStats,
  computeRecordDays,
  analyzeFlatRecords,
  analyzeClassifiedSales,
  buildDataOverview,
} from '@/application/services/dataSummary'
import type { RecordSetStats } from '@/application/services/dataSummary'
import type { SpecialSalesDayEntry, PurchaseDayEntry } from '@/domain/models'

// ─── ヘルパー ──────────────────────────────────────────

function buildTestData(overrides: Partial<ImportedData> = {}): ImportedData {
  return {
    ...createEmptyImportedData(),
    stores: new Map<string, Store>([
      ['1', { id: '1', code: '0001', name: '店舗A' }],
      ['2', { id: '2', code: '0002', name: '店舗B' }],
      ['3', { id: '3', code: '0003', name: '店舗C' }],
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

const defaultStoreNames: ReadonlyMap<string, Store> = new Map([
  ['1', { id: '1', code: '0001', name: '店舗A' }],
  ['2', { id: '2', code: '0002', name: '店舗B' }],
  ['3', { id: '3', code: '0003', name: '店舗C' }],
])

function makeTransferDayEntry(day: number, storeId: string): TransferDayEntry {
  return {
    year: 2025,
    month: 1,
    day,
    storeId,
    interStoreIn: [],
    interStoreOut: [],
    interDepartmentIn: [],
    interDepartmentOut: [],
  }
}

function makeCostInclusionRecord(day: number, storeId: string, cost: number): CostInclusionRecord {
  return { year: 2025, month: 1, day, storeId, cost, items: [] }
}

// ─── computeHasAnyData: 追加エッジケース ──────────────

describe('computeHasAnyData extended', () => {
  it('両方あっても true', () => {
    const data = buildTestData({
      purchase: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: '1',
            suppliers: {},
            total: { cost: 100, price: 130 },
          },
        ],
      },
      classifiedSales: { records: [makeCSRecord(1, '1', 15000)] },
    })
    expect(computeHasAnyData(data)).toBe(true)
  })

  it('consumables のみでは false（仕入・売上のみチェック）', () => {
    const data = buildTestData({
      consumables: { records: [makeCostInclusionRecord(1, '1', 500)] },
    })
    expect(computeHasAnyData(data)).toBe(false)
  })

  it('interStoreIn のみでは false', () => {
    const data = buildTestData({
      interStoreIn: { records: [makeTransferDayEntry(1, '1')] },
    })
    expect(computeHasAnyData(data)).toBe(false)
  })

  it('interStoreOut のみでは false', () => {
    const data = buildTestData({
      interStoreOut: { records: [makeTransferDayEntry(1, '1')] },
    })
    expect(computeHasAnyData(data)).toBe(false)
  })

  it('directProduce のみでは false', () => {
    const data = buildTestData({
      directProduce: {
        records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 10000, cost: 8000 }],
      },
    })
    expect(computeHasAnyData(data)).toBe(false)
  })

  it('categoryTimeSales のみでは false', () => {
    const data = buildTestData({
      categoryTimeSales: { records: [makeCtsRecord(1, '1')] },
    })
    expect(computeHasAnyData(data)).toBe(false)
  })

  it('空の classifiedSales.records は false', () => {
    const data = buildTestData({ classifiedSales: { records: [] } })
    expect(computeHasAnyData(data)).toBe(false)
  })

  it('空の purchase records は false', () => {
    const data = buildTestData({ purchase: { records: [] } })
    expect(computeHasAnyData(data)).toBe(false)
  })
})

// ─── computeLoadedTypes: 追加エッジケース ─────────────

describe('computeLoadedTypes extended', () => {
  it('directProduce の検出', () => {
    const data = buildTestData({
      directProduce: {
        records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 5000, cost: 3000 }],
      },
    })
    const types = computeLoadedTypes(data)
    expect(types.has('directProduce')).toBe(true)
    expect(types.size).toBe(1)
  })

  it('interStoreIn の検出', () => {
    const data = buildTestData({
      interStoreIn: { records: [makeTransferDayEntry(1, '1')] },
    })
    const types = computeLoadedTypes(data)
    expect(types.has('interStoreIn')).toBe(true)
  })

  it('interStoreOut の検出', () => {
    const data = buildTestData({
      interStoreOut: { records: [makeTransferDayEntry(1, '1')] },
    })
    const types = computeLoadedTypes(data)
    expect(types.has('interStoreOut')).toBe(true)
  })

  it('consumables の検出', () => {
    const data = buildTestData({
      consumables: { records: [makeCostInclusionRecord(1, '1', 500)] },
    })
    const types = computeLoadedTypes(data)
    expect(types.has('consumables')).toBe(true)
  })

  it('全10種別を同時にロード', () => {
    const data = buildTestData({
      purchase: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: '1',
            suppliers: {},
            total: { cost: 100, price: 130 },
          },
        ],
      },
      classifiedSales: { records: [makeCSRecord(1, '1', 10000)] },
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
      budget: new Map([['1', { storeId: '1', total: 6000000, daily: new Map() }]]),
      consumables: { records: [makeCostInclusionRecord(1, '1', 500)] },
      categoryTimeSales: { records: [makeCtsRecord(1, '1')] },
      flowers: {
        records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 10000, cost: 8000 }],
      },
      directProduce: {
        records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 5000, cost: 3000 }],
      },
      interStoreIn: { records: [makeTransferDayEntry(1, '1')] },
      interStoreOut: { records: [makeTransferDayEntry(1, '1')] },
    })
    const types = computeLoadedTypes(data)
    expect(types.size).toBe(10)
    expect(types.has('purchase')).toBe(true)
    expect(types.has('classifiedSales')).toBe(true)
    expect(types.has('initialSettings')).toBe(true)
    expect(types.has('budget')).toBe(true)
    expect(types.has('consumables')).toBe(true)
    expect(types.has('categoryTimeSales')).toBe(true)
    expect(types.has('flowers')).toBe(true)
    expect(types.has('directProduce')).toBe(true)
    expect(types.has('interStoreIn')).toBe(true)
    expect(types.has('interStoreOut')).toBe(true)
  })

  it('空の Map (settings/budget) はロード済みとみなさない', () => {
    const data = buildTestData({
      settings: new Map(),
      budget: new Map(),
    })
    const types = computeLoadedTypes(data)
    expect(types.has('initialSettings')).toBe(false)
    expect(types.has('budget')).toBe(false)
  })

  it('空の records 配列はロード済みとみなさない', () => {
    const data = buildTestData({
      classifiedSales: { records: [] },
      categoryTimeSales: { records: [] },
    })
    const types = computeLoadedTypes(data)
    expect(types.has('classifiedSales')).toBe(false)
    expect(types.has('categoryTimeSales')).toBe(false)
  })

  it('空の records 配列はロード済みとみなさない（全種別）', () => {
    const data = buildTestData({
      purchase: { records: [] },
      flowers: { records: [] },
      directProduce: { records: [] },
      interStoreIn: { records: [] },
      interStoreOut: { records: [] },
      consumables: { records: [] },
    })
    const types = computeLoadedTypes(data)
    expect(types.size).toBe(0)
  })
})

// ─── computeMaxDayByType: 追加エッジケース ────────────

describe('computeMaxDayByType extended', () => {
  it('複数店舗にまたがる仕入データの最大日', () => {
    const data = buildTestData({
      purchase: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 5,
            storeId: '1',
            suppliers: {},
            total: { cost: 100, price: 130 },
          },
          {
            year: 2025,
            month: 1,
            day: 10,
            storeId: '1',
            suppliers: {},
            total: { cost: 200, price: 260 },
          },
          {
            year: 2025,
            month: 1,
            day: 3,
            storeId: '2',
            suppliers: {},
            total: { cost: 300, price: 390 },
          },
          {
            year: 2025,
            month: 1,
            day: 25,
            storeId: '2',
            suppliers: {},
            total: { cost: 400, price: 520 },
          },
        ],
      },
    })
    const result = computeMaxDayByType(data)
    expect(result.get('purchase')).toBe(25)
  })

  it('directProduce の最大日', () => {
    const data = buildTestData({
      directProduce: {
        records: [{ year: 2025, month: 1, day: 12, storeId: '1', price: 5000, cost: 3000 }],
      },
    })
    const result = computeMaxDayByType(data)
    expect(result.get('directProduce')).toBe(12)
  })

  it('interStoreIn の最大日', () => {
    const data = buildTestData({
      interStoreIn: {
        records: [makeTransferDayEntry(7, '1'), makeTransferDayEntry(14, '1')],
      },
    })
    const result = computeMaxDayByType(data)
    expect(result.get('interStoreIn')).toBe(14)
  })

  it('interStoreOut の最大日', () => {
    const data = buildTestData({
      interStoreOut: {
        records: [makeTransferDayEntry(8, '2'), makeTransferDayEntry(22, '2')],
      },
    })
    const result = computeMaxDayByType(data)
    expect(result.get('interStoreOut')).toBe(22)
  })

  it('consumables の最大日', () => {
    const data = buildTestData({
      consumables: {
        records: [makeCostInclusionRecord(3, '1', 500), makeCostInclusionRecord(28, '1', 700)],
      },
    })
    const result = computeMaxDayByType(data)
    expect(result.get('consumables')).toBe(28)
  })

  it('全6種 flat records の最大日を同時取得', () => {
    const data = buildTestData({
      purchase: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 20,
            storeId: '1',
            suppliers: {},
            total: { cost: 100, price: 130 },
          },
        ],
      },
      flowers: {
        records: [{ year: 2025, month: 1, day: 15, storeId: '1', price: 10000, cost: 8000 }],
      },
      directProduce: {
        records: [{ year: 2025, month: 1, day: 10, storeId: '1', price: 5000, cost: 3000 }],
      },
      interStoreIn: { records: [makeTransferDayEntry(5, '1')] },
      interStoreOut: { records: [makeTransferDayEntry(25, '1')] },
      consumables: { records: [makeCostInclusionRecord(18, '1', 500)] },
    })
    const result = computeMaxDayByType(data)
    expect(result.get('purchase')).toBe(20)
    expect(result.get('flowers')).toBe(15)
    expect(result.get('directProduce')).toBe(10)
    expect(result.get('interStoreIn')).toBe(5)
    expect(result.get('interStoreOut')).toBe(25)
    expect(result.get('consumables')).toBe(18)
  })

  it('classifiedSales 単一レコードの最大日', () => {
    const data = buildTestData({
      classifiedSales: { records: [makeCSRecord(7, '1', 10000)] },
    })
    const result = computeMaxDayByType(data)
    expect(result.get('classifiedSales')).toBe(7)
  })

  it('categoryTimeSales 複数レコードの最大日', () => {
    const data = buildTestData({
      categoryTimeSales: {
        records: [makeCtsRecord(3, '1'), makeCtsRecord(9, '2'), makeCtsRecord(22, '1')],
      },
    })
    const result = computeMaxDayByType(data)
    expect(result.get('categoryTimeSales')).toBe(22)
  })

  it('settings と budget は maxDay に含まれない', () => {
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
      budget: new Map([['1', { storeId: '1', total: 6000000, daily: new Map() }]]),
    })
    const result = computeMaxDayByType(data)
    expect(result.has('initialSettings')).toBe(false)
    expect(result.has('budget')).toBe(false)
  })
})

// ─── computeCtsRecordStats: 追加エッジケース ──────────

describe('computeCtsRecordStats extended', () => {
  it('同一店舗・同一日の重複レコード', () => {
    const records = [makeCtsRecord(5, '1'), makeCtsRecord(5, '1'), makeCtsRecord(5, '1')]
    const stats: RecordSetStats = computeCtsRecordStats({ records })
    expect(stats.recordCount).toBe(3)
    expect(stats.storeCount).toBe(1)
    expect(stats.dayRange).toEqual({ min: 5, max: 5 })
  })

  it('多数の店舗を正しくカウント', () => {
    const records = [
      makeCtsRecord(1, '1'),
      makeCtsRecord(1, '2'),
      makeCtsRecord(1, '3'),
      makeCtsRecord(1, '4'),
      makeCtsRecord(1, '5'),
    ]
    const stats = computeCtsRecordStats({ records })
    expect(stats.storeCount).toBe(5)
    expect(stats.recordCount).toBe(5)
  })

  it('日が1日のみで min === max', () => {
    const records = [makeCtsRecord(15, '1'), makeCtsRecord(15, '2')]
    const stats = computeCtsRecordStats({ records })
    expect(stats.dayRange).toEqual({ min: 15, max: 15 })
  })

  it('大きな日の範囲', () => {
    const records = [makeCtsRecord(1, '1'), makeCtsRecord(31, '1')]
    const stats = computeCtsRecordStats({ records })
    expect(stats.dayRange).toEqual({ min: 1, max: 31 })
  })
})

// ─── computeRecordDays: 追加エッジケース ──────────────

describe('computeRecordDays extended', () => {
  it('単一レコード', () => {
    const days = computeRecordDays({ records: [makeCSRecord(10, '1', 5000)] })
    expect(days.size).toBe(1)
    expect(days.has(10)).toBe(true)
  })

  it('全レコード同一日', () => {
    const records = [
      makeCSRecord(7, '1', 10000),
      makeCSRecord(7, '2', 20000),
      makeCSRecord(7, '3', 30000),
    ]
    const days = computeRecordDays({ records })
    expect(days.size).toBe(1)
    expect(days.has(7)).toBe(true)
  })

  it('連続する日のセット', () => {
    const records = [
      makeCSRecord(1, '1', 10000),
      makeCSRecord(2, '1', 20000),
      makeCSRecord(3, '1', 30000),
      makeCSRecord(4, '1', 40000),
      makeCSRecord(5, '1', 50000),
    ]
    const days = computeRecordDays({ records })
    expect(days.size).toBe(5)
    for (let d = 1; d <= 5; d++) {
      expect(days.has(d)).toBe(true)
    }
  })

  it('複数店舗・複数日の重複排除', () => {
    const records = [
      makeCSRecord(1, '1', 10000),
      makeCSRecord(1, '2', 10000),
      makeCSRecord(5, '1', 20000),
      makeCSRecord(5, '3', 20000),
      makeCSRecord(10, '2', 30000),
    ]
    const days = computeRecordDays({ records })
    expect(days.size).toBe(3)
    expect(days.has(1)).toBe(true)
    expect(days.has(5)).toBe(true)
    expect(days.has(10)).toBe(true)
  })
})

// ─── analyzeFlatRecords: 追加エッジケース ──────────

describe('analyzeFlatRecords extended', () => {
  it('label がそのまま返る', () => {
    const result = analyzeFlatRecords(
      [] as SpecialSalesDayEntry[],
      '任意のラベル',
      defaultStoreNames,
    )
    expect(result.label).toBe('任意のラベル')
  })

  it('checkCustomers=false のとき hasCustomers は常に false', () => {
    const records: SpecialSalesDayEntry[] = [
      { year: 2025, month: 1, day: 1, storeId: '1', price: 10000, cost: 8000, customers: 50 },
    ]
    const result = analyzeFlatRecords(records, 'テスト', defaultStoreNames, false)
    expect(result.hasCustomers).toBe(false)
  })

  it('checkCustomers 省略時（デフォルト）は hasCustomers = false', () => {
    const records: SpecialSalesDayEntry[] = [
      { year: 2025, month: 1, day: 1, storeId: '1', price: 10000, cost: 8000, customers: 50 },
    ]
    const result = analyzeFlatRecords(records, 'テスト', defaultStoreNames)
    expect(result.hasCustomers).toBe(false)
  })

  it('customers=0 のとき hasCustomers は false', () => {
    const records: SpecialSalesDayEntry[] = [
      { year: 2025, month: 1, day: 1, storeId: '1', price: 10000, cost: 8000, customers: 0 },
    ]
    const result = analyzeFlatRecords(records, '花', defaultStoreNames, true)
    expect(result.hasCustomers).toBe(false)
  })

  it('複数店舗のうち1つだけ customers ありでも true', () => {
    const records: SpecialSalesDayEntry[] = [
      { year: 2025, month: 1, day: 1, storeId: '1', price: 10000, cost: 8000 },
      { year: 2025, month: 1, day: 1, storeId: '2', price: 10000, cost: 8000, customers: 10 },
    ]
    const result = analyzeFlatRecords(records, '花', defaultStoreNames, true)
    expect(result.hasCustomers).toBe(true)
  })

  it('3店舗の perStore が全て正しい', () => {
    const records: PurchaseDayEntry[] = [
      { year: 2025, month: 1, day: 1, storeId: '1', suppliers: {}, total: { cost: 100, price: 0 } },
      { year: 2025, month: 1, day: 5, storeId: '1', suppliers: {}, total: { cost: 200, price: 0 } },
      {
        year: 2025,
        month: 1,
        day: 10,
        storeId: '1',
        suppliers: {},
        total: { cost: 300, price: 0 },
      },
      { year: 2025, month: 1, day: 3, storeId: '2', suppliers: {}, total: { cost: 400, price: 0 } },
      { year: 2025, month: 1, day: 8, storeId: '2', suppliers: {}, total: { cost: 500, price: 0 } },
      {
        year: 2025,
        month: 1,
        day: 15,
        storeId: '3',
        suppliers: {},
        total: { cost: 600, price: 0 },
      },
    ]
    const result = analyzeFlatRecords(records, '仕入', defaultStoreNames)
    expect(result.storeCount).toBe(3)
    expect(result.totalRecords).toBe(6)
    expect(result.dayRange).toEqual({ min: 1, max: 15 })

    const store1 = result.perStore.find((s) => s.storeId === '1')
    expect(store1).toBeDefined()
    expect(store1?.days).toBe(3)
    expect(store1?.minDay).toBe(1)
    expect(store1?.maxDay).toBe(10)
    expect(store1?.storeName).toBe('店舗A')

    const store2 = result.perStore.find((s) => s.storeId === '2')
    expect(store2).toBeDefined()
    expect(store2?.days).toBe(2)
    expect(store2?.minDay).toBe(3)
    expect(store2?.maxDay).toBe(8)

    const store3 = result.perStore.find((s) => s.storeId === '3')
    expect(store3).toBeDefined()
    expect(store3?.days).toBe(1)
    expect(store3?.minDay).toBe(15)
    expect(store3?.maxDay).toBe(15)
  })

  it('空の records は perStore も空', () => {
    const result = analyzeFlatRecords([] as PurchaseDayEntry[], 'テスト', defaultStoreNames)
    expect(result.storeCount).toBe(0)
    expect(result.perStore).toHaveLength(0)
    expect(result.totalRecords).toBe(0)
  })

  it('複数の不明な店舗IDにフォールバック名が付く', () => {
    const records: PurchaseDayEntry[] = [
      {
        year: 2025,
        month: 1,
        day: 1,
        storeId: '88',
        suppliers: {},
        total: { cost: 100, price: 0 },
      },
      {
        year: 2025,
        month: 1,
        day: 2,
        storeId: '99',
        suppliers: {},
        total: { cost: 200, price: 0 },
      },
    ]
    const result = analyzeFlatRecords(records, 'テスト', defaultStoreNames)
    const names = result.perStore.map((s) => s.storeName)
    expect(names).toContain('店舗88')
    expect(names).toContain('店舗99')
  })

  it('空の storeNames マップでもフォールバック名を使用', () => {
    const records: PurchaseDayEntry[] = [
      { year: 2025, month: 1, day: 1, storeId: '1', suppliers: {}, total: { cost: 100, price: 0 } },
    ]
    const emptyStoreNames = new Map<string, Store>()
    const result = analyzeFlatRecords(records, 'テスト', emptyStoreNames)
    expect(result.perStore[0].storeName).toBe('店舗1')
  })
})

// ─── analyzeClassifiedSales: 追加エッジケース ─────────

describe('analyzeClassifiedSales extended', () => {
  it('label がそのまま返る', () => {
    const data = buildTestData()
    const result = analyzeClassifiedSales(data, 'カスタムラベル', false)
    expect(result.label).toBe('カスタムラベル')
  })

  it('hasCustomers は常に false（classifiedSales は客数未チェック）', () => {
    const data = buildTestData({
      classifiedSales: {
        records: [makeCSRecord(1, '1', 10000), makeCSRecord(5, '2', 20000)],
      },
    })
    const result = analyzeClassifiedSales(data, '売上', false)
    expect(result.hasCustomers).toBe(false)
  })

  it('3店舗の perStore が正しい', () => {
    const data = buildTestData({
      classifiedSales: {
        records: [
          makeCSRecord(1, '1', 10000),
          makeCSRecord(5, '1', 15000),
          makeCSRecord(10, '1', 20000),
          makeCSRecord(3, '2', 12000),
          makeCSRecord(8, '3', 18000),
        ],
      },
    })
    const result = analyzeClassifiedSales(data, '分類別売上', false)
    expect(result.storeCount).toBe(3)
    expect(result.dayRange).toEqual({ min: 1, max: 10 })

    const store1 = result.perStore.find((s) => s.storeId === '1')
    expect(store1).toBeDefined()
    expect(store1?.days).toBe(3)
    expect(store1?.minDay).toBe(1)
    expect(store1?.maxDay).toBe(10)
    expect(store1?.storeName).toBe('店舗A')

    const store2 = result.perStore.find((s) => s.storeId === '2')
    expect(store2?.days).toBe(1)
    expect(store2?.minDay).toBe(3)
    expect(store2?.maxDay).toBe(3)

    const store3 = result.perStore.find((s) => s.storeId === '3')
    expect(store3?.days).toBe(1)
  })

  it('前年データが空で当年データがある場合、isPrevYear=true は空を返す', () => {
    const data = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 10000)] },
      prevYearClassifiedSales: { records: [] },
    })
    const result = analyzeClassifiedSales(data, '前年', true)
    expect(result.storeCount).toBe(0)
    expect(result.totalRecords).toBe(0)
    expect(result.dayRange).toBeNull()
  })

  it('当年データが空で前年データがある場合、isPrevYear=false は空を返す', () => {
    const data = buildTestData({
      classifiedSales: { records: [] },
      prevYearClassifiedSales: { records: [makeCSRecord(5, '2', 8000)] },
    })
    const result = analyzeClassifiedSales(data, '当年', false)
    expect(result.storeCount).toBe(0)
    expect(result.totalRecords).toBe(0)
  })

  it('不明な店舗IDにフォールバック名', () => {
    const data = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '99', 10000)] },
    })
    const result = analyzeClassifiedSales(data, '売上', false)
    expect(result.perStore[0].storeName).toBe('店舗99')
  })

  it('totalRecords はユニーク日の合計（重複排除後）', () => {
    const data = buildTestData({
      classifiedSales: {
        records: [
          // store 1: day 1 が3回、day 5 が1回 → ユニーク日数 = 2
          makeCSRecord(1, '1', 10000),
          makeCSRecord(1, '1', 20000),
          makeCSRecord(1, '1', 30000),
          makeCSRecord(5, '1', 40000),
          // store 2: day 1 が2回 → ユニーク日数 = 1
          makeCSRecord(1, '2', 10000),
          makeCSRecord(1, '2', 20000),
        ],
      },
    })
    const result = analyzeClassifiedSales(data, '売上', false)
    expect(result.storeCount).toBe(2)
    // totalRecords = store1(2) + store2(1) = 3
    expect(result.totalRecords).toBe(3)
  })

  it('前年データの perStore に正しい storeName', () => {
    const data = buildTestData({
      prevYearClassifiedSales: {
        records: [makeCSRecord(1, '1', 5000), makeCSRecord(10, '2', 8000)],
      },
    })
    const result = analyzeClassifiedSales(data, '前年分類別売上', true)
    const store1 = result.perStore.find((s) => s.storeId === '1')
    const store2 = result.perStore.find((s) => s.storeId === '2')
    expect(store1?.storeName).toBe('店舗A')
    expect(store2?.storeName).toBe('店舗B')
  })
})

// ─── buildDataOverview: 追加エッジケース ──────────────

describe('buildDataOverview extended', () => {
  it('返却配列の順序が固定', () => {
    const overview = buildDataOverview(createEmptyImportedData())
    const labels = overview.map((e) => e.label)
    expect(labels).toEqual([
      '仕入',
      '分類別売上',
      '花',
      '産直',
      '店間入',
      '店間出',
      '消耗品',
      '前年分類別売上',
    ])
  })

  it('花の checkCustomers が有効（hasCustomers が反映される）', () => {
    const data = buildTestData({
      flowers: {
        records: [
          { year: 2025, month: 1, day: 1, storeId: '1', price: 10000, cost: 8000, customers: 30 },
        ],
      },
    })
    const overview = buildDataOverview(data)
    const flowersEntry = overview.find((e) => e.label === '花')
    expect(flowersEntry?.hasCustomers).toBe(true)
  })

  it('仕入の checkCustomers はデフォルト（false）', () => {
    const data = buildTestData({
      purchase: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: '1',
            suppliers: {},
            total: { cost: 100, price: 130 },
          },
        ],
      },
    })
    const overview = buildDataOverview(data)
    const purchaseEntry = overview.find((e) => e.label === '仕入')
    expect(purchaseEntry?.hasCustomers).toBe(false)
  })

  it('全種別にデータがある場合の統計', () => {
    const data = buildTestData({
      purchase: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: '1',
            suppliers: {},
            total: { cost: 100, price: 130 },
          },
          {
            year: 2025,
            month: 1,
            day: 5,
            storeId: '2',
            suppliers: {},
            total: { cost: 200, price: 260 },
          },
        ],
      },
      classifiedSales: {
        records: [
          makeCSRecord(1, '1', 10000),
          makeCSRecord(5, '2', 20000),
          makeCSRecord(10, '3', 30000),
        ],
      },
      flowers: {
        records: [{ year: 2025, month: 1, day: 3, storeId: '1', price: 10000, cost: 8000 }],
      },
      directProduce: {
        records: [{ year: 2025, month: 1, day: 7, storeId: '2', price: 5000, cost: 3000 }],
      },
      interStoreIn: { records: [makeTransferDayEntry(2, '1')] },
      interStoreOut: { records: [makeTransferDayEntry(4, '2')] },
      consumables: { records: [makeCostInclusionRecord(6, '1', 500)] },
      prevYearClassifiedSales: {
        records: [makeCSRecord(1, '1', 8000)],
      },
    })
    const overview = buildDataOverview(data)

    const purchaseEntry = overview.find((e) => e.label === '仕入')
    expect(purchaseEntry?.storeCount).toBe(2)
    expect(purchaseEntry?.totalRecords).toBe(2)

    const salesEntry = overview.find((e) => e.label === '分類別売上')
    expect(salesEntry?.storeCount).toBe(3)

    const flowersEntry = overview.find((e) => e.label === '花')
    expect(flowersEntry?.storeCount).toBe(1)
    expect(flowersEntry?.totalRecords).toBe(1)

    const directProduceEntry = overview.find((e) => e.label === '産直')
    expect(directProduceEntry?.storeCount).toBe(1)

    const interStoreInEntry = overview.find((e) => e.label === '店間入')
    expect(interStoreInEntry?.storeCount).toBe(1)

    const interStoreOutEntry = overview.find((e) => e.label === '店間出')
    expect(interStoreOutEntry?.storeCount).toBe(1)

    const consumablesEntry = overview.find((e) => e.label === '消耗品')
    expect(consumablesEntry?.storeCount).toBe(1)

    const prevYearEntry = overview.find((e) => e.label === '前年分類別売上')
    expect(prevYearEntry?.storeCount).toBe(1)
    expect(prevYearEntry?.totalRecords).toBe(1)
  })

  it('stores マップの名前が perStore に反映される', () => {
    const data = buildTestData({
      purchase: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: '1',
            suppliers: {},
            total: { cost: 100, price: 130 },
          },
          {
            year: 2025,
            month: 1,
            day: 5,
            storeId: '2',
            suppliers: {},
            total: { cost: 200, price: 260 },
          },
        ],
      },
    })
    const overview = buildDataOverview(data)
    const purchaseEntry = overview.find((e) => e.label === '仕入')
    const names = purchaseEntry?.perStore.map((s) => s.storeName) ?? []
    expect(names).toContain('店舗A')
    expect(names).toContain('店舗B')
  })

  it('dayRange が各種別ごとに正しい', () => {
    const data = buildTestData({
      purchase: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 3,
            storeId: '1',
            suppliers: {},
            total: { cost: 100, price: 130 },
          },
          {
            year: 2025,
            month: 1,
            day: 20,
            storeId: '1',
            suppliers: {},
            total: { cost: 200, price: 260 },
          },
        ],
      },
      flowers: {
        records: [
          { year: 2025, month: 1, day: 7, storeId: '1', price: 10000, cost: 8000 },
          { year: 2025, month: 1, day: 15, storeId: '1', price: 12000, cost: 9000 },
        ],
      },
    })
    const overview = buildDataOverview(data)
    const purchaseEntry = overview.find((e) => e.label === '仕入')
    expect(purchaseEntry?.dayRange).toEqual({ min: 3, max: 20 })

    const flowersEntry = overview.find((e) => e.label === '花')
    expect(flowersEntry?.dayRange).toEqual({ min: 7, max: 15 })
  })
})
