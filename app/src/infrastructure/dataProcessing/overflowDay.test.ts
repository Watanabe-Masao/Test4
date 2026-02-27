import { describe, it, expect } from 'vitest'
import { detectDaysInTargetMonth, resolveDay } from './overflowDay'

/* ── detectDaysInTargetMonth ──────────────────── */

describe('detectDaysInTargetMonth', () => {
  it('通常月の日数を検出する（1月=31日, 4月=30日）', () => {
    const rows = [['header'], ['2025-01-15', 'data']]
    expect(detectDaysInTargetMonth(rows, 0, 1, 1)).toBe(31)

    const rows2 = [['header'], ['2025-04-10', 'data']]
    expect(detectDaysInTargetMonth(rows2, 0, 1, 4)).toBe(30)
  })

  it('2月の日数を検出する（平年=28日）', () => {
    const rows = [['header'], ['2025-02-01', 'data']]
    expect(detectDaysInTargetMonth(rows, 0, 1, 2)).toBe(28)
  })

  it('うるう年2月の日数を検出する（2024年=29日）', () => {
    const rows = [['header'], ['2024-02-01', 'data']]
    expect(detectDaysInTargetMonth(rows, 0, 1, 2)).toBe(29)
  })

  it('対象月のデータがない場合は0を返す', () => {
    const rows = [['header'], ['2025-03-01', 'data']]
    expect(detectDaysInTargetMonth(rows, 0, 1, 1)).toBe(0)
  })
})

/* ── resolveDay ────────────────────────────────── */

describe('resolveDay', () => {
  it('targetMonth未指定の場合はdate.getDate()をそのまま返す', () => {
    const date = new Date(2025, 0, 15) // Jan 15
    expect(resolveDay(date, undefined, 31, 3)).toBe(15)
  })

  it('対象月に合致する場合はdate.getDate()を返す', () => {
    const date = new Date(2025, 0, 20) // Jan 20
    expect(resolveDay(date, 1, 31, 3)).toBe(20)
  })

  it('翌月先頭のオーバーフロー日を拡張day番号で返す', () => {
    // 1月31日の次: 2月1日 → day 32 (31 + 1)
    const date = new Date(2025, 1, 1) // Feb 1
    expect(resolveDay(date, 1, 31, 3)).toBe(32)

    // 2月2日 → day 33 (31 + 2)
    const date2 = new Date(2025, 1, 2) // Feb 2
    expect(resolveDay(date2, 1, 31, 3)).toBe(33)
  })

  it('overflowDays範囲外の翌月日付はnullを返す', () => {
    // overflowDays=3 で翌月4日目以降
    const date = new Date(2025, 1, 4) // Feb 4
    expect(resolveDay(date, 1, 31, 3)).toBeNull()
  })

  it('対象月でも翌月でもない日付はnullを返す', () => {
    const date = new Date(2025, 2, 15) // Mar 15
    expect(resolveDay(date, 1, 31, 3)).toBeNull()
  })

  it('overflowDays=0の場合はオーバーフローなし', () => {
    const date = new Date(2025, 1, 1) // Feb 1
    expect(resolveDay(date, 1, 31, 0)).toBeNull()
  })

  it('12月→1月の年またぎオーバーフロー', () => {
    // targetMonth=12, nextMonth=1
    const date = new Date(2026, 0, 1) // Jan 1, 2026
    expect(resolveDay(date, 12, 31, 3)).toBe(32)
  })
})
