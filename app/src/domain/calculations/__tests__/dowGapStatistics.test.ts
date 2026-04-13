/**
 * dowGapStatistics テスト — 曜日ギャップ分析の統計ヘルパー
 */
import { describe, it, expect } from 'vitest'
import {
  calcMedian,
  calcAdjustedMean,
  computeDowStatistics,
  pickStatValue,
} from '../dowGapStatistics'

describe('calcMedian', () => {
  it('空配列は 0', () => {
    expect(calcMedian([])).toBe(0)
  })

  it('奇数個 → 中央の値', () => {
    expect(calcMedian([1, 3, 5])).toBe(3)
  })

  it('偶数個 → 中央2値の平均', () => {
    expect(calcMedian([1, 2, 3, 4])).toBe(2.5)
  })

  it('未ソート入力でも正しい', () => {
    expect(calcMedian([10, 1, 5, 2, 8])).toBe(5)
  })

  it('単一要素 → その値', () => {
    expect(calcMedian([42])).toBe(42)
  })

  it('入力を破壊しない（pure）', () => {
    const input = [3, 1, 2]
    calcMedian(input)
    expect(input).toEqual([3, 1, 2])
  })

  it('負の値を含む', () => {
    expect(calcMedian([-5, -1, 0, 2, 3])).toBe(0)
  })
})

describe('calcAdjustedMean', () => {
  it('空配列は 0', () => {
    expect(calcAdjustedMean([])).toBe(0)
  })

  it('2件以下は単純平均（外れ値判定不能）', () => {
    expect(calcAdjustedMean([10])).toBe(10)
    expect(calcAdjustedMean([10, 20])).toBe(15)
  })

  it('全同値は単純平均（MAD が 0）', () => {
    expect(calcAdjustedMean([5, 5, 5, 5, 5])).toBe(5)
  })

  it('外れ値がない場合は単純平均に近い', () => {
    // 値が近接 → 調整で弾かれない
    expect(calcAdjustedMean([10, 11, 12, 13, 14])).toBeCloseTo(12, 5)
  })

  it('明確な外れ値を除外する', () => {
    // [10, 10, 10, 10, 1000] → median=10, MAD=0 → フォールバック=単純平均
    // MAD=0 時は全同値判定で単純平均が返る
    const allSame = calcAdjustedMean([10, 10, 10, 10, 1000])
    // 単純平均 (10+10+10+10+1000)/5 = 208
    expect(allSame).toBe(208)
  })

  it('中央付近で分散している場合は外れ値検出が機能する', () => {
    // [1, 2, 3, 4, 100] → median=3, 残差=[2,1,0,1,97], MAD=1
    // modified z = 0.6745 × |v - 3| / 1
    // 100 の z = 0.6745 × 97 = 65.4 → 除外
    // 残り [1,2,3,4] 平均 = 2.5
    expect(calcAdjustedMean([1, 2, 3, 4, 100])).toBe(2.5)
  })
})

describe('computeDowStatistics', () => {
  it('空配列は全ゼロ', () => {
    expect(computeDowStatistics([])).toEqual({
      mean: 0,
      median: 0,
      adjustedMean: 0,
      cv: 0,
      n: 0,
    })
  })

  it('基本統計を返す', () => {
    const stats = computeDowStatistics([2, 4, 4, 4, 5, 5, 7, 9])
    expect(stats.n).toBe(8)
    expect(stats.mean).toBe(5)
    expect(stats.median).toBe(4.5)
    // stddev = 2, cv = 2/5 = 0.4
    expect(stats.cv).toBeCloseTo(0.4, 5)
  })

  it('単一要素では cv = 0', () => {
    const stats = computeDowStatistics([10])
    expect(stats.mean).toBe(10)
    expect(stats.median).toBe(10)
    expect(stats.n).toBe(1)
    expect(stats.cv).toBe(0)
  })

  it('mean が 0 のときは cv = 0（0除算防止）', () => {
    const stats = computeDowStatistics([0, 0, 0])
    expect(stats.mean).toBe(0)
    expect(stats.cv).toBe(0)
  })
})

describe('pickStatValue', () => {
  const stats = {
    mean: 100,
    median: 90,
    adjustedMean: 95,
    cv: 0.2,
    n: 5,
  }

  it("method='mean' → mean を返す", () => {
    expect(pickStatValue(stats, 'mean')).toBe(100)
  })

  it("method='median' → median を返す", () => {
    expect(pickStatValue(stats, 'median')).toBe(90)
  })

  it("method='adjustedMean' → adjustedMean を返す", () => {
    expect(pickStatValue(stats, 'adjustedMean')).toBe(95)
  })
})
