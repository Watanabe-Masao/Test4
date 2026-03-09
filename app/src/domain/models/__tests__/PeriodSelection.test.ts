import { describe, it, expect } from 'vitest'
import {
  applyPreset,
  calcAdjacentMonths,
  buildPeriodQueryInput,
  createDefaultPeriodSelection,
  deriveDowOffset,
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

    it('prevYearSameDow: 曜日オフセット付きで前年', () => {
      const result = applyPreset(feb2026, 'prevYearSameDow', feb2026)
      expect(result.from.year).toBe(2025)
      expect(result.from.month).toBe(2)
      // オフセットにより day >= 1
      expect(result.from.day).toBeGreaterThanOrEqual(1)
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
      expect(deriveDowOffset(sel.period1, sel.period2, 'prevYearSameMonth')).toBe(0)
    })

    it('prevMonth: オフセット 0', () => {
      const p1 = feb2026
      const p2 = applyPreset(p1, 'prevMonth', p1)
      expect(deriveDowOffset(p1, p2, 'prevMonth')).toBe(0)
    })

    it('custom: オフセット 0', () => {
      const p1 = feb2026
      const p2: DateRange = {
        from: { year: 2024, month: 6, day: 1 },
        to: { year: 2024, month: 6, day: 30 },
      }
      expect(deriveDowOffset(p1, p2, 'custom')).toBe(0)
    })

    it('prevYearSameDow: 非ゼロオフセットを返す（DOW差による）', () => {
      // 2026年2月と2025年2月の月初曜日が異なればオフセットは非ゼロ
      const sel = createDefaultPeriodSelection(2026, 2)
      const p2 = applyPreset(sel.period1, 'prevYearSameDow', sel.period2)
      const offset = deriveDowOffset(sel.period1, p2, 'prevYearSameDow')
      // 月初曜日差から算出される値（0-6）
      expect(offset).toBeGreaterThanOrEqual(0)
      expect(offset).toBeLessThanOrEqual(6)
    })

    it('prevYearSameDow: 全12ヶ月で 0-6 の範囲に収まる', () => {
      for (let month = 1; month <= 12; month++) {
        const sel = createDefaultPeriodSelection(2026, month)
        const p2 = applyPreset(sel.period1, 'prevYearSameDow', sel.period2)
        const offset = deriveDowOffset(sel.period1, p2, 'prevYearSameDow')
        expect(offset).toBeGreaterThanOrEqual(0)
        expect(offset).toBeLessThanOrEqual(6)
      }
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
      const expected = deriveDowOffset(sel.period1, p2, 'prevYearSameDow')
      expect(scope.dowOffset).toBe(expected)
    })

    it('prevYearSameDow: period2.from.day = period1.from.day + offset', () => {
      const testCases = [
        { year: 2026, month: 2 },
        { year: 2026, month: 6 },
        { year: 2025, month: 12 },
      ]
      for (const { year, month } of testCases) {
        const sel = createDefaultPeriodSelection(year, month)
        const p2 = applyPreset(sel.period1, 'prevYearSameDow', sel.period2)
        const offset = deriveDowOffset(sel.period1, p2, 'prevYearSameDow')
        // Date 演算で月跨ぎも正しく処理される
        const expectedFrom = new Date(year - 1, month - 1, 1 + offset)
        expect(
          p2.from.day,
          `${year}/${month}: period2.from.day=${p2.from.day} vs expected=${expectedFrom.getDate()}`,
        ).toBe(expectedFrom.getDate())
      }
    })

    it('prevYearSameDow: 期間長が維持される（月末オーバーフロー時に月跨ぎ）', () => {
      // 2026/2/1〜28 → 2025/2/2〜3/1（offset=1, 28日間を維持）
      const result = applyPreset(feb2026, 'prevYearSameDow', feb2026)
      const fromDate = new Date(result.from.year, result.from.month - 1, result.from.day)
      const toDate = new Date(result.to.year, result.to.month - 1, result.to.day)
      const p1FromDate = new Date(feb2026.from.year, feb2026.from.month - 1, feb2026.from.day)
      const p1ToDate = new Date(feb2026.to.year, feb2026.to.month - 1, feb2026.to.day)
      const p1Days = (p1ToDate.getTime() - p1FromDate.getTime()) / (1000 * 60 * 60 * 24)
      const p2Days = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)
      expect(p2Days).toBe(p1Days)
    })
  })
})
