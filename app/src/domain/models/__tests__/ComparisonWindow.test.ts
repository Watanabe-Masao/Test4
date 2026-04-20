/**
 * ComparisonWindow — factory tests
 *
 * 検証対象:
 * - currentOnly / yoyWindow / wowWindow の 3 ファクトリ
 * - discriminated union の kind が正しい
 */
import { describe, it, expect } from 'vitest'
import { currentOnly, yoyWindow, wowWindow } from '../ComparisonWindow'
import type { DateRange } from '../CalendarDate'

const sampleRange: DateRange = {
  from: { year: 2025, month: 3, day: 1 },
  to: { year: 2025, month: 3, day: 31 },
}

describe('currentOnly', () => {
  it('kind=current-only のみ', () => {
    const w = currentOnly()
    expect(w.kind).toBe('current-only')
    expect(Object.keys(w)).toEqual(['kind'])
  })
})

describe('yoyWindow', () => {
  it('kind=yoy + comparisonRange', () => {
    const w = yoyWindow(sampleRange)
    expect(w.kind).toBe('yoy')
    expect(w.comparisonRange).toBe(sampleRange)
  })

  it('dowOffset を渡せる（同曜日比較用）', () => {
    const w = yoyWindow(sampleRange, 3)
    expect(w.dowOffset).toBe(3)
  })

  it('dowOffset 省略時は undefined', () => {
    const w = yoyWindow(sampleRange)
    expect(w.dowOffset).toBeUndefined()
  })

  it('dowOffset=0 を保持（false-y でも省略しない）', () => {
    const w = yoyWindow(sampleRange, 0)
    expect(w.dowOffset).toBe(0)
  })
})

describe('wowWindow', () => {
  it('kind=wow + comparisonRange', () => {
    const w = wowWindow(sampleRange)
    expect(w.kind).toBe('wow')
    expect(w.comparisonRange).toBe(sampleRange)
  })
})

describe('discriminated union', () => {
  it('kind による narrowing が機能する（型レベル＋runtime 両方）', () => {
    const windows = [currentOnly(), yoyWindow(sampleRange), wowWindow(sampleRange)]
    for (const w of windows) {
      switch (w.kind) {
        case 'current-only':
          expect(w).not.toHaveProperty('comparisonRange')
          break
        case 'yoy':
        case 'wow':
          expect(w).toHaveProperty('comparisonRange')
          break
      }
    }
  })
})
