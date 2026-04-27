/**
 * widgets/types.ts — wowPrevRange / comparisonLabels tests
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { wowPrevRange, comparisonLabels } from '../types'

describe('wowPrevRange', () => {
  it('dayStart-7 と dayEnd-7 を返す', () => {
    const r = wowPrevRange(15, 21)
    expect(r.prevStart).toBe(8)
    expect(r.prevEnd).toBe(14)
  })

  it('prevStart >= 1 なら isValid=true', () => {
    expect(wowPrevRange(8, 14).isValid).toBe(true)
  })

  it('prevStart=1 は境界 valid', () => {
    expect(wowPrevRange(8, 10).isValid).toBe(true)
  })

  it('prevStart < 1 なら isValid=false', () => {
    expect(wowPrevRange(7, 10).isValid).toBe(false)
  })

  it('単一日 dayStart=dayEnd でも計算', () => {
    const r = wowPrevRange(10, 10)
    expect(r.prevStart).toBe(3)
    expect(r.prevEnd).toBe(3)
  })
})

describe('comparisonLabels', () => {
  it('yoy モード: 当期ラベルは ${year}年', () => {
    const r = comparisonLabels('yoy', 2026, 1, 31)
    expect(r.curLabel).toBe('2026年')
  })

  it('yoy モード: prevYear 指定で prev ラベルは ${prevYear}年', () => {
    const r = comparisonLabels('yoy', 2026, 1, 31, 2025)
    expect(r.prevLabel).toBe('2025年')
  })

  it('yoy モード: prevYear 未指定で generic 「前年」', () => {
    const r = comparisonLabels('yoy', 2026, 1, 31)
    expect(r.prevLabel).toBe('前年')
  })

  it('wow モード: 単一日なら N日', () => {
    const r = comparisonLabels('wow', 2026, 15, 15)
    expect(r.curLabel).toBe('15日')
    expect(r.prevLabel).toBe('8日')
  })

  it('wow モード: 範囲なら N-M日', () => {
    const r = comparisonLabels('wow', 2026, 15, 21)
    expect(r.curLabel).toBe('15-21日')
    expect(r.prevLabel).toBe('8-14日')
  })

  it('wow モード: year は curLabel に含まれない（日ベース）', () => {
    const r = comparisonLabels('wow', 2026, 10, 10)
    expect(r.curLabel).not.toContain('2026')
  })
})
