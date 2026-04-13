import { describe, it, expect } from 'vitest'
import {
  pearsonCorrelation,
  correlationMatrix,
  normalizeMinMax,
  detectDivergence,
  cosineSimilarity,
  movingAverage,
  calculateZScores,
} from './correlation'

describe('pearsonCorrelation', () => {
  it('returns r=1 for perfectly correlated series', () => {
    const result = pearsonCorrelation([1, 2, 3, 4, 5], [2, 4, 6, 8, 10])
    expect(result.r).toBeCloseTo(1, 10)
    expect(result.n).toBe(5)
  })

  it('returns r=-1 for inversely correlated series', () => {
    const result = pearsonCorrelation([1, 2, 3, 4, 5], [5, 4, 3, 2, 1])
    expect(result.r).toBeCloseTo(-1, 10)
    expect(result.n).toBe(5)
  })

  it('returns r=0 when fewer than 2 data points', () => {
    expect(pearsonCorrelation([1], [2])).toEqual({ r: 0, n: 1 })
    expect(pearsonCorrelation([], [])).toEqual({ r: 0, n: 0 })
  })

  it('returns r=0 for constant series (zero variance)', () => {
    const result = pearsonCorrelation([5, 5, 5, 5], [1, 2, 3, 4])
    expect(result.r).toBe(0)
  })

  it('truncates to shorter array length', () => {
    const result = pearsonCorrelation([1, 2, 3, 4, 5], [1, 2, 3])
    expect(result.n).toBe(3)
  })

  it('clamps r within [-1, 1] range', () => {
    const result = pearsonCorrelation([1, 2, 3], [1, 2, 3])
    expect(result.r).toBeLessThanOrEqual(1)
    expect(result.r).toBeGreaterThanOrEqual(-1)
  })
})

describe('correlationMatrix', () => {
  it('generates upper triangular pairs for all series', () => {
    const cells = correlationMatrix([
      { name: 'A', values: [1, 2, 3] },
      { name: 'B', values: [2, 4, 6] },
      { name: 'C', values: [3, 2, 1] },
    ])
    expect(cells).toHaveLength(3)
    expect(cells[0].seriesA).toBe('A')
    expect(cells[0].seriesB).toBe('B')
    expect(cells[1].seriesA).toBe('A')
    expect(cells[1].seriesB).toBe('C')
    expect(cells[2].seriesA).toBe('B')
    expect(cells[2].seriesB).toBe('C')
  })

  it('returns empty for single series', () => {
    const cells = correlationMatrix([{ name: 'A', values: [1, 2, 3] }])
    expect(cells).toEqual([])
  })

  it('returns empty for empty input', () => {
    expect(correlationMatrix([])).toEqual([])
  })
})

describe('normalizeMinMax', () => {
  it('maps values to 0-100 range', () => {
    const result = normalizeMinMax([0, 5, 10])
    expect(result.min).toBe(0)
    expect(result.max).toBe(10)
    expect(result.range).toBe(10)
    expect(result.values).toEqual([0, 50, 100])
  })

  it('returns all midpoints (50) when all values equal', () => {
    const result = normalizeMinMax([7, 7, 7])
    expect(result.range).toBe(0)
    expect(result.values).toEqual([50, 50, 50])
  })

  it('handles empty array', () => {
    const result = normalizeMinMax([])
    expect(result).toEqual({ values: [], min: 0, max: 0, range: 0 })
  })

  it('handles negative numbers', () => {
    const result = normalizeMinMax([-10, 0, 10])
    expect(result.min).toBe(-10)
    expect(result.max).toBe(10)
    expect(result.values).toEqual([0, 50, 100])
  })
})

describe('detectDivergence', () => {
  it('flags significant divergence above threshold', () => {
    const points = detectDivergence([0, 100], [100, 0], 30)
    expect(points).toHaveLength(2)
    expect(points[0].isSignificant).toBe(true)
    expect(points[0].divergence).toBe(100)
  })

  it('does not flag small divergence', () => {
    const points = detectDivergence([0, 50, 100], [0, 50, 100], 30)
    expect(points.every((p) => !p.isSignificant)).toBe(true)
    expect(points.every((p) => p.divergence === 0)).toBe(true)
  })

  it('truncates to shorter series', () => {
    const points = detectDivergence([1, 2, 3, 4], [1, 2], 30)
    expect(points).toHaveLength(2)
  })

  it('preserves original values in output', () => {
    const points = detectDivergence([10, 20], [30, 40])
    expect(points[0].seriesAValue).toBe(10)
    expect(points[0].seriesBValue).toBe(30)
  })
})

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 10)
  })

  it('returns 1 for positively scaled vectors', () => {
    expect(cosineSimilarity([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 10)
  })

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 10)
  })

  it('returns 0 for zero vector', () => {
    expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0)
  })

  it('returns 0 for empty arrays', () => {
    expect(cosineSimilarity([], [])).toBe(0)
  })
})

describe('movingAverage', () => {
  it('returns a copy for window <= 1', () => {
    expect(movingAverage([1, 2, 3], 1)).toEqual([1, 2, 3])
    expect(movingAverage([1, 2, 3], 0)).toEqual([1, 2, 3])
  })

  it('computes trailing moving average', () => {
    const result = movingAverage([1, 2, 3, 4, 5], 3)
    // first 2 use raw values, then avg of (1,2,3), (2,3,4), (3,4,5)
    expect(result).toEqual([1, 2, 2, 3, 4])
  })

  it('returns empty for empty input', () => {
    expect(movingAverage([], 3)).toEqual([])
  })

  it('handles single element with larger window', () => {
    expect(movingAverage([5], 3)).toEqual([5])
  })
})

describe('calculateZScores', () => {
  it('returns empty for empty input', () => {
    expect(calculateZScores([])).toEqual([])
  })

  it('returns all zeros for constant series', () => {
    expect(calculateZScores([5, 5, 5])).toEqual([0, 0, 0])
  })

  it('computes z-scores with mean 0 and std 1 normalization', () => {
    const result = calculateZScores([1, 2, 3, 4, 5])
    // mean=3, stdDev=sqrt(2) ≈ 1.4142
    expect(result[0]).toBeCloseTo(-1.4142, 3)
    expect(result[2]).toBeCloseTo(0, 3)
    expect(result[4]).toBeCloseTo(1.4142, 3)
  })

  it('returns negative and positive around the mean', () => {
    const result = calculateZScores([10, 20, 30])
    expect(result[0]).toBeLessThan(0)
    expect(result[1]).toBeCloseTo(0, 10)
    expect(result[2]).toBeGreaterThan(0)
  })
})
