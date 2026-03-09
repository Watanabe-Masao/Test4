import { describe, it, expect } from 'vitest'
import {
  applyPreset,
  calcAdjacentMonths,
  buildPeriodQueryInput,
  createDefaultPeriodSelection,
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
      // 前月: 2026年1月
      expect(adj.prevMonth.from).toEqual({ year: 2026, month: 1, day: 1 })
      expect(adj.prevMonth.to).toEqual({ year: 2026, month: 1, day: 31 })
      // 翌月: 2026年3月
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
      expect(adj.prevMonth.from.month).toBe(1) // 2月の前月
      expect(adj.nextMonth.from.month).toBe(4) // 3月の翌月
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
})
