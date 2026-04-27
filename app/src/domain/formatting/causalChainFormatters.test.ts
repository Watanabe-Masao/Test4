/**
 * causalChainFormatters の pure 関数テスト
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import {
  fmtPct,
  fmtComma,
  fmtYen,
  fmtDelta,
  findMaxFactorIndex,
  type CausalFactor,
} from './causalChainFormatters'

describe('fmtPct', () => {
  it('formats percent with default 2 decimals', () => {
    expect(fmtPct(0.1234)).toBe('12.34%')
  })

  it('respects custom decimals', () => {
    expect(fmtPct(0.5, 0)).toBe('50%')
    expect(fmtPct(0.12345, 3)).toBe('12.345%')
  })

  it('formats zero', () => {
    expect(fmtPct(0)).toBe('0.00%')
  })

  it('handles negative values', () => {
    expect(fmtPct(-0.05)).toBe('-5.00%')
  })
})

describe('fmtComma', () => {
  it('formats integer with JP locale commas', () => {
    expect(fmtComma(1234567)).toBe('1,234,567')
  })

  it('rounds decimals', () => {
    expect(fmtComma(1234.7)).toBe('1,235')
  })

  it('formats zero', () => {
    expect(fmtComma(0)).toBe('0')
  })
})

describe('fmtYen', () => {
  it('adds + prefix for positive values', () => {
    expect(fmtYen(1000)).toBe('+1,000円')
  })

  it('keeps minus sign for negative values', () => {
    expect(fmtYen(-500)).toBe('-500円')
  })

  it('treats zero as non-negative (adds +)', () => {
    expect(fmtYen(0)).toBe('+0円')
  })
})

describe('fmtDelta', () => {
  it('adds + for positive delta', () => {
    expect(fmtDelta(0.05)).toBe('+5.00%')
  })

  it('preserves minus for negative delta', () => {
    expect(fmtDelta(-0.1)).toBe('-10.00%')
  })

  it('adds + for zero', () => {
    expect(fmtDelta(0)).toBe('+0.00%')
  })
})

describe('findMaxFactorIndex', () => {
  const mk = (v: number): CausalFactor => ({
    label: 'x',
    value: v,
    formatted: '',
    colorHint: 'primary',
  })

  it('returns 0 for empty array', () => {
    expect(findMaxFactorIndex([])).toBe(0)
  })

  it('returns 0 for single element', () => {
    expect(findMaxFactorIndex([mk(5)])).toBe(0)
  })

  it('returns index of max value', () => {
    expect(findMaxFactorIndex([mk(1), mk(5), mk(3)])).toBe(1)
  })

  it('returns first index on tie', () => {
    expect(findMaxFactorIndex([mk(5), mk(5), mk(3)])).toBe(0)
  })

  it('handles negative values', () => {
    expect(findMaxFactorIndex([mk(-10), mk(-5), mk(-8)])).toBe(1)
  })
})
