/**
 * BudgetProcessor.ts — pure row processor test
 *
 * 検証対象:
 * - processBudget:
 *   - 行数 < 2 → 空オブジェクト
 *   - ヘッダー行 (index 0) はスキップ
 *   - storeCode 空 → スキップ
 *   - NaN storeId → スキップ
 *   - 無効な日付 → スキップ
 *   - budget <= 0 → スキップ
 *   - 年月パーティション ({year}-{month} キー)
 *   - 複数日の合計を total に
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { processBudget } from '../BudgetProcessor'

describe('processBudget', () => {
  it('空行 → 空オブジェクト', () => {
    expect(processBudget([])).toEqual({})
  })

  it('1 行のみ (ヘッダー) → 空', () => {
    expect(processBudget([['header']])).toEqual({})
  })

  it('有効な 1 行: {year}-{month} → store → day: budget', () => {
    const rows = [
      ['store', 'date', 'budget'], // header
      ['0001', '2026/04/15', 10000],
    ]
    const result = processBudget(rows)
    expect(result).toHaveProperty('2026-4')
    expect(result['2026-4'].size).toBe(1)
    const storeBudget = result['2026-4'].get('1')
    expect(storeBudget?.daily.get(15)).toBe(10000)
    expect(storeBudget?.total).toBe(10000)
  })

  it('storeCode 空 → スキップ', () => {
    const rows = [['header'], ['', '2026/04/15', 10000], ['0001', '2026/04/16', 5000]]
    const result = processBudget(rows)
    expect(result['2026-4'].get('1')?.daily.size).toBe(1)
  })

  it('storeCode が数値に変換不能 → スキップ', () => {
    const rows = [['header'], ['abc', '2026/04/15', 10000]]
    const result = processBudget(rows)
    expect(Object.keys(result)).toEqual([])
  })

  it('無効な日付 → スキップ', () => {
    const rows = [['header'], ['0001', 'invalid', 10000]]
    const result = processBudget(rows)
    expect(Object.keys(result)).toEqual([])
  })

  it('budget <= 0 → スキップ', () => {
    const rows = [
      ['header'],
      ['0001', '2026/04/15', 0],
      ['0001', '2026/04/16', -100],
      ['0001', '2026/04/17', 500],
    ]
    const result = processBudget(rows)
    expect(result['2026-4'].get('1')?.daily.size).toBe(1)
    expect(result['2026-4'].get('1')?.daily.get(17)).toBe(500)
  })

  it('複数日の合計を total に集計', () => {
    const rows = [
      ['header'],
      ['0001', '2026/04/01', 1000],
      ['0001', '2026/04/02', 2000],
      ['0001', '2026/04/03', 3000],
    ]
    const result = processBudget(rows)
    expect(result['2026-4'].get('1')?.total).toBe(6000)
  })

  it('複数年月: 年月キーで分割', () => {
    const rows = [['header'], ['0001', '2026/04/15', 1000], ['0001', '2026/05/15', 2000]]
    const result = processBudget(rows)
    expect(result['2026-4']).toBeDefined()
    expect(result['2026-5']).toBeDefined()
    expect(result['2026-4'].get('1')?.total).toBe(1000)
    expect(result['2026-5'].get('1')?.total).toBe(2000)
  })

  it('複数店舗: storeId で分割', () => {
    const rows = [['header'], ['0001', '2026/04/15', 1000], ['0002', '2026/04/15', 2000]]
    const result = processBudget(rows)
    expect(result['2026-4'].size).toBe(2)
    expect(result['2026-4'].get('1')?.total).toBe(1000)
    expect(result['2026-4'].get('2')?.total).toBe(2000)
  })

  it('storeCode の先頭 0 は除去される (parseInt)', () => {
    const rows = [['header'], ['00081257', '2026/04/15', 1000]]
    const result = processBudget(rows)
    expect(result['2026-4'].get('81257')).toBeDefined()
  })
})
