import { describe, it, expect } from 'vitest'
import {
  createEmptyImportedData,
  processFileData,
} from './ImportService'
import {
  validateImportedData,
  hasValidationErrors,
} from '@/application/usecases/import'
import type { ImportedData } from './ImportService'
import { DEFAULT_SETTINGS } from '@/domain/constants/defaults'

function emptyData(): ImportedData {
  return createEmptyImportedData()
}

describe('processFileData', () => {
  it('仕入データの処理 + 店舗・取引先抽出', () => {
    const rows = [
      ['', '', '', '0000001:取引先A', ''],
      ['', '', '', '0001:店舗A', ''],
      ['header2'],
      ['header3'],
      ['2026-02-01', '', '', 10000, 13000],
    ]
    const { data: result } = processFileData('purchase', rows, 'shiire.xlsx', emptyData(), DEFAULT_SETTINGS)

    expect(result.stores.size).toBe(1)
    expect(result.stores.get('1')?.name).toBe('店舗A')
    expect(result.suppliers.size).toBe(1)
    expect(result.suppliers.get('0000001')?.name).toBe('取引先A')
    expect(result.purchase['1']?.[1]?.total.cost).toBe(10000)
  })

  it('分類別売上データの処理 + 店舗抽出', () => {
    const rows = [
      ['日付', '店舗名称', 'グループ名称', '部門名称', 'ライン名称', 'クラス名称', '販売金額', '71売変', '72売変', '73売変', '74売変'],
      ['2026-02-01', '0001:店舗A', 'G1', 'D1', 'L1', 'C1', 50000, 0, 0, 0, 0],
    ]
    const { data: result } = processFileData('classifiedSales', rows, 'bunruibetsu.xlsx', emptyData(), DEFAULT_SETTINGS)

    expect(result.stores.size).toBe(1)
    expect(result.classifiedSales.records).toHaveLength(1)
    expect(result.classifiedSales.records[0].salesAmount).toBe(50000)
    expect(result.classifiedSales.records[0].storeId).toBe('1')
  })

  it('分類別売上データの売変処理', () => {
    const rows = [
      ['日付', '店舗名称', 'グループ名称', '部門名称', 'ライン名称', 'クラス名称', '販売金額', '71売変', '72売変', '73売変', '74売変'],
      ['2026-02-01', '0001:A', 'G1', 'D1', 'L1', 'C1', 50000, 5000, 0, 0, 0],
    ]
    const { data: result } = processFileData('classifiedSales', rows, 'baihen.xlsx', emptyData(), DEFAULT_SETTINGS)

    expect(result.classifiedSales.records).toHaveLength(1)
    expect(result.classifiedSales.records[0].discount71).toBe(5000)
  })

  it('初期設定の処理', () => {
    const rows = [
      ['header'],
      ['0001', 100000, 120000, 500000],
    ]
    const { data: result } = processFileData('initialSettings', rows, 'settings.xlsx', emptyData(), DEFAULT_SETTINGS)

    expect(result.settings.size).toBe(1)
    expect(result.settings.get('1')?.openingInventory).toBe(100000)
  })

  it('予算データの処理（フラット形式）', () => {
    const rows = [
      ['店舗コード', '日付', '売上予算'],
      ['0001', '2026-02-01', 200000],
    ]
    const { data: result } = processFileData('budget', rows, 'budget.xlsx', emptyData(), DEFAULT_SETTINGS)

    expect(result.budget.size).toBe(1)
    expect(result.budget.get('1')?.total).toBe(200000)
  })

  it('店間入データの処理', () => {
    const rows = [
      ['header'],
      ['0001', '2026-02-01', '0002', 10000, 13000],
    ]
    const { data: result } = processFileData('interStoreIn', rows, 'tenkaniri.xlsx', emptyData(), DEFAULT_SETTINGS)

    expect(result.interStoreIn['1']?.[1]?.interStoreIn).toHaveLength(1)
  })

  it('店間出データの処理（Col0=日付, Col1=出庫元）', () => {
    const rows = [
      ['header'],
      ['2026-02-01', '0001', '0002', '001', 10000, 13000],
    ]
    const { data: result } = processFileData('interStoreOut', rows, 'tenkandashi.xlsx', emptyData(), DEFAULT_SETTINGS)

    expect(result.interStoreOut['1']?.[1]?.interStoreOut).toHaveLength(1)
  })

  it('花データの処理（掛け率0.80）', () => {
    const rows = [
      ['', '', '', '0001:A', ''],
      [''], [''],
      ['2026-02-01', '', '', 10000, ''],
    ]
    const { data: result } = processFileData('flowers', rows, 'hana.xlsx', emptyData(), DEFAULT_SETTINGS)

    expect(result.flowers['1']?.[1]?.cost).toBe(8000) // 10000 × 0.80
  })

  it('産直データの処理（掛け率0.85）', () => {
    const rows = [
      ['', '', '', '0001:A', ''],
      [''], [''],
      ['2026-02-01', '', '', 10000, ''],
    ]
    const { data: result } = processFileData('directProduce', rows, 'sanchoku.xlsx', emptyData(), DEFAULT_SETTINGS)

    expect(result.directProduce['1']?.[1]?.cost).toBe(8500) // 10000 × 0.85
  })

  it('分類別売上データ複数レコードの処理', () => {
    const rows = [
      ['日付', '店舗名称', 'グループ名称', '部門名称', 'ライン名称', 'クラス名称', '販売金額', '71売変', '72売変', '73売変', '74売変'],
      ['2026-02-01', '0001:店舗A', 'G1', 'D1', 'L1', 'C1', 50000, 3000, 0, 0, 0],
      ['2026-02-01', '0001:店舗A', 'G2', 'D2', 'L2', 'C2', 30000, 1000, 0, 0, 0],
    ]
    const { data: result } = processFileData('classifiedSales', rows, '1_売上売変.xlsx', emptyData(), DEFAULT_SETTINGS)

    expect(result.stores.size).toBe(1)
    expect(result.classifiedSales.records).toHaveLength(2)
    expect(result.classifiedSales.records[0].salesAmount).toBe(50000)
    expect(result.classifiedSales.records[0].discount71).toBe(3000)
    expect(result.classifiedSales.records[1].salesAmount).toBe(30000)
  })

  it('分類別売上の後に予算を取り込んでもデータが維持される', () => {
    const csRows = [
      ['日付', '店舗名称', 'グループ名称', '部門名称', 'ライン名称', 'クラス名称', '販売金額', '71売変', '72売変', '73売変', '74売変'],
      ['2026-02-01', '0001:店舗A', 'G1', 'D1', 'L1', 'C1', 50000, 3000, 0, 0, 0],
    ]
    const budgetRows = [
      ['店舗コード', '日付', '売上予算'],
      ['0001', '2026-02-01', 200000],
    ]

    let { data: result } = processFileData('classifiedSales', csRows, '1_売上売変.xlsx', emptyData(), DEFAULT_SETTINGS)
    ;({ data: result } = processFileData('budget', budgetRows, '0_売上予算.xlsx', result, DEFAULT_SETTINGS))

    // 分類別売上データが維持されること
    expect(result.classifiedSales.records).toHaveLength(1)
    expect(result.classifiedSales.records[0].salesAmount).toBe(50000)
    expect(result.classifiedSales.records[0].discount71).toBe(3000)
    // 予算も追加されること
    expect(result.budget.get('1')?.total).toBe(200000)
  })

  it('消耗品データの処理（マージモード）', () => {
    const rows1 = [
      ['header'],
      ['81257', 'A001', '洗剤', 10, 5000, '2026-02-01'],
    ]
    const rows2 = [
      ['header'],
      ['81257', 'A002', 'ゴミ袋', 5, 3000, '2026-02-01'],
    ]
    let { data: result } = processFileData('consumables', rows1, '01_file1.xlsx', emptyData(), DEFAULT_SETTINGS)
    ;({ data: result } = processFileData('consumables', rows2, '01_file2.xlsx', result, DEFAULT_SETTINGS))

    expect(result.consumables['1']?.[1]?.cost).toBe(8000)
    expect(result.consumables['1']?.[1]?.items).toHaveLength(2)
  })

  it('既存の店舗データを維持して追加', () => {
    const base = emptyData()
    const purchaseRows = [
      ['', '', '', '0000001:取引先A', ''],
      ['', '', '', '0001:店舗A', ''],
      [''], [''],
      ['2026-02-01', '', '', 1000, 1300],
    ]
    const csRows = [
      ['日付', '店舗名称', 'グループ名称', '部門名称', 'ライン名称', 'クラス名称', '販売金額', '71売変', '72売変', '73売変', '74売変'],
      ['2026-02-01', '0002:店舗B', 'G1', 'D1', 'L1', 'C1', 50000, 0, 0, 0, 0],
    ]

    let { data: result } = processFileData('purchase', purchaseRows, 'shiire.xlsx', base, DEFAULT_SETTINGS)
    ;({ data: result } = processFileData('classifiedSales', csRows, 'bunruibetsu.xlsx', result, DEFAULT_SETTINGS))

    expect(result.stores.size).toBe(2)
    expect(result.stores.has('1')).toBe(true)
    expect(result.stores.has('2')).toBe(true)
  })

  it('分類別売上データから年月を自動検出する', () => {
    const rows = [
      ['日付', '店舗名称', 'グループ名称', '部門名称', 'ライン名称', 'クラス名称', '販売金額', '71売変', '72売変', '73売変', '74売変'],
      ['2026年01月15日', '0001:店舗A', 'G1', 'D1', 'L1', 'C1', 50000, 0, 0, 0, 0],
    ]
    const { detectedYearMonth } = processFileData('classifiedSales', rows, 'bunruibetsu.xlsx', emptyData(), DEFAULT_SETTINGS)

    expect(detectedYearMonth).toEqual({ year: 2026, month: 1 })
  })
})

