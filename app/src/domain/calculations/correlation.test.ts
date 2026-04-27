/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import {
  pearsonCorrelation,
  correlationMatrix,
  normalizeMinMax,
  detectDivergence,
  cosineSimilarity,
  movingAverage,
  calculateZScores,
} from './algorithms/correlation'

describe('correlation', () => {
  describe('pearsonCorrelation', () => {
    it('完全正相関でr=1を返す', () => {
      const xs = [1, 2, 3, 4, 5]
      const ys = [10, 20, 30, 40, 50]
      const result = pearsonCorrelation(xs, ys)
      expect(result.r).toBeCloseTo(1.0, 5)
      expect(result.n).toBe(5)
    })

    it('完全負相関でr=-1を返す', () => {
      const xs = [1, 2, 3, 4, 5]
      const ys = [50, 40, 30, 20, 10]
      const result = pearsonCorrelation(xs, ys)
      expect(result.r).toBeCloseTo(-1.0, 5)
    })

    it('無相関でr≈0を返す', () => {
      const xs = [1, 2, 3, 4, 5]
      const ys = [2, 4, 1, 5, 3] // ランダム的
      const result = pearsonCorrelation(xs, ys)
      expect(Math.abs(result.r)).toBeLessThan(0.5)
    })

    it('データ1点の場合r=0', () => {
      const result = pearsonCorrelation([1], [2])
      expect(result.r).toBe(0)
      expect(result.n).toBe(1)
    })

    it('空データの場合r=0', () => {
      const result = pearsonCorrelation([], [])
      expect(result.r).toBe(0)
      expect(result.n).toBe(0)
    })

    it('定数系列の場合r=0（分散ゼロ）', () => {
      const xs = [5, 5, 5, 5]
      const ys = [1, 2, 3, 4]
      const result = pearsonCorrelation(xs, ys)
      expect(result.r).toBe(0)
    })

    it('長さが異なる場合は短い方に合わせる', () => {
      const xs = [1, 2, 3]
      const ys = [10, 20, 30, 40, 50]
      const result = pearsonCorrelation(xs, ys)
      expect(result.n).toBe(3)
      expect(result.r).toBeCloseTo(1.0, 5)
    })

    it('rは常に[-1, 1]の範囲内', () => {
      // 大きな値で浮動小数点誤差を誘発
      const xs = [1e10, 1e10 + 1, 1e10 + 2]
      const ys = [1e10, 1e10 + 1, 1e10 + 2]
      const result = pearsonCorrelation(xs, ys)
      expect(result.r).toBeGreaterThanOrEqual(-1)
      expect(result.r).toBeLessThanOrEqual(1)
    })
  })

  describe('correlationMatrix', () => {
    it('3系列の上三角行列を返す（3ペア）', () => {
      const series = [
        { name: '売上', values: [1, 2, 3, 4, 5] },
        { name: '仕入', values: [1, 2, 3, 4, 5] },
        { name: '売変', values: [5, 4, 3, 2, 1] },
      ]
      const result = correlationMatrix(series)

      expect(result).toHaveLength(3) // C(3,2) = 3
      expect(result[0].seriesA).toBe('売上')
      expect(result[0].seriesB).toBe('仕入')
      expect(result[0].correlation.r).toBeCloseTo(1.0, 5)

      expect(result[2].seriesA).toBe('仕入')
      expect(result[2].seriesB).toBe('売変')
      expect(result[2].correlation.r).toBeCloseTo(-1.0, 5)
    })

    it('空の系列リストで空配列を返す', () => {
      expect(correlationMatrix([])).toHaveLength(0)
    })

    it('1系列の場合ペアなしで空配列', () => {
      const series = [{ name: '売上', values: [1, 2, 3] }]
      expect(correlationMatrix(series)).toHaveLength(0)
    })
  })

  describe('normalizeMinMax', () => {
    it('0-100スケールに正規化する', () => {
      const result = normalizeMinMax([10, 20, 30, 40, 50])

      expect(result.min).toBe(10)
      expect(result.max).toBe(50)
      expect(result.range).toBe(40)
      expect(result.values[0]).toBeCloseTo(0, 5) // min → 0
      expect(result.values[4]).toBeCloseTo(100, 5) // max → 100
      expect(result.values[2]).toBeCloseTo(50, 5) // 中央 → 50
    })

    it('全値同一の場合は全て50を返す', () => {
      const result = normalizeMinMax([7, 7, 7])
      expect(result.values).toEqual([50, 50, 50])
      expect(result.range).toBe(0)
    })

    it('空配列で空を返す', () => {
      const result = normalizeMinMax([])
      expect(result.values).toEqual([])
      expect(result.range).toBe(0)
    })

    it('2要素で正しく0と100', () => {
      const result = normalizeMinMax([100, 200])
      expect(result.values[0]).toBeCloseTo(0, 5)
      expect(result.values[1]).toBeCloseTo(100, 5)
    })
  })

  describe('detectDivergence', () => {
    it('同一系列で乖離なし', () => {
      const series = [1, 2, 3, 4, 5]
      const result = detectDivergence(series, series)
      expect(result.every((p) => !p.isSignificant)).toBe(true)
    })

    it('逆方向の系列で大きな乖離を検出', () => {
      const a = [1, 2, 3, 4, 5]
      const b = [5, 4, 3, 2, 1]
      const result = detectDivergence(a, b, 30)

      // 先頭と末尾で乖離が大きい
      expect(result[0].isSignificant).toBe(true)
      expect(result[4].isSignificant).toBe(true)
      // 中央は乖離なし
      expect(result[2].isSignificant).toBe(false)
    })

    it('閾値を変更すると検出感度が変わる', () => {
      const a = [0, 50, 100]
      const b = [100, 50, 0]
      const strict = detectDivergence(a, b, 10)
      const loose = detectDivergence(a, b, 90)

      const strictCount = strict.filter((p) => p.isSignificant).length
      const looseCount = loose.filter((p) => p.isSignificant).length
      expect(strictCount).toBeGreaterThanOrEqual(looseCount)
    })
  })

  describe('cosineSimilarity', () => {
    it('同一ベクトルで1を返す', () => {
      const a = [1, 2, 3]
      expect(cosineSimilarity(a, a)).toBeCloseTo(1.0, 5)
    })

    it('直交ベクトルで0を返す', () => {
      const a = [1, 0]
      const b = [0, 1]
      expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5)
    })

    it('反対方向で-1を返す', () => {
      const a = [1, 2, 3]
      const b = [-1, -2, -3]
      expect(cosineSimilarity(a, b)).toBeCloseTo(-1.0, 5)
    })

    it('ゼロベクトルで0を返す', () => {
      expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0)
    })

    it('空ベクトルで0を返す', () => {
      expect(cosineSimilarity([], [])).toBe(0)
    })

    it('類似パターンは高い類似度', () => {
      // 同じ形のパターン（スケール違い）
      const a = [10, 20, 30, 20, 10]
      const b = [100, 200, 300, 200, 100]
      expect(cosineSimilarity(a, b)).toBeCloseTo(1.0, 5)
    })
  })

  describe('movingAverage', () => {
    it('ウィンドウサイズ3で正しく計算する', () => {
      const values = [10, 20, 30, 40, 50]
      const result = movingAverage(values, 3)

      expect(result[0]).toBe(10) // 先頭はそのまま
      expect(result[1]).toBe(20) // まだ足りない
      expect(result[2]).toBeCloseTo(20, 5) // (10+20+30)/3
      expect(result[3]).toBeCloseTo(30, 5) // (20+30+40)/3
      expect(result[4]).toBeCloseTo(40, 5) // (30+40+50)/3
    })

    it('ウィンドウ1以下で元データを返す', () => {
      const values = [1, 2, 3]
      expect(movingAverage(values, 1)).toEqual([1, 2, 3])
      expect(movingAverage(values, 0)).toEqual([1, 2, 3])
    })

    it('空配列で空を返す', () => {
      expect(movingAverage([], 3)).toEqual([])
    })
  })

  describe('calculateZScores', () => {
    it('標準正規分布的なデータで正しいZスコアを返す', () => {
      // mean=30, stdDev=10 に近いデータ
      const values = [20, 30, 40]
      const zScores = calculateZScores(values)

      expect(zScores).toHaveLength(3)
      // 20 → (20-30)/stdDev < 0
      expect(zScores[0]).toBeLessThan(0)
      // 30 → (30-30)/stdDev = 0
      expect(zScores[1]).toBeCloseTo(0, 5)
      // 40 → (40-30)/stdDev > 0
      expect(zScores[2]).toBeGreaterThan(0)
    })

    it('全値同一でZスコア全て0', () => {
      const zScores = calculateZScores([5, 5, 5, 5])
      expect(zScores).toEqual([0, 0, 0, 0])
    })

    it('空配列で空を返す', () => {
      expect(calculateZScores([])).toEqual([])
    })

    it('外れ値が大きなZスコアを持つ', () => {
      // 100は明らかな外れ値
      const values = [10, 11, 12, 11, 10, 100]
      const zScores = calculateZScores(values)
      expect(Math.abs(zScores[5])).toBeGreaterThan(2)
    })
  })
})
