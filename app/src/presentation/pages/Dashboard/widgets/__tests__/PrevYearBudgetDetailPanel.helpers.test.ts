/**
 * PrevYearBudgetDetailPanel — date utility tests
 *
 * 検証対象:
 * - getDow: 日本語曜日番号（0=日〜6=土）
 * - weekNumber: 月曜始まり 1-based 週番号
 */
import { describe, it, expect } from 'vitest'
import { getDow, weekNumber } from '../PrevYearBudgetDetailPanel'

describe('getDow', () => {
  it('2026-03-01 は日曜（0）', () => {
    expect(getDow(2026, 3, 1)).toBe(0)
  })

  it('2026-03-02 は月曜（1）', () => {
    expect(getDow(2026, 3, 2)).toBe(1)
  })

  it('2026-03-07 は土曜（6）', () => {
    expect(getDow(2026, 3, 7)).toBe(6)
  })

  it('2026-01-01 は木曜（4）', () => {
    expect(getDow(2026, 1, 1)).toBe(4)
  })

  it('2028-02-29 は火曜（2）— うるう年', () => {
    expect(getDow(2028, 2, 29)).toBe(2)
  })
})

describe('weekNumber', () => {
  // 2026-03: 1 日 = 日曜（前週の末日） / 2 日 = 月曜（= week2 開始）
  // firstDow=0 → mondayBased=6 → (0+6)/7=0 → +1 → week 1（1日=日曜、週の最終日）
  // day=2: (1+6)/7=1 → +1 → week 2
  it('2026-03-01（月初の日曜）は week 1', () => {
    expect(weekNumber(2026, 3, 1)).toBe(1)
  })

  it('2026-03-02（月曜）は week 2', () => {
    expect(weekNumber(2026, 3, 2)).toBe(2)
  })

  it('2026-03-08（日曜、2 週目の末日）は week 2', () => {
    expect(weekNumber(2026, 3, 8)).toBe(2)
  })

  it('2026-03-09（月曜）は week 3', () => {
    expect(weekNumber(2026, 3, 9)).toBe(3)
  })

  it('2026-03-31（火曜）は week 6', () => {
    expect(weekNumber(2026, 3, 31)).toBe(6)
  })

  it('2026-02-02（月曜、2026-02-01 は日曜）は week 2', () => {
    expect(weekNumber(2026, 2, 2)).toBe(2)
  })

  it('2026-01-05（月曜、1月1日=木曜）は week 2（月曜始まり）', () => {
    // firstDow=4 → mondayBased=3 → (4+3)/7=1 → +1 → week 2
    expect(weekNumber(2026, 1, 5)).toBe(2)
  })

  it('月初の曜日が変わっても 1 日は week 1', () => {
    // 2026-04-01 は水曜 → firstDow=3 → mondayBased=2 → (0+2)/7=0 → +1 → week 1
    expect(weekNumber(2026, 4, 1)).toBe(1)
  })
})
