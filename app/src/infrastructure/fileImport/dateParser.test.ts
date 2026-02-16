import { describe, it, expect } from 'vitest'
import { parseDate, getDayOfMonth } from './dateParser'

describe('parseDate', () => {
  it('Excelシリアル値（数値）', () => {
    // 45337 → 2024-02-15 (UTC)
    const date = parseDate(45337)
    expect(date).not.toBeNull()
    expect(date!.getUTCFullYear()).toBe(2024)
    expect(date!.getUTCMonth()).toBe(1) // 0-indexed
    expect(date!.getUTCDate()).toBe(15)
  })

  it('Excelシリアル値（文字列）', () => {
    const date = parseDate('45337')
    expect(date).not.toBeNull()
    expect(date!.getUTCDate()).toBe(15)
  })

  it('日本語形式', () => {
    const date = parseDate('2026年2月15日')
    expect(date).not.toBeNull()
    expect(date!.getFullYear()).toBe(2026)
    expect(date!.getMonth()).toBe(1)
    expect(date!.getDate()).toBe(15)
  })

  it('ISO形式', () => {
    const date = parseDate('2026-02-15')
    expect(date).not.toBeNull()
    expect(date!.getFullYear()).toBe(2026)
    expect(date!.getDate()).toBe(15)
  })

  it('スラッシュ形式', () => {
    const date = parseDate('2026/02/15')
    expect(date).not.toBeNull()
    expect(date!.getFullYear()).toBe(2026)
    expect(date!.getDate()).toBe(15)
  })

  it('nullは null', () => {
    expect(parseDate(null)).toBeNull()
  })

  it('undefinedは null', () => {
    expect(parseDate(undefined)).toBeNull()
  })

  it('空文字は null', () => {
    expect(parseDate('')).toBeNull()
  })

  it('不正な文字列は null', () => {
    expect(parseDate('abc')).toBeNull()
  })

  it('範囲外の数値は null', () => {
    expect(parseDate(-1)).toBeNull()
    expect(parseDate(0)).toBeNull()
  })
})

describe('getDayOfMonth', () => {
  it('日付から日を取得', () => {
    expect(getDayOfMonth('2026-02-15')).toBe(15)
  })

  it('月初', () => {
    expect(getDayOfMonth('2026-02-01')).toBe(1)
  })

  it('月末', () => {
    expect(getDayOfMonth('2026-01-31')).toBe(31)
  })

  it('パース不能な値は null', () => {
    expect(getDayOfMonth('invalid')).toBeNull()
  })
})
