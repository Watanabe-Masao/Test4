/**
 * resolveDayDetailRanges の境界値テスト
 *
 * 前年同曜日モードで累計前年範囲が当年と同じ日数分になることを検証する。
 */
import { describe, it, expect } from 'vitest'
import type { ComparisonFrame } from '@/domain/models/ComparisonFrame'
import { resolveDayDetailRanges } from './useDayDetailData'

const sameDowFrame: ComparisonFrame = {
  current: { from: { year: 2026, month: 2, day: 1 }, to: { year: 2026, month: 2, day: 28 } },
  previous: { from: { year: 2025, month: 2, day: 2 }, to: { year: 2025, month: 3, day: 1 } },
  dowOffset: 1,
  policy: 'sameDayOfWeek',
}

const sameDateFrame: ComparisonFrame = {
  current: { from: { year: 2026, month: 2, day: 1 }, to: { year: 2026, month: 2, day: 28 } },
  previous: { from: { year: 2025, month: 2, day: 1 }, to: { year: 2025, month: 2, day: 28 } },
  dowOffset: 0,
  policy: 'sameDate',
}

describe('resolveDayDetailRanges', () => {
  describe('sameDayOfWeek — cumPrevRange の日数は当年累計と一致する', () => {
    it('day=1: 累計前年は1日分（prevDate のみ）', () => {
      const r = resolveDayDetailRanges(2026, 2, 1, sameDowFrame)
      // Feb 1, 2026 (Sun) → Feb 2, 2025 (Sun)
      expect(r.prevDate).toEqual({ year: 2025, month: 2, day: 2 })
      // 累計: 当年1日 → 前年も1日
      expect(r.cumPrevRange.from).toEqual(r.cumPrevRange.to)
      expect(r.cumPrevRange.from).toEqual({ year: 2025, month: 2, day: 2 })
    })

    it('day=15: 累計前年は15日分', () => {
      const r = resolveDayDetailRanges(2026, 2, 15, sameDowFrame)
      // 当年15日分なので、前年も prevDate から14日遡った日が from
      const cumDays =
        (new Date(r.cumPrevRange.to.year, r.cumPrevRange.to.month - 1, r.cumPrevRange.to.day).getTime() -
          new Date(r.cumPrevRange.from.year, r.cumPrevRange.from.month - 1, r.cumPrevRange.from.day).getTime()) /
          86_400_000 +
        1
      expect(cumDays).toBe(15)
    })
  })

  describe('sameDate — cumPrevRange は従来通り day:1 始まり', () => {
    it('day=1: 累計前年は1日分', () => {
      const r = resolveDayDetailRanges(2026, 2, 1, sameDateFrame)
      expect(r.cumPrevRange.from).toEqual({ year: 2025, month: 2, day: 1 })
      expect(r.cumPrevRange.to).toEqual({ year: 2025, month: 2, day: 1 })
    })

    it('day=15: 累計前年は15日分（1日～15日）', () => {
      const r = resolveDayDetailRanges(2026, 2, 15, sameDateFrame)
      expect(r.cumPrevRange.from).toEqual({ year: 2025, month: 2, day: 1 })
      expect(r.cumPrevRange.to).toEqual({ year: 2025, month: 2, day: 15 })
    })
  })
})
