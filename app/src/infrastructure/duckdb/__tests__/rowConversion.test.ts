/**
 * rowConversion.ts — Arrow StructRow 変換ユーティリティのテスト
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { snakeToCamel, structRowToObject, normalizeNumeric } from '../rowConversion'

describe('snakeToCamel', () => {
  it('単純な snake_case を camelCase に変換する', () => {
    expect(snakeToCamel('total_amount')).toBe('totalAmount')
  })

  it('複数のアンダースコアを変換する', () => {
    expect(snakeToCamel('is_prev_year_flag')).toBe('isPrevYearFlag')
  })

  it('数字を含むキーを変換する', () => {
    expect(snakeToCamel('discount_71')).toBe('discount71')
  })

  it('アンダースコア無しはそのまま返す', () => {
    expect(snakeToCamel('year')).toBe('year')
  })

  it('空文字列はそのまま返す', () => {
    expect(snakeToCamel('')).toBe('')
  })

  it('date_key を dateKey に変換する', () => {
    expect(snakeToCamel('date_key')).toBe('dateKey')
  })
})

describe('structRowToObject', () => {
  it('snake_case キーを camelCase に変換する', () => {
    const input = { date_key: '2024-01-01', store_id: 'A', total_amount: 100 }
    const result = structRowToObject(input)
    expect(result).toEqual({ dateKey: '2024-01-01', storeId: 'A', totalAmount: 100 })
  })

  it('BigInt を number に変換する', () => {
    const input = { year: BigInt(2024), month: BigInt(4) }
    const result = structRowToObject(input)
    expect(result).toEqual({ year: 2024, month: 4 })
    expect(typeof result.year).toBe('number')
    expect(typeof result.month).toBe('number')
  })

  it('BigInt と通常値を混在して変換する', () => {
    const input = { year: BigInt(2024), store_id: 'X', amount: 3.14 }
    const result = structRowToObject(input)
    expect(result).toEqual({ year: 2024, storeId: 'X', amount: 3.14 })
  })

  it('空オブジェクトは空オブジェクトを返す', () => {
    expect(structRowToObject({})).toEqual({})
  })

  it('null / undefined / 0 を保持する', () => {
    const input = { a_field: null, b_field: undefined, c_field: 0 }
    const result = structRowToObject(input)
    expect(result).toEqual({ aField: null, bField: undefined, cField: 0 })
  })

  it('boolean 値を保持する', () => {
    const input = { is_prev_year: true, is_active: false }
    const result = structRowToObject(input)
    expect(result).toEqual({ isPrevYear: true, isActive: false })
  })

  it('HUGEINT 由来の Uint32Array(4) を number に変換する（下位のみ）', () => {
    // 3000 as 128-bit little-endian: [3000, 0, 0, 0]
    const input = { total_customers: new Uint32Array([3000, 0, 0, 0]) }
    const result = structRowToObject(input)
    expect(result).toEqual({ totalCustomers: 3000 })
    expect(typeof result.totalCustomers).toBe('number')
  })

  it('valueOf が number を返すオブジェクトを number に変換する', () => {
    const input = { amt: { valueOf: () => 1500 } }
    const result = structRowToObject(input)
    expect(result).toEqual({ amt: 1500 })
    expect(typeof result.amt).toBe('number')
  })
})

describe('normalizeNumeric', () => {
  it('通常の number はそのまま返す', () => {
    expect(normalizeNumeric(123)).toBe(123)
  })

  it('bigint を number に変換する', () => {
    expect(normalizeNumeric(BigInt(3000))).toBe(3000)
  })

  it('Uint32Array(4) の HUGEINT を number に変換する', () => {
    expect(normalizeNumeric(new Uint32Array([42, 0, 0, 0]))).toBe(42)
  })

  it('valueOf を持つ bigint ラッパーも変換する', () => {
    expect(normalizeNumeric({ valueOf: () => BigInt(99) })).toBe(99)
  })

  it('string は変換しない（そのまま返す）', () => {
    expect(normalizeNumeric('foo')).toBe('foo')
  })

  it('null / undefined はそのまま返す', () => {
    expect(normalizeNumeric(null)).toBe(null)
    expect(normalizeNumeric(undefined)).toBe(undefined)
  })
})
