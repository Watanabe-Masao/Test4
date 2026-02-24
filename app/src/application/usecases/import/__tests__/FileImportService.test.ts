import { describe, it, expect } from 'vitest'
import { validateImportedData, hasValidationErrors, extractRecordMonths, filterDataForMonth } from '../FileImportService'
import { createEmptyImportedData } from '@/domain/models'
import type { ImportedData } from '@/domain/models'
import type { ImportSummary } from '../FileImportService'

function makeData(overrides: Partial<ImportedData> = {}): ImportedData {
  return { ...createEmptyImportedData(), ...overrides }
}

function makeCSRecord(day: number, storeId: string, salesAmount: number, d71 = 0) {
  return {
    year: 2025, month: 1, day, storeId, storeName: `Store ${storeId}`,
    groupName: 'G1', departmentName: 'D1', lineName: 'L1', className: 'C1',
    salesAmount, discount71: d71, discount72: 0, discount73: 0, discount74: 0,
  }
}

function fullData(): ImportedData {
  return makeData({
    stores: new Map([
      ['1', { id: '1', code: '0001', name: '店舗A' }],
      ['2', { id: '2', code: '0002', name: '店舗B' }],
    ]),
    purchase: {
      '1': { 1: { suppliers: {}, total: { cost: 100, price: 130 } } },
      '2': { 1: { suppliers: {}, total: { cost: 200, price: 260 } } },
    },
    classifiedSales: {
      records: [
        makeCSRecord(1, '1', 50000, 3000),
        makeCSRecord(1, '2', 40000),
      ],
    },
    settings: new Map([
      ['1', { storeId: '1', openingInventory: 100000, closingInventory: 120000, grossProfitBudget: null }],
      ['2', { storeId: '2', openingInventory: 80000, closingInventory: 90000, grossProfitBudget: null }],
    ]),
    budget: new Map([
      ['1', { storeId: '1', daily: new Map([[1, 200000]]), total: 200000 }],
    ]),
  })
}