describe('validateImportedData', () => {
  it('仕入・分類別売上の両方が必須', () => {
    const messages = validateImportedData(emptyData())
    const errors = messages.filter((m) => m.level === 'error')
    expect(errors).toHaveLength(2)
    expect(errors[0].message).toContain('仕入')
    expect(errors[1].message).toContain('分類別売上')
  })

  it('仕入・分類別売上がある場合はエラーなし', () => {
    const data: ImportedData = {
      ...emptyData(),
      purchase: { '1': { 1: { suppliers: {}, total: { cost: 100, price: 130 } } } },
      classifiedSales: {
        records: [{
          year: 2026, month: 2, day: 1, storeId: '1', storeName: 'Store 1',
          groupName: 'G', departmentName: 'D', lineName: 'L', className: 'C',
          salesAmount: 50000, discount71: 0, discount72: 0, discount73: 0, discount74: 0,
        }],
      },
      stores: new Map([['1', { id: '1', code: '0001', name: 'A' }]]),
      settings: new Map([['1', { storeId: '1', openingInventory: 100, closingInventory: 100, grossProfitBudget: null }]]),
    }
    const messages = validateImportedData(data)
    const errors = messages.filter((m) => m.level === 'error')
    expect(errors).toHaveLength(0)
  })

  it('在庫設定なしは警告', () => {
    const data: ImportedData = {
      ...emptyData(),
      purchase: { '1': { 1: { suppliers: {}, total: { cost: 100, price: 130 } } } },
      classifiedSales: {
        records: [{
          year: 2026, month: 2, day: 1, storeId: '1', storeName: 'Store 1',
          groupName: 'G', departmentName: 'D', lineName: 'L', className: 'C',
          salesAmount: 50000, discount71: 0, discount72: 0, discount73: 0, discount74: 0,
        }],
      },
      stores: new Map([['1', { id: '1', code: '0001', name: 'A' }]]),
    }
    const messages = validateImportedData(data)
    const warnings = messages.filter((m) => m.level === 'warning')
    expect(warnings.some((w) => w.message.includes('在庫設定'))).toBe(true)
  })

  it('予算・売変なしは情報メッセージ', () => {
    const data: ImportedData = {
      ...emptyData(),
      purchase: { '1': { 1: { suppliers: {}, total: { cost: 100, price: 130 } } } },
      classifiedSales: {
        records: [{
          year: 2026, month: 2, day: 1, storeId: '1', storeName: 'Store 1',
          groupName: 'G', departmentName: 'D', lineName: 'L', className: 'C',
          salesAmount: 50000, discount71: 0, discount72: 0, discount73: 0, discount74: 0,
        }],
      },
      stores: new Map([['1', { id: '1', code: '0001', name: 'A' }]]),
      settings: new Map([['1', { storeId: '1', openingInventory: 100, closingInventory: 100, grossProfitBudget: null }]]),
    }
    const messages = validateImportedData(data)
    const infos = messages.filter((m) => m.level === 'info')
    expect(infos.some((i) => i.message.includes('予算'))).toBe(true)
    expect(infos.some((i) => i.message.includes('売変'))).toBe(true)
  })

  it('一部店舗の在庫設定不足は警告', () => {
    const data: ImportedData = {
      ...emptyData(),
      purchase: { '1': { 1: { suppliers: {}, total: { cost: 100, price: 130 } } } },
      classifiedSales: {
        records: [{
          year: 2026, month: 2, day: 1, storeId: '1', storeName: 'Store 1',
          groupName: 'G', departmentName: 'D', lineName: 'L', className: 'C',
          salesAmount: 50000, discount71: 0, discount72: 0, discount73: 0, discount74: 0,
        }],
      },
      stores: new Map([
        ['1', { id: '1', code: '0001', name: 'A' }],
        ['2', { id: '2', code: '0002', name: 'B' }],
      ]),
      settings: new Map([['1', { storeId: '1', openingInventory: 100, closingInventory: 100, grossProfitBudget: null }]]),
    }
    const messages = validateImportedData(data)
    const warnings = messages.filter((m) => m.level === 'warning')
    expect(warnings.some((w) => w.message.includes('1/2'))).toBe(true)
  })
})

describe('hasValidationErrors', () => {
  it('エラーありの場合 true', () => {
    expect(hasValidationErrors([{ level: 'error', message: 'err' }])).toBe(true)
  })

  it('警告のみの場合 false', () => {
    expect(hasValidationErrors([{ level: 'warning', message: 'warn' }])).toBe(false)
  })

  it('空の場合 false', () => {
    expect(hasValidationErrors([])).toBe(false)
  })
})
