/**
 * rowConversion.ts — Arrow StructRow 変換ユーティリティのテスト
 */
import { describe, it, expect } from 'vitest'
import { snakeToCamel, structRowToObject } from '../rowConversion'

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
})
