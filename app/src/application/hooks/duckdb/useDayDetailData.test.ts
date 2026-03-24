/**
 * resolveDayDetailRanges の境界値テスト
 *
 * 前年同曜日モードで累計前年範囲が当年と同じ日数分になることを検証する。
 */
import { describe, it, expect } from 'vitest'
import type { ComparisonScope } from '@/domain/models/ComparisonScope'
import { resolveDayDetailRanges } from './useDayDetailData'

const sameDowScope: ComparisonScope = {
  period1: { from: { year: 2026, month: 2, day: 1 }, to: { year: 2026, month: 2, day: 28 } },
  period2: { from: { year: 2025, month: 2, day: 2 }, to: { year: 2025, month: 3, day: 1 } },
  preset: 'prevYearSameDow',
  alignmentMode: 'sameDayOfWeek',
  dowOffset: 1,
  effectivePeriod1: {
    from: { year: 2026, month: 2, day: 1 },
    to: { year: 2026, month: 2, day: 28 },
  },
  effectivePeriod2: {
    from: { year: 2025, month: 2, day: 2 },
    to: { year: 2025, month: 3, day: 1 },
  },
  queryRanges: [],
  alignmentMap: [],
  sourceMonth: { year: 2025, month: 2 },
}

const sameDateScope: ComparisonScope = {
  period1: { from: { year: 2026, month: 2, day: 1 }, to: { year: 2026, month: 2, day: 28 } },
  period2: { from: { year: 2025, month: 2, day: 1 }, to: { year: 2025, month: 2, day: 28 } },
  preset: 'prevYearSameMonth',
  alignmentMode: 'sameDate',
  dowOffset: 0,
  effectivePeriod1: {
    from: { year: 2026, month: 2, day: 1 },
    to: { year: 2026, month: 2, day: 28 },
  },
  effectivePeriod2: {
    from: { year: 2025, month: 2, day: 1 },
    to: { year: 2025, month: 2, day: 28 },
  },
  queryRanges: [],
  alignmentMap: [],
  sourceMonth: { year: 2025, month: 2 },
}

describe('resolveDayDetailRanges', () => {
  describe('sameDayOfWeek — cumPrevRange の日数は当年累計と一致する', () => {
    it('day=1: 累計前年は1日分（prevDate のみ）', () => {
      const r = resolveDayDetailRanges(2026, 2, 1, sameDowScope)
      // Feb 1, 2026 (Sun) → Feb 2, 2025 (Sun)
      expect(r.prevDate).toEqual({ year: 2025, month: 2, day: 2 })
      // 累計: 当年1日 → 前年も1日
      expect(r.cumPrevRange.from).toEqual(r.cumPrevRange.to)
      expect(r.cumPrevRange.from).toEqual({ year: 2025, month: 2, day: 2 })
    })

    it('day=15: 累計前年は15日分', () => {
      const r = resolveDayDetailRanges(2026, 2, 15, sameDowScope)
      // 当年15日分なので、前年も prevDate から14日遡った日が from
      const cumDays =
        (new Date(
          r.cumPrevRange.to.year,
          r.cumPrevRange.to.month - 1,
          r.cumPrevRange.to.day,
        ).getTime() -
          new Date(
            r.cumPrevRange.from.year,
            r.cumPrevRange.from.month - 1,
            r.cumPrevRange.from.day,
          ).getTime()) /
          86_400_000 +
        1
      expect(cumDays).toBe(15)
    })
  })

  describe('sameDate — cumPrevRange は従来通り day:1 始まり', () => {
    it('day=1: 累計前年は1日分', () => {
      const r = resolveDayDetailRanges(2026, 2, 1, sameDateScope)
      expect(r.cumPrevRange.from).toEqual({ year: 2025, month: 2, day: 1 })
      expect(r.cumPrevRange.to).toEqual({ year: 2025, month: 2, day: 1 })
    })

    it('day=15: 累計前年は15日分（1日～15日）', () => {
      const r = resolveDayDetailRanges(2026, 2, 15, sameDateScope)
      expect(r.cumPrevRange.from).toEqual({ year: 2025, month: 2, day: 1 })
      expect(r.cumPrevRange.to).toEqual({ year: 2025, month: 2, day: 15 })
    })
  })
})
