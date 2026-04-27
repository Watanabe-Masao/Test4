/**
 * semanticColors — sc.cond / sc.cond3 / sc.achievement / sc.gpRate tests
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { sc } from '../semanticColors'

describe('sc.cond', () => {
  it('true → positive', () => {
    expect(sc.cond(true)).toBe(sc.positive)
  })

  it('false → negative', () => {
    expect(sc.cond(false)).toBe(sc.negative)
  })
})

describe('sc.cond3', () => {
  it('isPositive=true → positive（caution 引数は無視）', () => {
    expect(sc.cond3(true, true)).toBe(sc.positive)
    expect(sc.cond3(true, false)).toBe(sc.positive)
  })

  it('isPositive=false + isCaution=true → caution', () => {
    expect(sc.cond3(false, true)).toBe(sc.caution)
  })

  it('両方 false → negative', () => {
    expect(sc.cond3(false, false)).toBe(sc.negative)
  })
})

describe('sc.achievement', () => {
  it('rate >= 1 → positive', () => {
    expect(sc.achievement(1.0)).toBe(sc.positive)
    expect(sc.achievement(1.5)).toBe(sc.positive)
  })

  it('rate >= 0.9（デフォルト警告閾値）→ caution', () => {
    expect(sc.achievement(0.9)).toBe(sc.caution)
    expect(sc.achievement(0.95)).toBe(sc.caution)
  })

  it('rate < 0.9 → negative', () => {
    expect(sc.achievement(0.89)).toBe(sc.negative)
    expect(sc.achievement(0.5)).toBe(sc.negative)
    expect(sc.achievement(0)).toBe(sc.negative)
  })

  it('cautionThreshold をカスタム指定できる', () => {
    expect(sc.achievement(0.85, 0.8)).toBe(sc.caution)
    expect(sc.achievement(0.79, 0.8)).toBe(sc.negative)
  })
})

describe('sc.gpRate', () => {
  it('rate >= target → positive', () => {
    expect(sc.gpRate(0.3, 0.25, 0.2)).toBe(sc.positive)
    expect(sc.gpRate(0.25, 0.25, 0.2)).toBe(sc.positive)
  })

  it('rate >= warning（target 未満）→ caution', () => {
    expect(sc.gpRate(0.22, 0.25, 0.2)).toBe(sc.caution)
    expect(sc.gpRate(0.2, 0.25, 0.2)).toBe(sc.caution)
  })

  it('rate < warning → negative', () => {
    expect(sc.gpRate(0.19, 0.25, 0.2)).toBe(sc.negative)
    expect(sc.gpRate(0.0, 0.25, 0.2)).toBe(sc.negative)
    expect(sc.gpRate(-0.1, 0.25, 0.2)).toBe(sc.negative)
  })
})

describe('sc 色定数', () => {
  it('positive / negative / caution は HEX 色値', () => {
    expect(sc.positive).toMatch(/^#[0-9a-f]{6}$/i)
    expect(sc.negative).toMatch(/^#[0-9a-f]{6}$/i)
    expect(sc.caution).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('Dark 色も HEX', () => {
    expect(sc.positiveDark).toMatch(/^#[0-9a-f]{6}$/i)
    expect(sc.negativeDark).toMatch(/^#[0-9a-f]{6}$/i)
    expect(sc.cautionDark).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('neutral は HEX 色値（palette.slate）', () => {
    expect(sc.neutral).toMatch(/^#[0-9a-f]{6}$/i)
  })
})
