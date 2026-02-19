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
