import { describe, expect, it } from 'vitest'
import {
  computeNumericDiffs,
  checkAllFinite,
  DEFAULT_TOLERANCE,
  ANALYSIS_TOLERANCE,
} from '../compareUtils'

describe('compareUtils', () => {
  describe('computeNumericDiffs', () => {
    it('computes diffs as wasm - ts per key', () => {
      const ts = { a: 10, b: 20, c: 30 }
      const wasm = { a: 12, b: 18, c: 30 }
      const result = computeNumericDiffs(ts, wasm)
      expect(result.diffs).toEqual({ a: 2, b: -2, c: 0 })
      expect(result.maxAbsDiff).toBe(2)
    })

    it('treats missing wasm keys as zero', () => {
      const ts = { a: 5, b: 10 }
      const wasm = { a: 5 }
      const result = computeNumericDiffs(ts, wasm)
      expect(result.diffs).toEqual({ a: 0, b: -10 })
      expect(result.maxAbsDiff).toBe(10)
    })

    it('ignores wasm-only keys (only iterates tsFields)', () => {
      const ts = { a: 1 }
      const wasm = { a: 1, extra: 999 }
      const result = computeNumericDiffs(ts, wasm)
      expect(result.diffs).toEqual({ a: 0 })
      expect(Object.keys(result.diffs)).toEqual(['a'])
      expect(result.maxAbsDiff).toBe(0)
    })

    it('returns empty diffs and zero maxAbs for empty tsFields', () => {
      const result = computeNumericDiffs({}, { a: 1 })
      expect(result.diffs).toEqual({})
      expect(result.maxAbsDiff).toBe(0)
    })

    it('tracks the largest absolute diff across positive and negative', () => {
      const ts = { a: 100, b: 200, c: 300 }
      const wasm = { a: 105, b: 150, c: 310 }
      const result = computeNumericDiffs(ts, wasm)
      expect(result.diffs).toEqual({ a: 5, b: -50, c: 10 })
      expect(result.maxAbsDiff).toBe(50)
    })
  })

  describe('checkAllFinite', () => {
    it('returns ok when all values are finite', () => {
      expect(checkAllFinite({ a: 1, b: -2.5, c: 0 })).toBe('ok')
    })

    it('returns ok for empty record', () => {
      expect(checkAllFinite({})).toBe('ok')
    })

    it('returns violated on NaN', () => {
      expect(checkAllFinite({ a: 1, b: NaN })).toBe('violated')
    })

    it('returns violated on Infinity', () => {
      expect(checkAllFinite({ a: Infinity })).toBe('violated')
    })

    it('returns violated on -Infinity', () => {
      expect(checkAllFinite({ a: 1, b: -Infinity })).toBe('violated')
    })
  })

  describe('tolerance constants', () => {
    it('DEFAULT_TOLERANCE is 1e-10', () => {
      expect(DEFAULT_TOLERANCE).toBe(1e-10)
    })

    it('ANALYSIS_TOLERANCE is 1e-8 and looser than DEFAULT_TOLERANCE', () => {
      expect(ANALYSIS_TOLERANCE).toBe(1e-8)
      expect(ANALYSIS_TOLERANCE).toBeGreaterThan(DEFAULT_TOLERANCE)
    })
  })
})