describe('validateImportedData', () => {
  it('空データは仕入・売上エラー', () => {
    const messages = validateImportedData(makeData())
    const errors = messages.filter((m) => m.level === 'error')
    expect(errors.length).toBe(2)
    expect(errors[0].message).toContain('仕入')
    expect(errors[1].message).toContain('分類別売上')
  })

  it('完全なデータではエラーなし', () => {
    const messages = validateImportedData(fullData())
    const errors = messages.filter((m) => m.level === 'error')
    expect(errors).toHaveLength(0)
  })

  it('店舗0件は警告', () => {
    const data = makeData({
      purchase: { '1': { 1: { suppliers: {}, total: { cost: 100, price: 130 } } } },
      classifiedSales: { records: [makeCSRecord(1, '1', 50000)] },
    })
    const messages = validateImportedData(data)
    expect(messages.some((m) => m.level === 'warning' && m.message.includes('店舗'))).toBe(true)
  })

  it('在庫設定なしは警告', () => {
    const data = makeData({
      stores: new Map([['1', { id: '1', code: '0001', name: '店舗A' }]]),
      purchase: { '1': { 1: { suppliers: {}, total: { cost: 100, price: 130 } } } },
      classifiedSales: { records: [makeCSRecord(1, '1', 50000)] },
    })
    const messages = validateImportedData(data)
    expect(messages.some((m) => m.level === 'warning' && m.message.includes('在庫設定'))).toBe(true)
  })

  it('一部店舗の在庫設定不足は件数入り警告', () => {
    const data = makeData({
      stores: new Map([
        ['1', { id: '1', code: '0001', name: '店舗A' }],
        ['2', { id: '2', code: '0002', name: '店舗B' }],
        ['3', { id: '3', code: '0003', name: '店舗C' }],
      ]),
      purchase: { '1': { 1: { suppliers: {}, total: { cost: 100, price: 130 } } } },
      classifiedSales: { records: [makeCSRecord(1, '1', 50000)] },
      settings: new Map([
        ['1', { storeId: '1', openingInventory: 100000, closingInventory: 120000, grossProfitBudget: null }],
      ]),
    })
    const messages = validateImportedData(data)
    const warning = messages.find((m) => m.level === 'warning' && m.message.includes('1/3'))
    expect(warning).toBeTruthy()
  })

  it('予算なしは情報メッセージ', () => {
    const data = makeData({
      stores: new Map([['1', { id: '1', code: '0001', name: '店舗A' }]]),
      purchase: { '1': { 1: { suppliers: {}, total: { cost: 100, price: 130 } } } },
      classifiedSales: { records: [makeCSRecord(1, '1', 50000)] },
      settings: new Map([
        ['1', { storeId: '1', openingInventory: 100000, closingInventory: 120000, grossProfitBudget: null }],
      ]),
    })
    const messages = validateImportedData(data)
    expect(messages.some((m) => m.level === 'info' && m.message.includes('予算'))).toBe(true)
  })

  it('売変なしは情報メッセージ', () => {
    const data = makeData({
      stores: new Map([['1', { id: '1', code: '0001', name: '店舗A' }]]),
      purchase: { '1': { 1: { suppliers: {}, total: { cost: 100, price: 130 } } } },
      classifiedSales: { records: [makeCSRecord(1, '1', 50000)] },
      settings: new Map([
        ['1', { storeId: '1', openingInventory: 100000, closingInventory: 120000, grossProfitBudget: null }],
      ]),
    })
    const messages = validateImportedData(data)
    expect(messages.some((m) => m.level === 'info' && m.message.includes('売変'))).toBe(true)
  })

  it('ImportSummary 付きで失敗ファイルがエラー表示される', () => {
    const summary: ImportSummary = {
      results: [
        { ok: false, filename: 'bad.csv', type: null, typeName: null, error: '読み込みエラー' },
        { ok: true, filename: 'good.xlsx', type: 'classifiedSales', typeName: '分類別売上' },
      ],
      successCount: 1,
      failureCount: 1,
    }
    const messages = validateImportedData(fullData(), summary)
    expect(messages.some((m) => m.level === 'error' && m.message.includes('1件'))).toBe(true)
  })

  it('ImportSummary 付きで成功サマリーが情報表示される', () => {
    const summary: ImportSummary = {
      results: [
        { ok: true, filename: 'uriage.xlsx', type: 'classifiedSales', typeName: '分類別売上', rowCount: 31 },
      ],
      successCount: 1,
      failureCount: 0,
    }
    const messages = validateImportedData(fullData(), summary)
    expect(messages.some((m) => m.level === 'info' && m.message.includes('1件'))).toBe(true)
  })

  it('スキップされた行がある場合は警告表示', () => {
    const summary: ImportSummary = {
      results: [
        {
          ok: true,
          filename: 'uriage.xlsx',
          type: 'classifiedSales',
          typeName: '分類別売上',
          skippedRows: ['行5: 日付不正', '行8: 値不正'],
        },
      ],
      successCount: 1,
      failureCount: 0,
    }
    const messages = validateImportedData(fullData(), summary)
    expect(messages.some((m) => m.level === 'warning' && m.message.includes('スキップ'))).toBe(true)
  })

  it('スキップされたファイルは警告', () => {
    const summary: ImportSummary = {
      results: [],
      successCount: 0,
      failureCount: 0,
      skippedFiles: ['readme.txt', 'image.png'],
    }
    const messages = validateImportedData(fullData(), summary)
    expect(messages.some((m) => m.level === 'warning' && m.message.includes('2件'))).toBe(true)
  })
})

describe('hasValidationErrors', () => {
  it('error レベルがあれば true', () => {
    expect(hasValidationErrors([
      { level: 'info', message: 'ok' },
      { level: 'error', message: 'ng' },
    ])).toBe(true)
  })

  it('warning のみは false', () => {
    expect(hasValidationErrors([
      { level: 'warning', message: 'warn' },
      { level: 'info', message: 'info' },
    ])).toBe(false)
  })

  it('空配列は false', () => {
    expect(hasValidationErrors([])).toBe(false)
  })
})

