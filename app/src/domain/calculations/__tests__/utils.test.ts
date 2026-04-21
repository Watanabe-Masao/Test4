/**
 * domain/calculations/utils.ts — コアユーティリティ単体テスト
 *
 * 全計算モジュールが依存する基盤関数群。
 * 境界値・ゼロ除算・null 処理を重点的に検証。
 */
import { describe, it, expect } from 'vitest'
import {
  safeNumber,
  safeDivide,
  calculateAchievementRate,
  calculateYoYRatio,
  calculateShare,
  calculateGrossProfitRate,
  calculateMarkupRate,
  calculateGrowthRate,
  calculateTransactionValue,
  calculateItemsPerCustomer,
  calculateAveragePricePerItem,
  calculateMovingAverage,
  calculatePartialMovingAverage,
} from '../utils'

describe('safeNumber', () => {
  it('正常な数値はそのまま', () => expect(safeNumber(42)).toBe(42))
  it('null → 0', () => expect(safeNumber(null)).toBe(0))
  it('undefined → 0', () => expect(safeNumber(undefined)).toBe(0))
  it('NaN → 0', () => expect(safeNumber(NaN)).toBe(0))
  it('Infinity → 0', () => expect(safeNumber(Infinity)).toBe(0))
  it('-Infinity → 0', () => expect(safeNumber(-Infinity)).toBe(0))
  it('文字列 "123" → 123', () => expect(safeNumber('123')).toBe(123))
  it('空文字 → 0', () => expect(safeNumber('')).toBe(0))
})

describe('safeDivide', () => {
  it('正常除算', () => expect(safeDivide(10, 5)).toBe(2))
  it('分母 0 → fallback', () => expect(safeDivide(10, 0)).toBe(0))
  it('分母 0 + カスタム fallback', () => expect(safeDivide(10, 0, -1)).toBe(-1))
  it('分子 0', () => expect(safeDivide(0, 5)).toBe(0))
  it('負値', () => expect(safeDivide(-10, 2)).toBe(-5))
})

describe('calculateAchievementRate', () => {
  it('100% 達成', () => expect(calculateAchievementRate(100, 100)).toBe(1))
  it('200% 超過', () => expect(calculateAchievementRate(200, 100)).toBe(2))
  it('目標 0 → 0', () => expect(calculateAchievementRate(100, 0)).toBe(0))
})

describe('calculateYoYRatio', () => {
  it('前年同等 → 1.0', () => expect(calculateYoYRatio(100, 100)).toBe(1))
  it('前年 0 → 0', () => expect(calculateYoYRatio(100, 0)).toBe(0))
  it('成長 → >1', () => expect(calculateYoYRatio(120, 100)).toBeCloseTo(1.2))
})

describe('calculateShare', () => {
  it('50% シェア', () => expect(calculateShare(50, 100)).toBe(0.5))
  it('全体 0 → 0', () => expect(calculateShare(50, 0)).toBe(0))
})

describe('calculateGrossProfitRate', () => {
  it('25% 粗利率', () => expect(calculateGrossProfitRate(25000, 100000)).toBeCloseTo(0.25))
  it('売上 0 → 0', () => expect(calculateGrossProfitRate(25000, 0)).toBe(0))
})

describe('calculateMarkupRate', () => {
  it('20% 値入率', () => expect(calculateMarkupRate(20000, 100000)).toBeCloseTo(0.2))
  it('売価 0 → 0', () => expect(calculateMarkupRate(20000, 0)).toBe(0))
})

describe('calculateGrowthRate', () => {
  it('+20% 成長', () => expect(calculateGrowthRate(120, 100)).toBeCloseTo(0.2))
  it('-10% 減少', () => expect(calculateGrowthRate(90, 100)).toBeCloseTo(-0.1))
  it('前年 0 → 0', () => expect(calculateGrowthRate(100, 0)).toBe(0))
})

describe('calculateTransactionValue', () => {
  it('客単価 = 売上/客数', () => expect(calculateTransactionValue(100000, 50)).toBe(2000))
  it('客数 0 → 0', () => expect(calculateTransactionValue(100000, 0)).toBe(0))
})

describe('calculateItemsPerCustomer', () => {
  it('PI = 点数/客数', () => expect(calculateItemsPerCustomer(200, 100)).toBe(2))
  it('客数 0 → 0', () => expect(calculateItemsPerCustomer(200, 0)).toBe(0))
})

describe('calculateAveragePricePerItem', () => {
  it('単価 = 売上/点数', () => expect(calculateAveragePricePerItem(10000, 50)).toBe(200))
  it('点数 0 → 0', () => expect(calculateAveragePricePerItem(10000, 0)).toBe(0))
})

describe('calculateMovingAverage', () => {
  it('窓サイズ 3 の移動平均', () => {
    const result = calculateMovingAverage([10, 20, 30, 40, 50], 3)
    expect(result).toHaveLength(5)
    expect(result[2]).toBeCloseTo(20) // (10+20+30)/3
    expect(result[4]).toBeCloseTo(40) // (30+40+50)/3
  })

  it('窓サイズが入力より大きい → 全 NaN または部分的', () => {
    const result = calculateMovingAverage([10, 20], 5)
    expect(result).toHaveLength(2)
  })

  it('空入力 → 空配列', () => {
    expect(calculateMovingAverage([], 3)).toEqual([])
  })

  it('窓サイズ 1 → 元の値と同じ', () => {
    const result = calculateMovingAverage([10, 20, 30], 1)
    expect(result).toEqual([10, 20, 30])
  })
})

describe('calculatePartialMovingAverage', () => {
  it('先頭でも利用可能な値で平均を返す（NaN にしない）', () => {
    const result = calculatePartialMovingAverage([10, 20, 30, 40, 50], 3)
    expect(result).toHaveLength(5)
    expect(result[0]).toBe(10) // 1件のみ → 10
    expect(result[1]).toBe(15) // (10+20)/2
    expect(result[2]).toBe(20) // (10+20+30)/3
    expect(result[3]).toBe(30) // (20+30+40)/3
    expect(result[4]).toBe(40) // (30+40+50)/3
  })

  it('値 0（データなし）は分母から除外', () => {
    const result = calculatePartialMovingAverage([0, 10, 20], 3)
    expect(result[0]).toBeNull() // 0件
    expect(result[1]).toBe(10) // (10)/1
    expect(result[2]).toBe(15) // (10+20)/2
  })

  it('全値 0 は null', () => {
    const result = calculatePartialMovingAverage([0, 0, 0], 3)
    expect(result).toEqual([null, null, null])
  })

  it('空入力 → 空配列', () => {
    expect(calculatePartialMovingAverage([], 3)).toEqual([])
  })

  it('窓サイズ 1 → 元の値と同じ（0 は null）', () => {
    expect(calculatePartialMovingAverage([10, 0, 30], 1)).toEqual([10, null, 30])
  })

  it('窓サイズが入力より大きい → 利用可能分で平均', () => {
    const result = calculatePartialMovingAverage([10, 20], 5)
    expect(result[0]).toBe(10)
    expect(result[1]).toBe(15) // (10+20)/2
  })
})
