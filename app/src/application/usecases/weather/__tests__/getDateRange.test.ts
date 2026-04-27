/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { getDateRange } from '../WeatherLoadService'

describe('getDateRange', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('過去月: endDate は月末になる', () => {
    // 2026-03-17 に 2026-01 を取得 → 1/1〜1/31
    vi.useFakeTimers({ now: new Date(2026, 2, 17) }) // March 17
    const { startDate, endDate } = getDateRange(2026, 1)
    expect(startDate).toBe('2026-01-01')
    expect(endDate).toBe('2026-01-31')
  })

  it('当月: endDate は昨日にクランプされる', () => {
    vi.useFakeTimers({ now: new Date(2026, 2, 17) }) // March 17
    const { startDate, endDate } = getDateRange(2026, 3)
    expect(startDate).toBe('2026-03-01')
    expect(endDate).toBe('2026-03-16') // yesterday
  })

  it('未来月: startDate > endDate になる（呼び出し元がスキップ）', () => {
    vi.useFakeTimers({ now: new Date(2026, 2, 17) })
    const { startDate, endDate } = getDateRange(2026, 4)
    expect(startDate).toBe('2026-04-01')
    expect(endDate).toBe('2026-03-16') // clamped to yesterday
    expect(startDate > endDate).toBe(true)
  })

  it('月初1日: endDate は前月末にクランプされる', () => {
    vi.useFakeTimers({ now: new Date(2026, 2, 1) }) // March 1
    const { startDate, endDate } = getDateRange(2026, 3)
    expect(startDate).toBe('2026-03-01')
    expect(endDate).toBe('2026-02-28') // yesterday = Feb 28
    // 当月初日は全範囲が未来扱い → スキップ
    expect(startDate > endDate).toBe(true)
  })

  it('月末日: endDate は月末-1日にクランプされる', () => {
    vi.useFakeTimers({ now: new Date(2026, 2, 31) }) // March 31
    const { startDate, endDate } = getDateRange(2026, 3)
    expect(startDate).toBe('2026-03-01')
    expect(endDate).toBe('2026-03-30') // yesterday
  })

  it('endDate は end_date=月末 を超えない（過去月は月末のまま）', () => {
    vi.useFakeTimers({ now: new Date(2026, 5, 15) }) // June 15
    const { startDate, endDate } = getDateRange(2026, 3)
    expect(startDate).toBe('2026-03-01')
    expect(endDate).toBe('2026-03-31') // past month → full range
  })
})
