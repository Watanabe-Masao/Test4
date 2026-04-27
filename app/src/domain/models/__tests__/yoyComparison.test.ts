/**
 * yoyComparison のユニットテスト
 *
 * PeriodComparison の計算ロジック（ratio, difference, growthRate）と
 * ゼロ除算ハンドリングを検証する。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { comparePeriods, hasReferenceData } from '@/domain/models/yoyComparison'

describe('comparePeriods', () => {
  it('positive growth を計算する', () => {
    const r = comparePeriods(120, 100)
    expect(r.current).toBe(120)
    expect(r.reference).toBe(100)
    expect(r.difference).toBe(20)
    expect(r.ratio).toBe(1.2)
    expect(r.growthRate).toBeCloseTo(0.2, 10)
  })

  it('negative growth を計算する', () => {
    const r = comparePeriods(80, 100)
    expect(r.difference).toBe(-20)
    expect(r.ratio).toBe(0.8)
    expect(r.growthRate).toBeCloseTo(-0.2, 10)
  })

  it('同値のとき ratio=1, growthRate=0', () => {
    const r = comparePeriods(100, 100)
    expect(r.difference).toBe(0)
    expect(r.ratio).toBe(1)
    expect(r.growthRate).toBe(0)
  })

  it('reference=0 で ratio=0, growthRate=0（ゼロ除算ガード）', () => {
    const r = comparePeriods(50, 0)
    expect(r.current).toBe(50)
    expect(r.reference).toBe(0)
    expect(r.difference).toBe(50)
    expect(r.ratio).toBe(0)
    expect(r.growthRate).toBe(0)
  })

  it('current=0, reference=0 で全て 0', () => {
    const r = comparePeriods(0, 0)
    expect(r.difference).toBe(0)
    expect(r.ratio).toBe(0)
    expect(r.growthRate).toBe(0)
  })

  it('negative reference でも計算できる', () => {
    const r = comparePeriods(-50, -100)
    expect(r.difference).toBe(50)
    expect(r.ratio).toBe(0.5)
    expect(r.growthRate).toBe(-0.5)
  })
})

describe('hasReferenceData', () => {
  it('reference≠0 のとき true', () => {
    expect(hasReferenceData(comparePeriods(100, 50))).toBe(true)
  })

  it('reference=0 のとき false', () => {
    expect(hasReferenceData(comparePeriods(100, 0))).toBe(false)
  })

  it('negative reference でも true', () => {
    expect(hasReferenceData(comparePeriods(100, -10))).toBe(true)
  })
})
