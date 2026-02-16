import { describe, it, expect } from 'vitest'
import {
  createEmptyImportedData,
  processFileData,
  validateImportedData,
  hasValidationErrors,
} from './ImportService'
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
    const result = processFileData('purchase', rows, 'shiire.xlsx', emptyData(), DEFAULT_SETTINGS)

    expect(result.stores.size).toBe(1)
    expect(result.stores.get('1')?.name).toBe('店舗A')
    expect(result.suppliers.size).toBe(1)
    expect(result.suppliers.get('0000001')?.name).toBe('取引先A')
    expect(result.purchase['1']?.[1]?.total.cost).toBe(10000)
  })

  it('売上データの処理 + 店舗抽出', () => {
    const rows = [
      ['', '', '', '0001:店舗A', ''],
      ['header1'],
      ['header2'],
      ['2026-02-01', '', '', 50000, ''],
    ]
    const result = processFileData('sales', rows, 'uriage.xlsx', emptyData(), DEFAULT_SETTINGS)

    expect(result.stores.size).toBe(1)
    expect(result.sales['1']?.[1]?.sales).toBe(50000)
  })

  it('売変データの処理', () => {
    const rows = [
      ['', '', '', '0001:A', ''],
      ['header1'],
      ['2026-02-01', '', '', 50000, 5000],
    ]
    const result = processFileData('discount', rows, 'baihen.xlsx', emptyData(), DEFAULT_SETTINGS)

    expect(result.discount['1']?.[1]?.discount).toBe(5000)
  })

  it('初期設定の処理', () => {
    const rows = [
      ['header'],
      ['0001', 100000, 120000, 500000],
    ]
    const result = processFileData('initialSettings', rows, 'settings.xlsx', emptyData(), DEFAULT_SETTINGS)

    expect(result.settings.size).toBe(1)
    expect(result.settings.get('1')?.openingInventory).toBe(100000)
  })

  it('予算データの処理', () => {
    const rows = [
      ['header'],
      ['0001', '2026-02-01', 200000],
    ]
    const result = processFileData('budget', rows, 'budget.xlsx', emptyData(), DEFAULT_SETTINGS)

    expect(result.budget.size).toBe(1)
    expect(result.budget.get('1')?.total).toBe(200000)
  })

  it('店間入データの処理', () => {
    const rows = [
      ['header'],
      ['0001', '2026-02-01', '0002', 10000, 13000],
    ]
    const result = processFileData('interStoreIn', rows, 'tenkaniri.xlsx', emptyData(), DEFAULT_SETTINGS)

    expect(result.interStoreIn['1']?.[1]?.interStoreIn).toHaveLength(1)
  })

  it('店間出データの処理', () => {
    const rows = [
      ['header'],
      ['2026-02-01', '0001', '0002', '001', 10000, 13000],
    ]
    const result = processFileData('interStoreOut', rows, 'tenkandashi.xlsx', emptyData(), DEFAULT_SETTINGS)

    expect(result.interStoreOut['1']?.[1]?.interStoreOut).toHaveLength(1)
  })

  it('花データの処理（掛け率0.80）', () => {
    const rows = [
      ['', '', '', '0001:A', ''],
      [''], [''],
      ['2026-02-01', '', '', 10000, ''],
    ]
    const result = processFileData('flowers', rows, 'hana.xlsx', emptyData(), DEFAULT_SETTINGS)

    expect(result.flowers['1']?.[1]?.cost).toBe(8000) // 10000 × 0.80
  })

  it('産直データの処理（掛け率0.85）', () => {
    const rows = [
      ['', '', '', '0001:A', ''],
      [''], [''],
      ['2026-02-01', '', '', 10000, ''],
    ]
    const result = processFileData('directProduce', rows, 'sanchoku.xlsx', emptyData(), DEFAULT_SETTINGS)

    expect(result.directProduce['1']?.[1]?.cost).toBe(8500) // 10000 × 0.85
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
    let result = processFileData('consumables', rows1, '01_file1.xlsx', emptyData(), DEFAULT_SETTINGS)
    result = processFileData('consumables', rows2, '01_file2.xlsx', result, DEFAULT_SETTINGS)

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
    const salesRows = [
      ['', '', '', '0002:店舗B', ''],
      [''], [''],
      ['2026-02-01', '', '', 50000, ''],
    ]

    let result = processFileData('purchase', purchaseRows, 'shiire.xlsx', base, DEFAULT_SETTINGS)
    result = processFileData('sales', salesRows, 'uriage.xlsx', result, DEFAULT_SETTINGS)

    expect(result.stores.size).toBe(2)
    expect(result.stores.has('1')).toBe(true)
    expect(result.stores.has('2')).toBe(true)
  })
})

describe('validateImportedData', () => {
  it('仕入・売上の両方が必須', () => {
    const messages = validateImportedData(emptyData())
    const errors = messages.filter((m) => m.level === 'error')
    expect(errors).toHaveLength(2)
    expect(errors[0].message).toContain('仕入')
    expect(errors[1].message).toContain('売上')
  })

  it('仕入・売上がある場合はエラーなし', () => {
    const data: ImportedData = {
      ...emptyData(),
      purchase: { '1': { 1: { suppliers: {}, total: { cost: 100, price: 130 } } } },
      sales: { '1': { 1: { sales: 50000 } } },
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
      sales: { '1': { 1: { sales: 50000 } } },
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
      sales: { '1': { 1: { sales: 50000 } } },
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
      sales: { '1': { 1: { sales: 50000 } } },
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
