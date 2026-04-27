/**
 * DuckDB Worker ヘルパー関数のユニットテスト
 *
 * snakeToCamel と structRowToObject は rowConversion.ts に定義された共有関数。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { snakeToCamel, structRowToObject } from '../rowConversion'

describe('snakeToCamel', () => {
  it('単純な snake_case', () => {
    expect(snakeToCamel('date_key')).toBe('dateKey')
  })

  it('複数アンダースコア', () => {
    expect(snakeToCamel('total_sales_amount')).toBe('totalSalesAmount')
  })

  it('数字を含む場合', () => {
    expect(snakeToCamel('discount_73')).toBe('discount73')
  })

  it('アンダースコアが無い場合は変換なし', () => {
    expect(snakeToCamel('amount')).toBe('amount')
  })

  it('先頭にアンダースコアがある場合も変換される（regex 仕様）', () => {
    // _p がマッチして P に変換される
    expect(snakeToCamel('_private')).toBe('Private')
  })

  it('is_prev_year → isPrevYear', () => {
    expect(snakeToCamel('is_prev_year')).toBe('isPrevYear')
  })

  it('空文字列', () => {
    expect(snakeToCamel('')).toBe('')
  })
})

describe('structRowToObject', () => {
  it('snake_case キーを camelCase に変換', () => {
    const result = structRowToObject({ date_key: '2025-01-01', store_id: '1' })
    expect(result).toEqual({ dateKey: '2025-01-01', storeId: '1' })
  })

  it('BigInt を number に変換', () => {
    const result = structRowToObject({ total_amount: 12345n, count: 5n })
    expect(result).toEqual({ totalAmount: 12345, count: 5 })
  })

  it('number はそのまま', () => {
    const result = structRowToObject({ amount: 100.5 })
    expect(result).toEqual({ amount: 100.5 })
  })

  it('null/undefined はそのまま', () => {
    const result = structRowToObject({ value: null, other: undefined })
    expect(result).toEqual({ value: null, other: undefined })
  })

  it('混合データ', () => {
    const result = structRowToObject({
      date_key: '2025-02-01',
      store_id: '1',
      total_sales: 500000n,
      is_prev_year: false,
    })
    expect(result).toEqual({
      dateKey: '2025-02-01',
      storeId: '1',
      totalSales: 500000,
      isPrevYear: false,
    })
  })

  it('空オブジェクト', () => {
    expect(structRowToObject({})).toEqual({})
  })
})
