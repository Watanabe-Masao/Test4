import { describe, it, expect } from 'vitest'
import {
  pearsonCorrelation,
  normalizeMinMax,
  movingAverage,
  linearRegression,
  calculateStdDev,
} from '../useStatistics'

describe('useStatistics re-exports', () => {
  it('pearsonCorrelation が関数としてエクスポートされる', () => {
    expect(typeof pearsonCorrelation).toBe('function')
  })

  it('normalizeMinMax が関数としてエクスポートされる', () => {
    expect(typeof normalizeMinMax).toBe('function')
  })

  it('movingAverage が関数としてエクスポートされる', () => {
    expect(typeof movingAverage).toBe('function')
  })

  it('linearRegression が関数としてエクスポートされる', () => {
    expect(typeof linearRegression).toBe('function')
  })

  it('calculateStdDev が関数としてエクスポートされる', () => {
    expect(typeof calculateStdDev).toBe('function')
  })
})
