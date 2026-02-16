import { describe, it, expect } from 'vitest'
import { processPurchase, extractStoresFromPurchase, extractSuppliersFromPurchase } from './PurchaseProcessor'

describe('processPurchase', () => {
  const stores = new Set(['1', '2'])

  it('基本的な仕入データ処理', () => {
    const rows = [
      ['', '', '', '1234567:テスト取引先', '', '7654321:別取引先'], // 行0: 取引先コード
      ['', '', '', '0001:店舗A', '', '0002:店舗B'],               // 行1: 店舗コード
      ['', '', '', '', '', ''],                                     // 行2
      ['', '', '', '', '', ''],                                     // 行3
      ['2026-02-01', '', '', 100000, 130000, 50000, 65000],        // 行4+: データ
      ['2026-02-02', '', '', 200000, 260000, 0, 0],
    ]

    const result = processPurchase(rows, stores)

    // 店舗1, day1
    expect(result['1']?.[1]?.total.cost).toBe(100000)
    expect(result['1']?.[1]?.total.price).toBe(130000)
    expect(result['1']?.[1]?.suppliers['1234567']?.cost).toBe(100000)

    // 店舗2, day1
    expect(result['2']?.[1]?.total.cost).toBe(50000)
    expect(result['2']?.[1]?.total.price).toBe(65000)

    // 店舗1, day2 (cost=0, price=0の店舗2はスキップ)
    expect(result['1']?.[2]?.total.cost).toBe(200000)
    expect(result['2']?.[2]).toBeUndefined()
  })

  it('行数不足の場合は空', () => {
    expect(processPurchase([['a'], ['b'], ['c'], ['d']], stores)).toEqual({})
  })

  it('不明な店舗はスキップ', () => {
    const rows = [
      ['', '', '', '1234567:X'],
      ['', '', '', '9999:Unknown'],
      ['', '', '', ''],
      ['', '', '', ''],
      ['2026-02-01', '', '', 100, 200],
    ]
    const result = processPurchase(rows, stores)
    expect(Object.keys(result)).toHaveLength(0)
  })

  it('複数取引先の同一日の合計', () => {
    const rows = [
      ['', '', '', '1111111:A', '', '2222222:B'],
      ['', '', '', '0001:店舗A', '', '0001:店舗A'],
      ['', '', '', '', '', ''],
      ['', '', '', '', '', ''],
      ['2026-02-01', '', '', 100, 200, 300, 400],
    ]
    const result = processPurchase(rows, stores)

    expect(result['1']?.[1]?.total.cost).toBe(400)
    expect(result['1']?.[1]?.total.price).toBe(600)
    expect(result['1']?.[1]?.suppliers['1111111']?.cost).toBe(100)
    expect(result['1']?.[1]?.suppliers['2222222']?.cost).toBe(300)
  })
})

describe('extractStoresFromPurchase', () => {
  it('行1から店舗を抽出', () => {
    const rows = [
      ['', '', '', '1234567:取引先A'],
      ['', '', '', '0001:大手町店', '', '0002:渋谷店'],
    ]
    const stores = extractStoresFromPurchase(rows)
    expect(stores.size).toBe(2)
    expect(stores.get('1')?.name).toBe('大手町店')
    expect(stores.get('2')?.name).toBe('渋谷店')
  })
})

describe('extractSuppliersFromPurchase', () => {
  it('行0から取引先を抽出', () => {
    const rows = [
      ['', '', '', '1234567:テスト取引先', '', '7654321:別取引先'],
    ]
    const suppliers = extractSuppliersFromPurchase(rows)
    expect(suppliers.size).toBe(2)
    expect(suppliers.get('1234567')?.name).toBe('テスト取引先')
    expect(suppliers.get('7654321')?.name).toBe('別取引先')
  })
})
