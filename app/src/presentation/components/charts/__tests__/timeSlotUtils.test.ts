/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import { formatCoreTime, formatTurnaroundHour } from '../timeSlotUtils'

describe('formatCoreTime', () => {
  it('returns a "start〜end時" string for a range', () => {
    expect(formatCoreTime({ startHour: 11, endHour: 13 })).toBe('11〜13時')
  })

  it('returns "-" for null input', () => {
    expect(formatCoreTime(null)).toBe('-')
  })

  it('handles identical start and end', () => {
    expect(formatCoreTime({ startHour: 9, endHour: 9 })).toBe('9〜9時')
  })

  it('handles overnight-like range (no wrap handling expected)', () => {
    expect(formatCoreTime({ startHour: 22, endHour: 2 })).toBe('22〜2時')
  })
})

describe('formatTurnaroundHour', () => {
  it('returns "n時台" for a number', () => {
    expect(formatTurnaroundHour(12)).toBe('12時台')
  })

  it('returns "-" for null', () => {
    expect(formatTurnaroundHour(null)).toBe('-')
  })

  it('handles zero hour', () => {
    expect(formatTurnaroundHour(0)).toBe('0時台')
  })
})
