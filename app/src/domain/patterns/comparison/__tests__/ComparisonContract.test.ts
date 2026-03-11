import { describe, it, expect } from 'vitest'
import { createComparisonEntry, createComparisonResult, findEntry } from '../ComparisonContract'

describe('ComparisonContract', () => {
  describe('createComparisonEntry', () => {
    it('sameDayOfWeek のラベルを正しく設定する', () => {
      const entry = createComparisonEntry('sameDayOfWeek', { value: 100 }, true)
      expect(entry.policy).toBe('sameDayOfWeek')
      expect(entry.label).toBe('前年同曜日')
      expect(entry.shortLabel).toBe('同曜日')
      expect(entry.data).toEqual({ value: 100 })
      expect(entry.hasData).toBe(true)
    })

    it('sameDate のラベルを正しく設定する', () => {
      const entry = createComparisonEntry('sameDate', 42, false)
      expect(entry.policy).toBe('sameDate')
      expect(entry.label).toBe('前年同日')
      expect(entry.shortLabel).toBe('同日')
      expect(entry.hasData).toBe(false)
    })
  })

  describe('createComparisonResult', () => {
    it('current と entries を正しく構造化する', () => {
      const entry = createComparisonEntry('sameDayOfWeek', 200, true)
      const result = createComparisonResult(100, [entry])
      expect(result.current).toBe(100)
      expect(result.entries).toHaveLength(1)
      expect(result.dowGap).toBeNull()
      expect(result.frame).toBeNull()
    })

    it('dowGap と frame を渡せる', () => {
      const entry = createComparisonEntry('sameDate', 0, false)
      const frame = {
        current: { from: { year: 2026, month: 3, day: 1 }, to: { year: 2026, month: 3, day: 31 } },
        previous: {
          from: { year: 2025, month: 3, day: 1 },
          to: { year: 2025, month: 3, day: 31 },
        },
        dowOffset: 0,
        policy: 'sameDate' as const,
      }
      const result = createComparisonResult(0, [entry], null, frame)
      expect(result.frame).toBe(frame)
    })
  })

  describe('findEntry', () => {
    it('指定ポリシーのエントリを返す', () => {
      const sameDow = createComparisonEntry('sameDayOfWeek', 'A', true)
      const sameDate = createComparisonEntry('sameDate', 'B', true)
      const result = createComparisonResult('current', [sameDow, sameDate])

      expect(findEntry(result, 'sameDayOfWeek')?.data).toBe('A')
      expect(findEntry(result, 'sameDate')?.data).toBe('B')
    })

    it('存在しないポリシーで undefined を返す', () => {
      const entry = createComparisonEntry('sameDayOfWeek', 1, true)
      const result = createComparisonResult(0, [entry])
      expect(findEntry(result, 'sameDate')).toBeUndefined()
    })
  })
})
