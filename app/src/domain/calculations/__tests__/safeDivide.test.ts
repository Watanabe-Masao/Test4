/**
 * safeDivide 仕様固定テスト
 *
 * Phase 5 前提: Rust/WASM 移行時に TS と Rust の safeDivide が完全一致することを保証する。
 * このテストは TS 現行実装の動作を仕様として固定する。
 */
import { describe, it, expect } from 'vitest'
import { safeDivide } from '../utils'

describe('safeDivide — 仕様固定', () => {
  it('通常の除算', () => {
    expect(safeDivide(10, 2, 0)).toBe(5)
    expect(safeDivide(7, 3, 0)).toBeCloseTo(2.3333333333333335, 14)
    expect(safeDivide(-6, 3, 0)).toBe(-2)
    expect(safeDivide(6, -3, 0)).toBe(-2)
    expect(safeDivide(-6, -3, 0)).toBe(2)
  })

  it('denominator === 0 → fallback', () => {
    expect(safeDivide(10, 0, 0)).toBe(0)
    expect(safeDivide(10, 0, 99)).toBe(99)
    expect(safeDivide(0, 0, 0)).toBe(0)
    expect(safeDivide(0, 0, -1)).toBe(-1)
  })

  it('denominator === -0 → fallback（-0 !== 0 は false）', () => {
    expect(safeDivide(10, -0, 0)).toBe(0)
    expect(safeDivide(10, -0, 42)).toBe(42)
  })

  it('denominator が NaN → NaN（ガードしない: NaN !== 0 は true）', () => {
    expect(safeDivide(10, NaN, 0)).toBeNaN()
    expect(safeDivide(0, NaN, 0)).toBeNaN()
    expect(safeDivide(NaN, NaN, 0)).toBeNaN()
  })

  it('numerator が NaN → NaN（IEEE 754: NaN / x = NaN）', () => {
    expect(safeDivide(NaN, 5, 0)).toBeNaN()
    expect(safeDivide(NaN, 0, 99)).toBe(99) // den === 0 で fallback が先
  })

  it('denominator が Infinity → 0（IEEE 754: x / ±∞ = 0）', () => {
    expect(safeDivide(10, Infinity, 0)).toBe(0)
    expect(safeDivide(10, -Infinity, 0)).toBe(-0)
    expect(safeDivide(-10, Infinity, 0)).toBe(-0)
    expect(safeDivide(-10, -Infinity, 0)).toBe(0)
  })

  it('numerator が Infinity', () => {
    expect(safeDivide(Infinity, 2, 0)).toBe(Infinity)
    expect(safeDivide(-Infinity, 2, 0)).toBe(-Infinity)
    expect(safeDivide(Infinity, Infinity, 0)).toBeNaN() // IEEE 754: ∞ / ∞ = NaN
  })

  it('fallback のデフォルトは 0', () => {
    expect(safeDivide(10, 0)).toBe(0)
  })
})
