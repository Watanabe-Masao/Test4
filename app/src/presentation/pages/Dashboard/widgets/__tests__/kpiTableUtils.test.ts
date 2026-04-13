import { describe, it, expect } from 'vitest'
import { fmtPct, fmtPtDiff } from '../kpiTableUtils'

describe('fmtPct', () => {
  it('formats a ratio as percent with 2 decimals', () => {
    // formatPercent takes a ratio and multiplies by 100
    expect(fmtPct(0.1234)).toBe('12.34%')
  })

  it('formats 0 as 0.00%', () => {
    expect(fmtPct(0)).toBe('0.00%')
  })

  it('formats 1 as 100.00%', () => {
    expect(fmtPct(1)).toBe('100.00%')
  })
})

describe('fmtPtDiff', () => {
  it('prepends + sign for positive values', () => {
    expect(fmtPtDiff(0.31)).toBe('+0.31')
    expect(fmtPtDiff(1.5)).toBe('+1.50')
  })

  it('omits + sign for zero', () => {
    expect(fmtPtDiff(0)).toBe('0.00')
  })

  it('preserves negative sign without extra prefix', () => {
    expect(fmtPtDiff(-0.75)).toBe('-0.75')
  })

  it('rounds to 2 decimal places', () => {
    expect(fmtPtDiff(0.126)).toBe('+0.13')
  })
})
