/**
 * DiscountEntry — pure helper tests
 *
 * 検証対象:
 * - DISCOUNT_TYPES: 4 種別の定義
 * - extractDiscountEntries: ClassifiedSalesRecord 4 フィールドから配列生成（abs 正規化）
 * - sumDiscountEntries: 唯一の合算ポイント
 * - addDiscountEntries: 同 type 同士の加算
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import {
  DISCOUNT_TYPES,
  extractDiscountEntries,
  sumDiscountEntries,
  addDiscountEntries,
  type DiscountEntry,
} from '../DiscountEntry'

describe('DISCOUNT_TYPES', () => {
  it('4 種別 71/72/73/74 を順序付きで定義', () => {
    expect(DISCOUNT_TYPES.map((d) => d.type)).toEqual(['71', '72', '73', '74'])
  })

  it('各 type に label と field が紐づく', () => {
    for (const d of DISCOUNT_TYPES) {
      expect(d.label).toBeTruthy()
      expect(d.field).toMatch(/^discount7[1-4]$/)
    }
  })
})

describe('extractDiscountEntries', () => {
  it('4 種別を順序付きで返す', () => {
    const result = extractDiscountEntries({
      discount71: 100,
      discount72: 200,
      discount73: 50,
      discount74: 30,
    })
    expect(result.map((e) => e.type)).toEqual(['71', '72', '73', '74'])
  })

  it('値は Math.abs で正規化（負値は正値に）', () => {
    const result = extractDiscountEntries({
      discount71: -100,
      discount72: 200,
      discount73: -50,
      discount74: 0,
    })
    expect(result.map((e) => e.amount)).toEqual([100, 200, 50, 0])
  })

  it('NaN 入力は 0 扱い', () => {
    const result = extractDiscountEntries({
      discount71: NaN,
      discount72: 100,
      discount73: 0,
      discount74: 0,
    })
    expect(result[0].amount).toBe(0)
  })

  it('全 0 入力で全エントリ 0', () => {
    const result = extractDiscountEntries({
      discount71: 0,
      discount72: 0,
      discount73: 0,
      discount74: 0,
    })
    expect(result.every((e) => e.amount === 0)).toBe(true)
  })
})

describe('sumDiscountEntries', () => {
  it('空配列で 0', () => {
    expect(sumDiscountEntries([])).toBe(0)
  })

  it('全エントリの amount を合計', () => {
    const entries: DiscountEntry[] = [
      { type: '71', label: 'a', amount: 100 },
      { type: '72', label: 'b', amount: 200 },
      { type: '73', label: 'c', amount: 50 },
      { type: '74', label: 'd', amount: 30 },
    ]
    expect(sumDiscountEntries(entries)).toBe(380)
  })

  it('単一エントリ', () => {
    expect(sumDiscountEntries([{ type: '71', label: 'a', amount: 42 }])).toBe(42)
  })
})

describe('addDiscountEntries', () => {
  const entriesA: DiscountEntry[] = [
    { type: '71', label: 'L', amount: 100 },
    { type: '72', label: 'L', amount: 50 },
    { type: '73', label: 'L', amount: 20 },
    { type: '74', label: 'L', amount: 10 },
  ]
  const entriesB: DiscountEntry[] = [
    { type: '71', label: 'L', amount: 30 },
    { type: '72', label: 'L', amount: 70 },
    { type: '73', label: 'L', amount: 0 },
    { type: '74', label: 'L', amount: 5 },
  ]

  it('同 type 同士を加算', () => {
    const result = addDiscountEntries(entriesA, entriesB)
    expect(result.map((e) => e.amount)).toEqual([130, 120, 20, 15])
  })

  it('片側に欠けている type は他方の値そのまま', () => {
    const partial: DiscountEntry[] = [{ type: '71', label: 'L', amount: 100 }]
    const result = addDiscountEntries(partial, entriesB)
    expect(result.find((e) => e.type === '71')?.amount).toBe(130)
    expect(result.find((e) => e.type === '72')?.amount).toBe(70) // partial は 0
    expect(result.find((e) => e.type === '74')?.amount).toBe(5)
  })

  it('両側空配列で全 0', () => {
    const result = addDiscountEntries([], [])
    expect(result.every((e) => e.amount === 0)).toBe(true)
    expect(result).toHaveLength(4) // DISCOUNT_TYPES の長さ
  })

  it('結果は DISCOUNT_TYPES 順', () => {
    const result = addDiscountEntries(entriesA, entriesB)
    expect(result.map((e) => e.type)).toEqual(['71', '72', '73', '74'])
  })
})
