import { describe, it, expect } from 'vitest'
import {
  calendarToSerial,
  dateKeyToSerial,
  serialToDateKey,
  serialToCalendar,
  daysBetween,
  serialToDow,
} from './DaySerial'

describe('DaySerial', () => {
  describe('calendarToSerial / serialToCalendar roundtrip', () => {
    it('基準日 2000-01-01 → serial 0', () => {
      const serial = calendarToSerial({ year: 2000, month: 1, day: 1 })
      expect(serial).toBe(0)
    })

    it('2000-01-02 → serial 1', () => {
      expect(calendarToSerial({ year: 2000, month: 1, day: 2 })).toBe(1)
    })

    it('2026-03-01 のラウンドトリップ', () => {
      const date = { year: 2026, month: 3, day: 1 }
      const serial = calendarToSerial(date)
      const back = serialToCalendar(serial)
      expect(back).toEqual(date)
    })

    it('2025-12-31 のラウンドトリップ', () => {
      const date = { year: 2025, month: 12, day: 31 }
      const serial = calendarToSerial(date)
      const back = serialToCalendar(serial)
      expect(back).toEqual(date)
    })

    it('うるう年 2024-02-29 のラウンドトリップ', () => {
      const date = { year: 2024, month: 2, day: 29 }
      const serial = calendarToSerial(date)
      const back = serialToCalendar(serial)
      expect(back).toEqual(date)
    })
  })

  describe('dateKeyToSerial / serialToDateKey roundtrip', () => {
    it('2026-03-07 のラウンドトリップ', () => {
      const key = '2026-03-07'
      const serial = dateKeyToSerial(key)
      expect(serialToDateKey(serial)).toBe(key)
    })

    it('2000-01-01 → serial 0', () => {
      expect(dateKeyToSerial('2000-01-01')).toBe(0)
    })
  })

  describe('連続性（日数差が正しい）', () => {
    it('3/1 と 3/7 の差は 6', () => {
      const s1 = dateKeyToSerial('2026-03-01')
      const s2 = dateKeyToSerial('2026-03-07')
      expect(s2 - s1).toBe(6)
    })

    it('月跨ぎ: 2/28 と 3/1 の差は 1', () => {
      const s1 = dateKeyToSerial('2026-02-28')
      const s2 = dateKeyToSerial('2026-03-01')
      expect(s2 - s1).toBe(1)
    })

    it('年跨ぎ: 12/31 と 1/1 の差は 1', () => {
      const s1 = dateKeyToSerial('2025-12-31')
      const s2 = dateKeyToSerial('2026-01-01')
      expect(s2 - s1).toBe(1)
    })

    it('うるう年: 2/28 と 3/1 の差は 2', () => {
      const s1 = dateKeyToSerial('2024-02-28')
      const s2 = dateKeyToSerial('2024-03-01')
      expect(s2 - s1).toBe(2) // 2/29 があるので
    })
  })

  describe('daysBetween', () => {
    it('同日なら 0', () => {
      const s = dateKeyToSerial('2026-03-01')
      expect(daysBetween(s, s)).toBe(0)
    })

    it('7日間の差', () => {
      const a = dateKeyToSerial('2026-03-01')
      const b = dateKeyToSerial('2026-03-08')
      expect(daysBetween(a, b)).toBe(7)
    })
  })

  describe('serialToDow', () => {
    it('2000-01-01 (土曜日) → 6', () => {
      const serial = calendarToSerial({ year: 2000, month: 1, day: 1 })
      expect(serialToDow(serial)).toBe(6) // Saturday
    })

    it('2026-03-09 (月曜日) → 1', () => {
      const serial = calendarToSerial({ year: 2026, month: 3, day: 9 })
      expect(serialToDow(serial)).toBe(1) // Monday
    })

    it('2026-03-01 (日曜日) → 0', () => {
      const serial = calendarToSerial({ year: 2026, month: 3, day: 1 })
      expect(serialToDow(serial)).toBe(0) // Sunday
    })

    it('Date.getDay() と一致する', () => {
      // 複数の日付で検証
      const dates = [
        '2026-01-01',
        '2026-02-14',
        '2026-03-09',
        '2026-07-04',
        '2026-12-25',
        '2024-02-29',
      ]
      for (const key of dates) {
        const serial = dateKeyToSerial(key)
        const parts = key.split('-')
        const jsDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
        expect(serialToDow(serial)).toBe(jsDate.getDay())
      }
    })
  })
})