// ─── Multi-month utilities ──────────────────────────────────

describe('extractRecordMonths', () => {
  it('空データは空配列を返す', () => {
    expect(extractRecordMonths(makeData())).toEqual([])
  })

  it('classifiedSales レコードから年月を抽出する', () => {
    const data = makeData({
      classifiedSales: {
        records: [
          makeCSRecord(1, '1', 10000),
          makeCSRecord(2, '1', 20000),
        ],
      },
    })
    expect(extractRecordMonths(data)).toEqual([{ year: 2025, month: 1 }])
  })

  it('複数月のレコードを年月昇順で返す', () => {
    const data = makeData({
      classifiedSales: {
        records: [
          { ...makeCSRecord(1, '1', 50000), year: 2025, month: 2 },
          { ...makeCSRecord(1, '1', 30000), year: 2025, month: 1 },
          { ...makeCSRecord(2, '1', 40000), year: 2025, month: 2 },
          { ...makeCSRecord(1, '1', 20000), year: 2026, month: 1 },
        ],
      },
    })
    const months = extractRecordMonths(data)
    expect(months).toEqual([
      { year: 2025, month: 1 },
      { year: 2025, month: 2 },
      { year: 2026, month: 1 },
    ])
  })

  it('categoryTimeSales のレコードも年月として認識する', () => {
    const data = makeData({
      categoryTimeSales: {
        records: [
          {
            year: 2025, month: 3, day: 1, storeId: '1',
            department: { code: '001', name: 'D' }, line: { code: '01', name: 'L' },
            klass: { code: '001', name: 'C' }, timeSlots: [], totalQuantity: 10, totalAmount: 5000,
          },
        ],
      },
    })
    expect(extractRecordMonths(data)).toEqual([{ year: 2025, month: 3 }])
  })
})

describe('filterDataForMonth', () => {
  it('指定月の classifiedSales レコードのみを返す', () => {
    const data = makeData({
      classifiedSales: {
        records: [
          { ...makeCSRecord(1, '1', 10000), year: 2025, month: 1 },
          { ...makeCSRecord(1, '1', 20000), year: 2025, month: 2 },
          { ...makeCSRecord(2, '1', 30000), year: 2025, month: 1 },
        ],
      },
    })
    const filtered = filterDataForMonth(data, 2025, 1)
    expect(filtered.classifiedSales.records).toHaveLength(2)
    expect(filtered.classifiedSales.records.every((r) => r.month === 1)).toBe(true)
  })

  it('非レコードデータはそのまま維持される', () => {
    const stores = new Map([['1', { id: '1', code: '0001', name: 'A' }]])
    const data = makeData({
      stores,
      purchase: { '1': { 1: { suppliers: {}, total: { cost: 100, price: 130 } } } },
      classifiedSales: {
        records: [
          { ...makeCSRecord(1, '1', 10000), year: 2025, month: 1 },
          { ...makeCSRecord(1, '1', 20000), year: 2025, month: 2 },
        ],
      },
    })
    const filtered = filterDataForMonth(data, 2025, 2)
    expect(filtered.classifiedSales.records).toHaveLength(1)
    expect(filtered.classifiedSales.records[0].month).toBe(2)
    // 非レコードデータは維持
    expect(filtered.stores.size).toBe(1)
    expect(filtered.purchase['1']?.[1]?.total.cost).toBe(100)
  })

  it('該当月レコードがない場合は空配列を返す', () => {
    const data = makeData({
      classifiedSales: {
        records: [{ ...makeCSRecord(1, '1', 10000), year: 2025, month: 1 }],
      },
    })
    const filtered = filterDataForMonth(data, 2025, 3)
    expect(filtered.classifiedSales.records).toHaveLength(0)
  })
})
