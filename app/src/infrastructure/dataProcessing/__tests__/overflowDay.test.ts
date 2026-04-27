/**
 * overflowDay.ts — pure helper test
 *
 * 検証対象:
 * - detectDaysInTargetMonth:
 *   - rows 空 → 0
 *   - 対象月が無い → 0
 *   - 対象月有 → その月の日数
 *   - 2月 (閏年 / 非閏年) 判定
 * - resolveDay:
 *   - targetMonth undefined → date.getDate()
 *   - 対象月一致 → date.getDate()
 *   - 翌月 + overflowDays 内 → daysInTargetMonth + date.getDate()
 *   - 翌月 + overflowDays=0 → null
 *   - 前月 → null
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { detectDaysInTargetMonth, resolveDay } from '../overflowDay'

// ─── detectDaysInTargetMonth ────────────────

describe('detectDaysInTargetMonth', () => {
  it('空 rows → 0', () => {
    expect(detectDaysInTargetMonth([], 0, 0, 4)).toBe(0)
  })

  it('対象月に合致する日付が無い → 0', () => {
    const rows = [['2026/01/15'], ['2026/01/20']]
    expect(detectDaysInTargetMonth(rows, 0, 0, 4)).toBe(0)
  })

  it('対象月 (4月) の日付 → 30', () => {
    const rows = [['2026/04/15']]
    expect(detectDaysInTargetMonth(rows, 0, 0, 4)).toBe(30)
  })

  it('対象月 (1月) → 31', () => {
    const rows = [['2026/01/15']]
    expect(detectDaysInTargetMonth(rows, 0, 0, 1)).toBe(31)
  })

  it('2026 年 2月 (非閏年) → 28', () => {
    const rows = [['2026/02/15']]
    expect(detectDaysInTargetMonth(rows, 0, 0, 2)).toBe(28)
  })

  it('2024 年 2月 (閏年) → 29', () => {
    const rows = [['2024/02/15']]
    expect(detectDaysInTargetMonth(rows, 0, 0, 2)).toBe(29)
  })

  it('dataStartRow からスキャン', () => {
    const rows = [['HEADER'], ['SUB'], ['2026/04/15']]
    expect(detectDaysInTargetMonth(rows, 0, 2, 4)).toBe(30)
  })

  it('dateColIndex で列指定', () => {
    const rows = [['store', '2026/04/15', 'other']]
    expect(detectDaysInTargetMonth(rows, 1, 0, 4)).toBe(30)
  })
})

// ─── resolveDay ───────────────────────────

describe('resolveDay', () => {
  it('targetMonth undefined → date.getDate()', () => {
    const date = new Date(2026, 3, 15) // April 15
    expect(resolveDay(date, undefined, 0, 0)).toBe(15)
  })

  it('対象月と一致 → date.getDate()', () => {
    const date = new Date(2026, 3, 15) // April 15
    expect(resolveDay(date, 4, 30, 0)).toBe(15)
  })

  it('翌月 + overflowDays=6 以内 → daysInTargetMonth + date', () => {
    // 4月 targetMonth, daysInTarget=30, 5/3 → 33
    const date = new Date(2026, 4, 3) // May 3
    expect(resolveDay(date, 4, 30, 6)).toBe(33)
  })

  it('翌月 + overflowDays=0 → null', () => {
    const date = new Date(2026, 4, 3) // May 3
    expect(resolveDay(date, 4, 30, 0)).toBeNull()
  })

  it('翌月 + date > overflowDays → null', () => {
    const date = new Date(2026, 4, 10) // May 10 > 6 overflowDays
    expect(resolveDay(date, 4, 30, 6)).toBeNull()
  })

  it('前月 → null', () => {
    const date = new Date(2026, 2, 30) // March 30
    expect(resolveDay(date, 4, 30, 6)).toBeNull()
  })

  it('前年同月 → null (月番号は一致するが年が違う場合は undefined behavior — 現実装では一致)', () => {
    // This implementation only checks month, not year
    const date = new Date(2025, 3, 15) // April 2025
    expect(resolveDay(date, 4, 30, 0)).toBe(15)
  })

  it('12 月 targetMonth → nextMonth=1 (wrap around)', () => {
    // 12月 targetMonth, daysInTarget=31, 1/3 → 34
    const date = new Date(2026, 0, 3) // January 3
    expect(resolveDay(date, 12, 31, 5)).toBe(34)
  })

  it('daysInTargetMonth=0 → null (guard)', () => {
    const date = new Date(2026, 4, 3)
    expect(resolveDay(date, 4, 0, 5)).toBeNull()
  })
})
