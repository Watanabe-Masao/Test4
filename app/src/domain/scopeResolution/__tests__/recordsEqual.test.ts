import { describe, it, expect } from 'vitest'
import { recordsEqual, stableStringify } from '../recordsEqual'
import type { DatedRecord } from '../../models/DataTypes'

describe('stableStringify', () => {
  it('キー順序が異なっても同じ結果', () => {
    const a = { b: 2, a: 1 }
    const b = { a: 1, b: 2 }
    expect(stableStringify(a)).toBe(stableStringify(b))
  })

  it('ネストオブジェクトもキーソート', () => {
    const a = { outer: { z: 1, a: 2 } }
    const b = { outer: { a: 2, z: 1 } }
    expect(stableStringify(a)).toBe(stableStringify(b))
  })

  it('配列は順序を保持', () => {
    expect(stableStringify([1, 2, 3])).not.toBe(stableStringify([3, 2, 1]))
  })

  it('null/undefined は両方 "null" 文字列を返す', () => {
    expect(stableStringify(null)).toBe('null')
    expect(stableStringify(undefined)).toBe('null')
    // 両方 string 型であること
    expect(typeof stableStringify(null)).toBe('string')
    expect(typeof stableStringify(undefined)).toBe('string')
  })

  it('NaN/Infinity は "null" を返す', () => {
    expect(stableStringify(NaN)).toBe('null')
    expect(stableStringify(Infinity)).toBe('null')
    expect(stableStringify(-Infinity)).toBe('null')
  })

  it('プリミティブ値', () => {
    expect(stableStringify(42)).toBe('42')
    expect(stableStringify('hello')).toBe('"hello"')
    expect(stableStringify(true)).toBe('true')
  })

  it('undefined フィールドを含むオブジェクトが壊れない', () => {
    const obj = { a: 1, b: undefined, c: 3 }
    const result = stableStringify(obj)
    expect(typeof result).toBe('string')
    expect(result).toBe('{"a":1,"b":null,"c":3}')
  })
})

describe('recordsEqual', () => {
  const base: DatedRecord = { year: 2025, month: 2, day: 15, storeId: '001' }

  // INV-RS-16: 対称性
  it('対称性: a === b ならば recordsEqual(a, b) === recordsEqual(b, a)', () => {
    const a = { ...base, cost: 1000 } as DatedRecord
    const b = { ...base, cost: 1000 } as DatedRecord
    expect(recordsEqual(a, b)).toBe(true)
    expect(recordsEqual(b, a)).toBe(true)
  })

  it('対称性: a !== b の場合も成立', () => {
    const a = { ...base, cost: 1000 } as DatedRecord
    const b = { ...base, cost: 2000 } as DatedRecord
    expect(recordsEqual(a, b)).toBe(false)
    expect(recordsEqual(b, a)).toBe(false)
  })

  // INV-RS-16: 推移性
  it('推移性: a === b && b === c ならば a === c', () => {
    const a = { ...base, cost: 1000 } as DatedRecord
    const b = { ...base, cost: 1000 } as DatedRecord
    const c = { ...base, cost: 1000 } as DatedRecord
    expect(recordsEqual(a, b)).toBe(true)
    expect(recordsEqual(b, c)).toBe(true)
    expect(recordsEqual(a, c)).toBe(true)
  })

  it('メタフィールド（_ prefix）は無視する', () => {
    const a = { ...base, cost: 1000, _id: 1, _naturalKey: 'k1', _dataType: 'purchase' }
    const b = { ...base, cost: 1000, _id: 99, _naturalKey: 'k2', _dataType: 'flowers' }
    expect(recordsEqual(a as unknown as DatedRecord, b as unknown as DatedRecord)).toBe(true)
  })

  it('ビジネスフィールドが異なれば不一致', () => {
    const a = { ...base, cost: 1000, price: 2000 } as DatedRecord
    const b = { ...base, cost: 1000, price: 2001 } as DatedRecord
    expect(recordsEqual(a, b)).toBe(false)
  })

  it('ネストしたオブジェクトも比較する', () => {
    const a = {
      ...base,
      suppliers: { S1: { name: 'A', cost: 100, price: 200 } },
    } as unknown as DatedRecord
    const b = {
      ...base,
      suppliers: { S1: { name: 'A', cost: 100, price: 200 } },
    } as unknown as DatedRecord
    expect(recordsEqual(a, b)).toBe(true)
  })

  it('ネストしたオブジェクトの差異を検出する', () => {
    const a = {
      ...base,
      suppliers: { S1: { name: 'A', cost: 100, price: 200 } },
    } as unknown as DatedRecord
    const b = {
      ...base,
      suppliers: { S1: { name: 'A', cost: 100, price: 201 } },
    } as unknown as DatedRecord
    expect(recordsEqual(a, b)).toBe(false)
  })
})
