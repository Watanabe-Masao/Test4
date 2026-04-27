/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import {
  isComparisonWindow,
  type YoYWindow,
  type WoWWindow,
  type FallbackAwareWindow,
  type SingleWindow,
} from '@/features/comparison/domain/comparisonWindow'

const range = {
  from: { year: 2025, month: 1, day: 1 },
  to: { year: 2025, month: 1, day: 31 },
}

describe('isComparisonWindow', () => {
  it('returns true for yoy window', () => {
    const w: YoYWindow = { kind: 'yoy', current: range, target: range, dowOffset: 0 }
    expect(isComparisonWindow(w)).toBe(true)
  })

  it('returns true for wow window', () => {
    const w: WoWWindow = { kind: 'wow', current: range, target: range }
    expect(isComparisonWindow(w)).toBe(true)
  })

  it('returns true for fallback-aware window', () => {
    const w: FallbackAwareWindow = {
      kind: 'fallback-aware',
      current: range,
      target: range,
      preferPrevYear: true,
    }
    expect(isComparisonWindow(w)).toBe(true)
  })

  it('returns false for single window', () => {
    const w: SingleWindow = { kind: 'single', current: range }
    expect(isComparisonWindow(w)).toBe(false)
  })

  it('narrows type correctly for comparison windows (compile-time check)', () => {
    const w: YoYWindow = { kind: 'yoy', current: range, target: range, dowOffset: 1 }
    if (isComparisonWindow(w)) {
      expect(w.target).toBe(range)
      expect(w.dowOffset).toBe(1)
    } else {
      throw new Error('expected comparison window')
    }
  })

  it('preserves dowOffset field in yoy window', () => {
    const w: YoYWindow = { kind: 'yoy', current: range, target: range, dowOffset: 3 }
    expect(w.dowOffset).toBe(3)
    expect(isComparisonWindow(w)).toBe(true)
  })
})
