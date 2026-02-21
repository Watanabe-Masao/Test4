import { describe, it, expect } from 'vitest'
import { mergeInsertsOnly } from './useImport'
import { createEmptyImportedData } from '@/domain/models'
import type { ImportedData } from '@/domain/models'

function makeData(overrides: Partial<ImportedData> = {}): ImportedData {
  return { ...createEmptyImportedData(), ...overrides }
}

describe('mergeInsertsOnly', () => {
  it('既存が空の場合、新規データがそのまま使われる', () => {
    const existing = makeData()
    const incoming = makeData({
      sales: { '1': { 1: { sales: 50000 } } },
    })

    const result = mergeInsertsOnly(existing, incoming, new Set(['sales']))

    expect(result.sales).toEqual({ '1': { 1: { sales: 50000 } } })
  })

  it('新規が空の場合、既存データが維持される', () => {
    const existing = makeData({
      sales: { '1': { 1: { sales: 50000 } } },
    })
    const incoming = makeData()

    const result = mergeInsertsOnly(existing, incoming, new Set(['sales']))

    expect(result.sales).toEqual({ '1': { 1: { sales: 50000 } } })
  })

  it('既存にある日のデータは変更されない', () => {
    const existing = makeData({
      sales: { '1': { 1: { sales: 50000 } } },
    })
    const incoming = makeData({
      sales: { '1': { 1: { sales: 99999 } } },
    })

    const result = mergeInsertsOnly(existing, incoming, new Set(['sales']))

    // 既存の値が維持される
    expect(result.sales['1']?.[1]?.sales).toBe(50000)
  })

  it('既存にない日のデータは挿入される', () => {
    const existing = makeData({
      sales: { '1': { 1: { sales: 50000 } } },
    })
    const incoming = makeData({
      sales: { '1': { 2: { sales: 60000 } } },
    })

    const result = mergeInsertsOnly(existing, incoming, new Set(['sales']))

    expect(result.sales['1']?.[1]?.sales).toBe(50000) // 既存維持
    expect(result.sales['1']?.[2]?.sales).toBe(60000) // 新規挿入
  })

  it('既存にない店舗は新規挿入される', () => {
    const existing = makeData({
      sales: { '1': { 1: { sales: 50000 } } },
    })
    const incoming = makeData({
      sales: { '2': { 1: { sales: 40000 } } },
    })

    const result = mergeInsertsOnly(existing, incoming, new Set(['sales']))

    expect(result.sales['1']?.[1]?.sales).toBe(50000)
    expect(result.sales['2']?.[1]?.sales).toBe(40000)
  })

  it('インポートされていないデータ種別は変更されない', () => {
    const existing = makeData({
      sales: { '1': { 1: { sales: 50000 } } },
      discount: { '1': { 1: { sales: 50000, discount: 3000 } } },
    })
    const incoming = makeData({
      sales: { '1': { 1: { sales: 99999 }, 2: { sales: 60000 } } },
      discount: { '1': { 1: { sales: 99999, discount: 9999 } } },
    })

    // sales のみインポート
    const result = mergeInsertsOnly(existing, incoming, new Set(['sales']))

    // sales は挿入のみマージ
    expect(result.sales['1']?.[1]?.sales).toBe(50000) // 既存維持
    expect(result.sales['1']?.[2]?.sales).toBe(60000) // 新規挿入
    // discount は変更なし
    expect(result.discount['1']?.[1]?.discount).toBe(3000)
  })

  it('stores の新規店舗は追加されるが既存は維持', () => {
    const existing = makeData({
      stores: new Map([['1', { id: '1', code: '0001', name: '店舗A' }]]),
    })
    const incoming = makeData({
      stores: new Map([
        ['1', { id: '1', code: '0001', name: '変更後の名前' }],
        ['2', { id: '2', code: '0002', name: '店舗B' }],
      ]),
    })

    const result = mergeInsertsOnly(existing, incoming, new Set(['sales']))

    expect(result.stores.size).toBe(2)
    expect(result.stores.get('1')?.name).toBe('店舗A') // 既存維持
    expect(result.stores.get('2')?.name).toBe('店舗B') // 新規追加
  })

  it('suppliers の新規取引先は追加されるが既存は維持', () => {
    const existing = makeData({
      suppliers: new Map([['0000001', { code: '0000001', name: '取引先A' }]]),
    })
    const incoming = makeData({
      suppliers: new Map([
        ['0000001', { code: '0000001', name: '変更名' }],
        ['0000002', { code: '0000002', name: '取引先B' }],
      ]),
    })

    const result = mergeInsertsOnly(existing, incoming, new Set(['purchase']))

    expect(result.suppliers.size).toBe(2)
    expect(result.suppliers.get('0000001')?.name).toBe('取引先A') // 既存維持
    expect(result.suppliers.get('0000002')?.name).toBe('取引先B') // 新規追加
  })

  it('departmentKpi は既存deptCodeを維持し新規のみ追加', () => {
    const existing = makeData({
      departmentKpi: {
        records: [{ deptCode: '01', deptName: '青果', gpRateBudget: 30, gpRateActual: 28, gpRateVariance: -2, markupRate: 35, discountRate: 5, salesBudget: 100000, salesActual: 90000, salesVariance: -10000, salesAchievement: 90, openingInventory: 50000, closingInventory: 45000, gpRateLanding: 29, salesLanding: 95000 }],
      },
    })
    const incoming = makeData({
      departmentKpi: {
        records: [
          { deptCode: '01', deptName: '青果（変更）', gpRateBudget: 99, gpRateActual: 99, gpRateVariance: 0, markupRate: 99, discountRate: 0, salesBudget: 0, salesActual: 0, salesVariance: 0, salesAchievement: 0, openingInventory: 0, closingInventory: 0, gpRateLanding: 0, salesLanding: 0 },
          { deptCode: '02', deptName: '鮮魚', gpRateBudget: 25, gpRateActual: 24, gpRateVariance: -1, markupRate: 30, discountRate: 4, salesBudget: 80000, salesActual: 75000, salesVariance: -5000, salesAchievement: 93.75, openingInventory: 30000, closingInventory: 28000, gpRateLanding: 25, salesLanding: 78000 },
        ],
      },
    })

    const result = mergeInsertsOnly(existing, incoming, new Set(['departmentKpi']))

    expect(result.departmentKpi.records).toHaveLength(2)
    expect(result.departmentKpi.records[0].deptName).toBe('青果') // 既存維持
    expect(result.departmentKpi.records[1].deptCode).toBe('02')   // 新規追加
  })

  it('settings（在庫設定）は既存を維持し新規店舗のみ追加', () => {
    const existing = makeData({
      settings: new Map([['1', { openingCost: 100, openingPrice: 150 }]]),
    })
    const incoming = makeData({
      settings: new Map([
        ['1', { openingCost: 999, openingPrice: 999 }],
        ['2', { openingCost: 200, openingPrice: 300 }],
      ]),
    })

    const result = mergeInsertsOnly(existing, incoming, new Set(['initialSettings']))

    expect(result.settings.size).toBe(2)
    expect(result.settings.get('1')?.openingCost).toBe(100) // 既存維持
    expect(result.settings.get('2')?.openingCost).toBe(200) // 新規追加
  })

  it('budget は既存を維持し新規店舗のみ追加', () => {
    const existing = makeData({
      budget: new Map([['1', { monthlySales: 1000000, daily: new Map() }]]),
    })
    const incoming = makeData({
      budget: new Map([
        ['1', { monthlySales: 9999999, daily: new Map() }],
        ['2', { monthlySales: 2000000, daily: new Map() }],
      ]),
    })

    const result = mergeInsertsOnly(existing, incoming, new Set(['budget']))

    expect(result.budget.size).toBe(2)
    expect(result.budget.get('1')?.monthlySales).toBe(1000000) // 既存維持
    expect(result.budget.get('2')?.monthlySales).toBe(2000000) // 新規追加
  })

  it('importedTypesにない場合departmentKpi/settings/budgetは変更されない', () => {
    const existing = makeData({
      departmentKpi: { records: [{ deptCode: '01', deptName: '青果', gpRateBudget: 30, gpRateActual: 28, gpRateVariance: -2, markupRate: 35, discountRate: 5, salesBudget: 100000, salesActual: 90000, salesVariance: -10000, salesAchievement: 90, openingInventory: 50000, closingInventory: 45000, gpRateLanding: 29, salesLanding: 95000 }] },
      settings: new Map([['1', { openingCost: 100, openingPrice: 150 }]]),
      budget: new Map([['1', { monthlySales: 1000000, daily: new Map() }]]),
    })
    const incoming = makeData({
      departmentKpi: { records: [{ deptCode: '99', deptName: '新規', gpRateBudget: 0, gpRateActual: 0, gpRateVariance: 0, markupRate: 0, discountRate: 0, salesBudget: 0, salesActual: 0, salesVariance: 0, salesAchievement: 0, openingInventory: 0, closingInventory: 0, gpRateLanding: 0, salesLanding: 0 }] },
      settings: new Map([['9', { openingCost: 999, openingPrice: 999 }]]),
      budget: new Map([['9', { monthlySales: 9999999, daily: new Map() }]]),
    })

    // sales のみインポート → departmentKpi/settings/budget は対象外
    const result = mergeInsertsOnly(existing, incoming, new Set(['sales']))

    expect(result.departmentKpi.records).toHaveLength(1) // 変更なし
    expect(result.settings.size).toBe(1)                  // 変更なし
    expect(result.budget.size).toBe(1)                    // 変更なし
  })

  it('複数データ種別を同時にマージできる', () => {
    const existing = makeData({
      sales: { '1': { 1: { sales: 50000 } } },
      discount: { '1': { 1: { sales: 50000, discount: 3000 } } },
    })
    const incoming = makeData({
      sales: {
        '1': {
          1: { sales: 99999 },
          2: { sales: 60000 },
        },
      },
      discount: {
        '1': {
          1: { sales: 99999, discount: 9999 },
          2: { sales: 60000, discount: 5000 },
        },
      },
    })

    const result = mergeInsertsOnly(existing, incoming, new Set(['sales', 'discount']))

    // 既存維持
    expect(result.sales['1']?.[1]?.sales).toBe(50000)
    expect(result.discount['1']?.[1]?.discount).toBe(3000)
    // 新規挿入
    expect(result.sales['1']?.[2]?.sales).toBe(60000)
    expect(result.discount['1']?.[2]?.discount).toBe(5000)
  })
})
