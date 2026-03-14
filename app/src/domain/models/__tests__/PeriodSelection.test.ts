import { describe, it, expect } from 'vitest'
import {
  applyPreset,
  calcAdjacentMonths,
  buildPeriodQueryInput,
  createDefaultPeriodSelection,
  deriveDowOffset,
  deriveEffectivePeriod2,
  buildPrevYearScopeFromSelection,
} from '../PeriodSelection'
import type { DateRange } from '../CalendarDate'

describe('PeriodSelection', () => {
  const feb2026: DateRange = {
    from: { year: 2026, month: 2, day: 1 },
    to: { year: 2026, month: 2, day: 28 },
  }

  describe('createDefaultPeriodSelection', () => {
    it('当月全日を period1、前年同月を period2、比較ON', () => {
      const sel = createDefaultPeriodSelection(2026, 2)
      expect(sel.period1).toEqual(feb2026)
      expect(sel.period2.from.year).toBe(2025)
      expect(sel.period2.from.month).toBe(2)
      expect(sel.comparisonEnabled).toBe(true)
      expect(sel.activePreset).toBe('prevYearSameMonth')
    })
  })

  describe('applyPreset', () => {
    it('prevYearSameMonth: 前年同月の同じ日範囲', () => {
      const result = applyPreset(feb2026, 'prevYearSameMonth', feb2026)
      expect(result.from).toEqual({ year: 2025, month: 2, day: 1 })
      expect(result.to).toEqual({ year: 2025, month: 2, day: 28 })
    })

    it('prevYearSameMonth: うるう年→非うるう年でクランプ', () => {
      const leap: DateRange = {
        from: { year: 2024, month: 2, day: 1 },
        to: { year: 2024, month: 2, day: 29 },
      }
      const result = applyPreset(leap, 'prevYearSameMonth', leap)
      // 2023年2月は28日まで
      expect(result.to.day).toBe(28)
    })

    it('prevMonth: 前月の同じ日範囲', () => {
      const result = applyPreset(feb2026, 'prevMonth', feb2026)
      expect(result.from).toEqual({ year: 2026, month: 1, day: 1 })
      expect(result.to).toEqual({ year: 2026, month: 1, day: 28 })
    })

    it('prevMonth: 1月→12月で年も減る', () => {
      const jan: DateRange = {
        from: { year: 2026, month: 1, day: 1 },
        to: { year: 2026, month: 1, day: 31 },
      }
      const result = applyPreset(jan, 'prevMonth', jan)
      expect(result.from.year).toBe(2025)
      expect(result.from.month).toBe(12)
    })

    it('custom: 現在の period2 をそのまま返す', () => {
      const custom: DateRange = {
        from: { year: 2024, month: 6, day: 15 },
        to: { year: 2024, month: 7, day: 10 },
      }
      const result = applyPreset(feb2026, 'custom', custom)
      expect(result).toEqual(custom)
    })

    it('prevYearSameDow: 候補取得範囲（前年同日 ±7日）', () => {
      // V2: period2 は候補取得範囲。period1.from の前年 -7日 ～ period1.to の前年 +7日
      const result = applyPreset(feb2026, 'prevYearSameDow', feb2026)
      // from: 2025-02-01 - 7日 = 2025-01-25
      const expectedFrom = new Date(2025, 0, 25) // 2025-01-25
      expect(result.from.year).toBe(expectedFrom.getFullYear())
      expect(result.from.month).toBe(expectedFrom.getMonth() + 1)
      expect(result.from.day).toBe(expectedFrom.getDate())
      // to: 2025-02-28 + 7日 = 2025-03-07
      const expectedTo = new Date(2025, 1, 35) // Date 正規化で 2025-03-07
      expect(result.to.year).toBe(expectedTo.getFullYear())
      expect(result.to.month).toBe(expectedTo.getMonth() + 1)
      expect(result.to.day).toBe(expectedTo.getDate())
    })
  })

  describe('calcAdjacentMonths', () => {
    it('前後1ヶ月を正しく算出', () => {
      const adj = calcAdjacentMonths(feb2026)
      expect(adj.prevMonth.from).toEqual({ year: 2026, month: 1, day: 1 })
      expect(adj.prevMonth.to).toEqual({ year: 2026, month: 1, day: 31 })
      expect(adj.nextMonth.from).toEqual({ year: 2026, month: 3, day: 1 })
      expect(adj.nextMonth.to).toEqual({ year: 2026, month: 3, day: 31 })
    })

    it('1月の前月は前年12月', () => {
      const jan: DateRange = {
        from: { year: 2026, month: 1, day: 1 },
        to: { year: 2026, month: 1, day: 31 },
      }
      const adj = calcAdjacentMonths(jan)
      expect(adj.prevMonth.from).toEqual({ year: 2025, month: 12, day: 1 })
      expect(adj.prevMonth.to).toEqual({ year: 2025, month: 12, day: 31 })
    })

    it('12月の翌月は翌年1月', () => {
      const dec: DateRange = {
        from: { year: 2025, month: 12, day: 1 },
        to: { year: 2025, month: 12, day: 31 },
      }
      const adj = calcAdjacentMonths(dec)
      expect(adj.nextMonth.from).toEqual({ year: 2026, month: 1, day: 1 })
      expect(adj.nextMonth.to).toEqual({ year: 2026, month: 1, day: 31 })
    })

    it('月跨ぎ範囲: from の前月と to の翌月', () => {
      const crossMonth: DateRange = {
        from: { year: 2026, month: 2, day: 15 },
        to: { year: 2026, month: 3, day: 10 },
      }
      const adj = calcAdjacentMonths(crossMonth)
      expect(adj.prevMonth.from.month).toBe(1)
      expect(adj.nextMonth.from.month).toBe(4)
    })
  })

  describe('buildPeriodQueryInput', () => {
    it('比較ON: 4期間すべて含む', () => {
      const sel = createDefaultPeriodSelection(2026, 2)
      const input = buildPeriodQueryInput(sel)
      expect(input.period1).toEqual(sel.period1)
      expect(input.period2).toEqual(sel.period2)
      expect(input.period1Adjacent).toBeDefined()
      expect(input.period2Adjacent).toBeDefined()
    })

    it('比較OFF: period2 は undefined', () => {
      const sel = createDefaultPeriodSelection(2026, 2)
      const offSel = { ...sel, comparisonEnabled: false }
      const input = buildPeriodQueryInput(offSel)
      expect(input.period1).toEqual(sel.period1)
      expect(input.period2).toBeUndefined()
      expect(input.period2Adjacent).toBeUndefined()
    })
  })

  describe('deriveDowOffset', () => {
    it('prevYearSameMonth: オフセット 0', () => {
      const sel = createDefaultPeriodSelection(2026, 3)
      expect(deriveDowOffset(sel.period1, 'prevYearSameMonth')).toBe(0)
    })

    it('prevMonth: オフセット 0', () => {
      expect(deriveDowOffset(feb2026, 'prevMonth')).toBe(0)
    })

    it('custom: オフセット 0', () => {
      expect(deriveDowOffset(feb2026, 'custom')).toBe(0)
    })

    it('prevYearSameDow: deriveDowOffset は 0-6 の範囲を返す', () => {
      const sel = createDefaultPeriodSelection(2026, 2)
      const offset = deriveDowOffset(sel.period1, 'prevYearSameDow')
      expect(offset).toBeGreaterThanOrEqual(0)
      expect(offset).toBeLessThanOrEqual(6)
    })

    it('prevYearSameDow: 全12ヶ月で 0-6 の範囲に収まる', () => {
      for (let month = 1; month <= 12; month++) {
        const sel = createDefaultPeriodSelection(2026, month)
        const offset = deriveDowOffset(sel.period1, 'prevYearSameDow')
        expect(offset).toBeGreaterThanOrEqual(0)
        expect(offset).toBeLessThanOrEqual(6)
      }
    })

    it('prevYearSameDow: period1 の前年同月の月初曜日差を返す', () => {
      // 2026年2月1日 = 日曜 (0), 2025年2月1日 = 土曜 (6)
      // offset = (0 - 6 + 7) % 7 = 1
      const sel = createDefaultPeriodSelection(2026, 2)
      const offset = deriveDowOffset(sel.period1, 'prevYearSameDow')
      const currentDow = new Date(2026, 1, 1).getDay() // Sunday = 0
      const prevDow = new Date(2025, 1, 1).getDay() // Saturday = 6
      const expected = (((currentDow - prevDow) % 7) + 7) % 7
      expect(offset).toBe(expected)
    })

    it('prevYearSameDow: period2 の候補窓の月ずれに影響されない', () => {
      // 2026年2月 → period2 候補窓は 2025/1/25〜2025/3/7（from.month = 1）
      // 旧実装: period2.from.month=1 で offset 計算 → 誤り
      // 新実装: period1.from.year-1, period1.from.month=2 で計算 → 正しい
      const sel = createDefaultPeriodSelection(2026, 2)
      const p2 = applyPreset(sel.period1, 'prevYearSameDow', sel.period2)
      // period2.from は1月にずれているが、offset は2月基準で計算される
      expect(p2.from.month).toBe(1) // 候補窓の from は1月
      const offset = deriveDowOffset(sel.period1, 'prevYearSameDow')
      // 2026/2/1(日) vs 2025/2/1(土) → offset=1
      const currentDow = new Date(2026, 1, 1).getDay()
      const prevDow = new Date(2025, 1, 1).getDay()
      expect(offset).toBe((((currentDow - prevDow) % 7) + 7) % 7)
    })
  })

  describe('deriveEffectivePeriod2', () => {
    it('prevYearSameMonth: period2 をそのまま返す', () => {
      const sel = createDefaultPeriodSelection(2026, 2)
      const effective = deriveEffectivePeriod2(sel)
      expect(effective).toEqual(sel.period2)
    })

    it('prevMonth: period2 をそのまま返す', () => {
      const sel = createDefaultPeriodSelection(2026, 3)
      const p2 = applyPreset(sel.period1, 'prevMonth', sel.period2)
      const prevMonthSel = { ...sel, period2: p2, activePreset: 'prevMonth' as const }
      const effective = deriveEffectivePeriod2(prevMonthSel)
      expect(effective).toEqual(p2)
    })

    it('prevYearSameDow: 候補窓ではなく正確な比較期間を返す', () => {
      const sel = createDefaultPeriodSelection(2026, 2)
      const p2 = applyPreset(sel.period1, 'prevYearSameDow', sel.period2)
      const sameDowSel = { ...sel, period2: p2, activePreset: 'prevYearSameDow' as const }

      const effective = deriveEffectivePeriod2(sameDowSel)

      // 候補窓（±7日）ではないことを確認
      expect(effective).not.toEqual(p2)

      // period1 から1年前 + dowOffset の期間であること
      const offset = deriveDowOffset(sel.period1, 'prevYearSameDow')
      const expectedFrom = new Date(2026, 1, 1) // period1.from
      expectedFrom.setTime(expectedFrom.getTime() - 365 * 86400000 + offset * 86400000)
      expect(effective.from.year).toBe(expectedFrom.getFullYear())
      expect(effective.from.month).toBe(expectedFrom.getMonth() + 1)
      expect(effective.from.day).toBe(expectedFrom.getDate())
    })

    it('prevYearSameDow: 期間の日数が period1 と同じ', () => {
      const sel = createDefaultPeriodSelection(2026, 2) // 2/1〜2/28
      const p2 = applyPreset(sel.period1, 'prevYearSameDow', sel.period2)
      const sameDowSel = { ...sel, period2: p2, activePreset: 'prevYearSameDow' as const }

      const effective = deriveEffectivePeriod2(sameDowSel)

      // effective の日数 = period1 の日数
      const p1Days =
        (new Date(sel.period1.to.year, sel.period1.to.month - 1, sel.period1.to.day).getTime() -
          new Date(
            sel.period1.from.year,
            sel.period1.from.month - 1,
            sel.period1.from.day,
          ).getTime()) /
        86400000
      const effDays =
        (new Date(effective.to.year, effective.to.month - 1, effective.to.day).getTime() -
          new Date(effective.from.year, effective.from.month - 1, effective.from.day).getTime()) /
        86400000
      expect(effDays).toBe(p1Days)
    })
  })

  describe('buildPrevYearScopeFromSelection', () => {
    it('dateRange は period2 と一致', () => {
      const sel = createDefaultPeriodSelection(2026, 3)
      const scope = buildPrevYearScopeFromSelection(sel, 500)
      expect(scope.dateRange).toEqual(sel.period2)
    })

    it('totalCustomers がバンドルされる', () => {
      const sel = createDefaultPeriodSelection(2026, 3)
      const scope = buildPrevYearScopeFromSelection(sel, 1234)
      expect(scope.totalCustomers).toBe(1234)
    })

    it('prevYearSameMonth: dowOffset=0', () => {
      const sel = createDefaultPeriodSelection(2026, 3)
      const scope = buildPrevYearScopeFromSelection(sel, 100)
      expect(scope.dowOffset).toBe(0)
    })

    it('prevYearSameDow: dowOffset が正しく導出される', () => {
      const sel = createDefaultPeriodSelection(2026, 3)
      const p2 = applyPreset(sel.period1, 'prevYearSameDow', sel.period2)
      const sameDowSel = { ...sel, period2: p2, activePreset: 'prevYearSameDow' as const }
      const scope = buildPrevYearScopeFromSelection(sameDowSel, 100)
      const expected = deriveDowOffset(sel.period1, 'prevYearSameDow')
      expect(scope.dowOffset).toBe(expected)
    })

    it('prevYearSameDow: period2 は前年同日 ±7日の候補範囲', () => {
      // V2: period2 は候補取得範囲（resolver が日単位で比較先を引く）
      const testCases = [
        { year: 2026, month: 2 },
        { year: 2026, month: 6 },
        { year: 2025, month: 12 },
      ]
      for (const { year, month } of testCases) {
        const sel = createDefaultPeriodSelection(year, month)
        const p2 = applyPreset(sel.period1, 'prevYearSameDow', sel.period2)
        // from は前年同日 - 7日
        const expectedFrom = new Date(year - 1, month - 1, 1 - 7)
        expect(p2.from.year).toBe(expectedFrom.getFullYear())
        expect(p2.from.month).toBe(expectedFrom.getMonth() + 1)
        expect(p2.from.day).toBe(expectedFrom.getDate())
      }
    })

    it('prevYearSameDow: 候補範囲は期間長 + 14日（±7日分）', () => {
      // V2: period2 は period1 の前年同日 ±7日なので、期間長 + 14日
      const result = applyPreset(feb2026, 'prevYearSameDow', feb2026)
      const fromDate = new Date(result.from.year, result.from.month - 1, result.from.day)
      const toDate = new Date(result.to.year, result.to.month - 1, result.to.day)
      const p1FromDate = new Date(feb2026.from.year, feb2026.from.month - 1, feb2026.from.day)
      const p1ToDate = new Date(feb2026.to.year, feb2026.to.month - 1, feb2026.to.day)
      const p1Days = (p1ToDate.getTime() - p1FromDate.getTime()) / (1000 * 60 * 60 * 24)
      const p2Days = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)
      // 候補範囲 = 期間長 + 14日（from -7, to +7）
      expect(p2Days).toBe(p1Days + 14)
    })
  })
})
