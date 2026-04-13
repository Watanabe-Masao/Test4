import { describe, it, expect } from 'vitest'
import {
  achievementColor,
  rateDiffColor,
  resultColor,
  formatPercent100,
  fmtValue,
  fmtAchievement,
  dayLabel,
} from '../conditionSummaryFormatters'

describe('achievementColor', () => {
  it('returns green when >= 100', () => {
    expect(achievementColor(100)).toBe('#10b981')
    expect(achievementColor(120)).toBe('#10b981')
  })
  it('returns yellow when in [97, 100)', () => {
    expect(achievementColor(97)).toBe('#eab308')
    expect(achievementColor(99.9)).toBe('#eab308')
  })
  it('returns red when < 97', () => {
    expect(achievementColor(96.99)).toBe('#ef4444')
    expect(achievementColor(0)).toBe('#ef4444')
  })
})

describe('rateDiffColor', () => {
  it('returns green when >= 0', () => {
    expect(rateDiffColor(0)).toBe('#10b981')
    expect(rateDiffColor(5)).toBe('#10b981')
  })
  it('returns yellow when in [-0.5, 0)', () => {
    expect(rateDiffColor(-0.1)).toBe('#eab308')
    expect(rateDiffColor(-0.5)).toBe('#eab308')
  })
  it('returns red when < -0.5', () => {
    expect(rateDiffColor(-0.6)).toBe('#ef4444')
    expect(rateDiffColor(-10)).toBe('#ef4444')
  })
})

describe('resultColor', () => {
  it('delegates to rateDiffColor when isRate is true', () => {
    expect(resultColor(0, true)).toBe('#10b981')
    expect(resultColor(-1, true)).toBe('#ef4444')
  })
  it('delegates to achievementColor when isRate is false', () => {
    expect(resultColor(100, false)).toBe('#10b981')
    expect(resultColor(96, false)).toBe('#ef4444')
  })
})

describe('formatPercent100', () => {
  it('formats already-scaled percent with 2 decimals', () => {
    expect(formatPercent100(99.5)).toBe('99.50%')
    expect(formatPercent100(0)).toBe('0.00%')
  })
  it('handles negative values', () => {
    expect(formatPercent100(-1.25)).toBe('-1.25%')
  })
})

describe('fmtValue', () => {
  it('formats rate values as percent', () => {
    expect(fmtValue(12.34, true)).toBe('12.34%')
  })
  it('formats non-rate values with comma separator and no decimals', () => {
    expect(fmtValue(1234567, false)).toBe('1,234,567')
    expect(fmtValue(0, false)).toBe('0')
  })
  it('rounds decimals for non-rate values', () => {
    expect(fmtValue(1234.9, false)).toBe('1,235')
  })
})

describe('fmtAchievement', () => {
  it('formats non-rate as percent', () => {
    expect(fmtAchievement(99.5, false)).toBe('99.50%')
  })
  it('uses pp suffix and + sign for positive rate diff', () => {
    expect(fmtAchievement(1.25, true)).toBe('+1.25pp')
  })
  it('uses pp suffix for zero rate diff with +', () => {
    expect(fmtAchievement(0, true)).toBe('+0.00pp')
  })
  it('uses pp suffix for negative rate diff without extra +', () => {
    expect(fmtAchievement(-2.5, true)).toBe('-2.50pp')
  })
})

describe('dayLabel', () => {
  it('appends DOW label in parentheses', () => {
    // 2024-03-01 is Friday → 金
    expect(dayLabel(1, 2024, 3)).toBe('1(金)')
  })
  it('handles Sunday', () => {
    // 2024-03-03 is Sunday → 日
    expect(dayLabel(3, 2024, 3)).toBe('3(日)')
  })
  it('handles end-of-month', () => {
    // 2024-03-31 is Sunday → 日
    expect(dayLabel(31, 2024, 3)).toBe('31(日)')
  })
})
