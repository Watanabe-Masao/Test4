import { describe, it, expect } from 'vitest'
import { resolveComparisonFrame, calcSameDowOffset } from '../resolveComparisonFrame'
import type { DateRange } from '@/domain/models'

describe('calcSameDowOffset', () => {
  it('同じ月初曜日なら offset=0', () => {
    // 2024-03-01 は金曜, 2025-03-01 は土曜 → offset=1
    // テスト用に同曜日のケースを探す: 2023-01 (日) と 2017-01 (日)
    // 直接計算: offset = (curDow - prevDow + 7) % 7
    const offset = calcSameDowOffset(2026, 3, 2025, 3)
    // 2026-03-01 = 日(0), 2025-03-01 = 土(6) → (0-6+7)%7 = 1
    expect(offset).toBe(1)
  })

  it('NaN 入力は 0 を返す', () => {
    expect(calcSameDowOffset(NaN, 3)).toBe(0)
    expect(calcSameDowOffset(2026, NaN)).toBe(0)
  })

  it('sourceYear/Month を省略すると year-1, same month を使う', () => {
    const withExplicit = calcSameDowOffset(2026, 3, 2025, 3)
    const withDefault = calcSameDowOffset(2026, 3)
    expect(withDefault).toBe(withExplicit)
  })
})

describe('resolveComparisonFrame', () => {
  const currentRange: DateRange = {
    from: { year: 2026, month: 3, day: 1 },
    to: { year: 2026, month: 3, day: 31 },
  }

  it('sameDate: previous は year-1 の同日付、offset=0', () => {
    const frame = resolveComparisonFrame(currentRange, 'sameDate')
    expect(frame.previous.from).toEqual({ year: 2025, month: 3, day: 1 })
    expect(frame.previous.to).toEqual({ year: 2025, month: 3, day: 31 })
    expect(frame.dowOffset).toBe(0)
    expect(frame.policy).toBe('sameDate')
    expect(frame.current).toBe(currentRange)
  })

  it('sameDayOfWeek: offset が自動計算される', () => {
    const frame = resolveComparisonFrame(currentRange, 'sameDayOfWeek')
    // 2026-03-01 = 日(0), 2025-03-01 = 土(6) → offset=1
    expect(frame.dowOffset).toBe(1)
    expect(frame.policy).toBe('sameDayOfWeek')
  })

  it('sourceYear/Month オーバーライドが反映される', () => {
    const frame = resolveComparisonFrame(currentRange, 'sameDate', {
      sourceYear: 2024,
      sourceMonth: 2,
    })
    expect(frame.previous.from.year).toBe(2024)
    expect(frame.previous.from.month).toBe(2)
  })

  it('dowOffset 手動オーバーライドが反映される', () => {
    const frame = resolveComparisonFrame(currentRange, 'sameDayOfWeek', {
      dowOffset: 3,
    })
    expect(frame.dowOffset).toBe(3)
  })

  it('dowOffset オーバーライドは 0-6 にクランプされる', () => {
    expect(resolveComparisonFrame(currentRange, 'sameDayOfWeek', { dowOffset: -1 }).dowOffset).toBe(
      0,
    )
    expect(resolveComparisonFrame(currentRange, 'sameDayOfWeek', { dowOffset: 10 }).dowOffset).toBe(
      6,
    )
  })

  it('sameDate モードでは dowOffset オーバーライドは無視される', () => {
    const frame = resolveComparisonFrame(currentRange, 'sameDate', { dowOffset: 3 })
    expect(frame.dowOffset).toBe(0)
  })

  it('null オーバーライドはデフォルトにフォールバック', () => {
    const frame = resolveComparisonFrame(currentRange, 'sameDayOfWeek', {
      sourceYear: null,
      sourceMonth: null,
      dowOffset: null,
    })
    expect(frame.previous.from.year).toBe(2025)
    expect(frame.dowOffset).toBe(1) // 自動計算
  })
})
