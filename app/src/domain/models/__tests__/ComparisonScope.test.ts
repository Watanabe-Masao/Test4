import { describe, it, expect } from 'vitest'
import { buildComparisonScope } from '../ComparisonScope'
import type { PeriodSelection } from '../PeriodSelection'
import { applyPreset, createDefaultPeriodSelection } from '../PeriodSelection'
import type { DateRange } from '../CalendarDate'

/** ヘルパー: PeriodSelection を手動構築 */
function makePeriodSelection(
  period1: DateRange,
  preset: 'prevYearSameMonth' | 'prevYearSameDow' | 'prevMonth' | 'custom',
  period2Override?: DateRange,
): PeriodSelection {
  const period2 = period2Override ?? applyPreset(period1, preset, period1)
  return {
    period1,
    period2,
    comparisonEnabled: true,
    activePreset: preset,
  }
}

describe('buildComparisonScope', () => {
  // ── プリセット別テスト ──

  describe('prevYearSameMonth', () => {
    it('should map same dates one year back', () => {
      const selection = makePeriodSelection(
        { from: { year: 2026, month: 3, day: 1 }, to: { year: 2026, month: 3, day: 31 } },
        'prevYearSameMonth',
      )
      const scope = buildComparisonScope(selection)

      expect(scope.period1).toEqual(selection.period1)
      expect(scope.period2.from.year).toBe(2025)
      expect(scope.period2.from.month).toBe(3)
      expect(scope.alignmentMode).toBe('sameDate')
      expect(scope.dowOffset).toBe(0)
      expect(scope.alignmentMap).toHaveLength(31)
      // 1日目の対応
      expect(scope.alignmentMap[0].targetDate).toEqual({ year: 2026, month: 3, day: 1 })
      expect(scope.alignmentMap[0].sourceDate).toEqual({ year: 2025, month: 3, day: 1 })
    })
  })

  describe('prevYearSameDow', () => {
    it('should apply DOW offset', () => {
      const selection = makePeriodSelection(
        { from: { year: 2026, month: 3, day: 1 }, to: { year: 2026, month: 3, day: 31 } },
        'prevYearSameDow',
      )
      const scope = buildComparisonScope(selection)

      expect(scope.alignmentMode).toBe('sameDayOfWeek')
      expect(scope.dowOffset).toBeGreaterThanOrEqual(0)
      expect(scope.dowOffset).toBeLessThanOrEqual(6)

      // 各エントリの target → source が dowOffset 分ずれている
      if (scope.dowOffset > 0) {
        const first = scope.alignmentMap[0]
        const sourceDate = new Date(
          first.sourceDate.year,
          first.sourceDate.month - 1,
          first.sourceDate.day,
        )
        const targetDate = new Date(
          first.targetDate.year,
          first.targetDate.month - 1,
          first.targetDate.day,
        )
        expect(sourceDate.getDay()).toBe(targetDate.getDay())
      }
    })
  })

  describe('prevMonth', () => {
    it('should map to previous month', () => {
      const selection = makePeriodSelection(
        { from: { year: 2026, month: 3, day: 1 }, to: { year: 2026, month: 3, day: 31 } },
        'prevMonth',
      )
      const scope = buildComparisonScope(selection)

      expect(scope.period2.from.month).toBe(2)
      expect(scope.alignmentMode).toBe('sameDate')
      expect(scope.dowOffset).toBe(0)
      // 2月は28日なので、alignmentMap は 31 エントリ（当期31日分）
      expect(scope.alignmentMap).toHaveLength(31)
    })
  })

  describe('custom', () => {
    it('should use custom period2 as-is', () => {
      const customP2: DateRange = {
        from: { year: 2024, month: 6, day: 1 },
        to: { year: 2024, month: 6, day: 30 },
      }
      const selection = makePeriodSelection(
        { from: { year: 2026, month: 3, day: 1 }, to: { year: 2026, month: 3, day: 30 } },
        'custom',
        customP2,
      )
      const scope = buildComparisonScope(selection)

      expect(scope.period2).toEqual(customP2)
      expect(scope.alignmentMode).toBe('sameDate')
      expect(scope.dowOffset).toBe(0)
    })
  })

  // ── 月跨ぎテスト ──

  describe('month-crossing period1', () => {
    it('should handle period1 crossing month boundary', () => {
      const selection = makePeriodSelection(
        { from: { year: 2026, month: 3, day: 25 }, to: { year: 2026, month: 4, day: 5 } },
        'prevYearSameMonth',
      )
      const scope = buildComparisonScope(selection)

      // 12日間 (3/25〜4/5)
      expect(scope.alignmentMap).toHaveLength(12)
      // 最初の日は 3/25 → 前年 3/25
      expect(scope.alignmentMap[0].targetDate).toEqual({ year: 2026, month: 3, day: 25 })
      // 最後の日は 4/5 → 前年 4/5
      expect(scope.alignmentMap[11].targetDate).toEqual({ year: 2026, month: 4, day: 5 })
    })
  })

  // ── 日付境界テスト ──

  describe('February end (non-leap year)', () => {
    it('should handle 28-day February', () => {
      const selection = makePeriodSelection(
        { from: { year: 2026, month: 2, day: 1 }, to: { year: 2026, month: 2, day: 28 } },
        'prevYearSameMonth',
      )
      const scope = buildComparisonScope(selection)

      expect(scope.alignmentMap).toHaveLength(28)
      expect(scope.alignmentMap[27].sourceDate.day).toBe(28)
    })
  })

  describe('February end (leap year)', () => {
    it('should handle 29-day February in leap year', () => {
      // 2028 is a leap year
      const selection = makePeriodSelection(
        { from: { year: 2028, month: 2, day: 1 }, to: { year: 2028, month: 2, day: 29 } },
        'prevYearSameMonth',
      )
      const scope = buildComparisonScope(selection)

      expect(scope.alignmentMap).toHaveLength(29)
      // 前年2027年の2月は28日 — source の29日目は 3/1 にオーバーフロー
      expect(scope.alignmentMap[28].sourceDate).toEqual({ year: 2027, month: 3, day: 1 })
    })
  })

  describe('31-day month to 30-day month', () => {
    it('should handle mapping from 31-day to 30-day month', () => {
      // 1月（31日）→ 前月は12月（31日）なので問題ない
      // 3月（31日）→ 前月は2月（28日）で短い
      const selection = makePeriodSelection(
        { from: { year: 2026, month: 3, day: 1 }, to: { year: 2026, month: 3, day: 31 } },
        'prevMonth',
      )
      const scope = buildComparisonScope(selection)

      // 当期は31日だが、比較期の2月は28日
      // alignmentMap は当期ベースで31エントリ
      expect(scope.alignmentMap).toHaveLength(31)
      // source 29日目は 3/1 にオーバーフロー
      expect(scope.alignmentMap[28].sourceDate).toEqual({ year: 2026, month: 3, day: 1 })
    })
  })

  // ── elapsedDays cap テスト ──

  describe('elapsedDays cap', () => {
    it('should cap alignmentMap by elapsedDays', () => {
      const selection = makePeriodSelection(
        { from: { year: 2026, month: 3, day: 1 }, to: { year: 2026, month: 3, day: 31 } },
        'prevYearSameMonth',
      )
      const scope = buildComparisonScope(selection, 15)

      expect(scope.effectivePeriod1.to.day).toBe(15)
      expect(scope.alignmentMap).toHaveLength(15)
      expect(scope.alignmentMap[14].targetDate.day).toBe(15)
    })

    it('should not cap if elapsedDays >= period length', () => {
      const selection = makePeriodSelection(
        { from: { year: 2026, month: 3, day: 1 }, to: { year: 2026, month: 3, day: 31 } },
        'prevYearSameMonth',
      )
      const scope = buildComparisonScope(selection, 50)

      expect(scope.alignmentMap).toHaveLength(31)
    })
  })

  // ── queryRanges テスト ──

  describe('queryRanges', () => {
    it('should include target month ± 1', () => {
      const selection = makePeriodSelection(
        { from: { year: 2026, month: 3, day: 1 }, to: { year: 2026, month: 3, day: 31 } },
        'prevYearSameMonth',
      )
      const scope = buildComparisonScope(selection)

      // 前年3月 ± 1 = 2月, 3月, 4月
      const months = scope.queryRanges.map((q) => `${q.year}-${q.month}`)
      expect(months).toContain('2025-2')
      expect(months).toContain('2025-3')
      expect(months).toContain('2025-4')
    })

    it('should handle year boundary', () => {
      const selection = makePeriodSelection(
        { from: { year: 2026, month: 1, day: 1 }, to: { year: 2026, month: 1, day: 31 } },
        'prevYearSameMonth',
      )
      const scope = buildComparisonScope(selection)

      const months = scope.queryRanges.map((q) => `${q.year}-${q.month}`)
      expect(months).toContain('2024-12') // 前月は前年12月
      expect(months).toContain('2025-1')
      expect(months).toContain('2025-2')
    })
  })

  // ── alignmentMap 整合性テスト ──

  describe('alignmentMap consistency', () => {
    it('should have unique target dates', () => {
      const selection = createDefaultPeriodSelection(2026, 3)
      const scope = buildComparisonScope(selection)

      const targetKeys = scope.alignmentMap.map((e) => e.targetDayKey)
      expect(new Set(targetKeys).size).toBe(targetKeys.length)
    })

    it('should have matching day keys', () => {
      const selection = createDefaultPeriodSelection(2026, 3)
      const scope = buildComparisonScope(selection)

      for (const entry of scope.alignmentMap) {
        const expectedSourceKey = `${entry.sourceDate.year}-${String(entry.sourceDate.month).padStart(2, '0')}-${String(entry.sourceDate.day).padStart(2, '0')}`
        const expectedTargetKey = `${entry.targetDate.year}-${String(entry.targetDate.month).padStart(2, '0')}-${String(entry.targetDate.day).padStart(2, '0')}`
        expect(entry.sourceDayKey).toBe(expectedSourceKey)
        expect(entry.targetDayKey).toBe(expectedTargetKey)
      }
    })
  })

  // ── effectivePeriod2 テスト ──

  describe('effectivePeriod2', () => {
    it('should derive from alignmentMap source dates', () => {
      const selection = makePeriodSelection(
        { from: { year: 2026, month: 3, day: 1 }, to: { year: 2026, month: 3, day: 31 } },
        'prevYearSameMonth',
      )
      const scope = buildComparisonScope(selection, 10)

      // effectivePeriod2 は alignmentMap のソース日付から導出
      expect(scope.effectivePeriod2.from).toEqual(scope.alignmentMap[0].sourceDate)
      expect(scope.effectivePeriod2.to).toEqual(
        scope.alignmentMap[scope.alignmentMap.length - 1].sourceDate,
      )
    })
  })
})
