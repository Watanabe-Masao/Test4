import { describe, it, expect, beforeEach } from 'vitest'
import { usePeriodSelectionStore } from '../periodSelectionStore'
import type { DateRange } from '@/domain/models/CalendarDate'

describe('periodSelectionStore', () => {
  beforeEach(() => {
    // ストアをリセット
    const now = new Date()
    usePeriodSelectionStore.getState().resetToMonth(now.getFullYear(), now.getMonth() + 1)
    // デフォルトプリセットに戻す
    usePeriodSelectionStore.getState().setPreset('prevYearSameMonth')
    usePeriodSelectionStore.getState().setComparisonEnabled(true)
  })

  describe('初期状態', () => {
    it('比較ON、prevYearSameMonth プリセット', () => {
      const { selection } = usePeriodSelectionStore.getState()
      expect(selection.comparisonEnabled).toBe(true)
      expect(selection.activePreset).toBe('prevYearSameMonth')
    })

    it('period1 は当月全日', () => {
      const { selection } = usePeriodSelectionStore.getState()
      expect(selection.period1.from.day).toBe(1)
      expect(selection.period1.to.day).toBeGreaterThan(27)
    })

    it('period2 は前年同月', () => {
      const { selection } = usePeriodSelectionStore.getState()
      expect(selection.period2.from.year).toBe(selection.period1.from.year - 1)
      expect(selection.period2.from.month).toBe(selection.period1.from.month)
    })
  })

  describe('setPeriod1', () => {
    it('プリセット適用中: period2 も連動して再算出', () => {
      usePeriodSelectionStore.getState().resetToMonth(2026, 3)
      usePeriodSelectionStore.getState().setPreset('prevYearSameMonth')

      const newRange: DateRange = {
        from: { year: 2026, month: 3, day: 5 },
        to: { year: 2026, month: 3, day: 20 },
      }
      usePeriodSelectionStore.getState().setPeriod1(newRange)

      const { selection } = usePeriodSelectionStore.getState()
      expect(selection.period1).toEqual(newRange)
      // period2 も前年同月で再算出される
      expect(selection.period2.from.year).toBe(2025)
      expect(selection.period2.from.month).toBe(3)
      expect(selection.period2.from.day).toBe(5)
      expect(selection.period2.to.day).toBe(20)
    })

    it('custom プリセット: period2 は連動しない', () => {
      usePeriodSelectionStore.getState().resetToMonth(2026, 3)
      const customRange: DateRange = {
        from: { year: 2024, month: 6, day: 1 },
        to: { year: 2024, month: 6, day: 30 },
      }
      usePeriodSelectionStore.getState().setPeriod2(customRange) // custom に切り替わる

      const newRange: DateRange = {
        from: { year: 2026, month: 3, day: 10 },
        to: { year: 2026, month: 3, day: 15 },
      }
      usePeriodSelectionStore.getState().setPeriod1(newRange)

      const { selection } = usePeriodSelectionStore.getState()
      expect(selection.period1).toEqual(newRange)
      // period2 は変わらない
      expect(selection.period2).toEqual(customRange)
    })
  })

  describe('setPeriod2', () => {
    it('activePreset を custom に切り替え', () => {
      usePeriodSelectionStore.getState().resetToMonth(2026, 2)
      expect(usePeriodSelectionStore.getState().selection.activePreset).toBe('prevYearSameMonth')

      const customRange: DateRange = {
        from: { year: 2024, month: 11, day: 1 },
        to: { year: 2024, month: 12, day: 15 },
      }
      usePeriodSelectionStore.getState().setPeriod2(customRange)

      const { selection } = usePeriodSelectionStore.getState()
      expect(selection.period2).toEqual(customRange)
      expect(selection.activePreset).toBe('custom')
    })
  })

  describe('setPreset', () => {
    it('prevYearSameMonth: 前年同月を算出', () => {
      usePeriodSelectionStore.getState().resetToMonth(2026, 2)
      usePeriodSelectionStore.getState().setPreset('prevYearSameMonth')

      const { selection } = usePeriodSelectionStore.getState()
      expect(selection.period2.from.year).toBe(2025)
      expect(selection.period2.from.month).toBe(2)
      expect(selection.activePreset).toBe('prevYearSameMonth')
    })

    it('prevMonth: 前月を算出', () => {
      usePeriodSelectionStore.getState().resetToMonth(2026, 2)
      usePeriodSelectionStore.getState().setPreset('prevMonth')

      const { selection } = usePeriodSelectionStore.getState()
      expect(selection.period2.from.year).toBe(2026)
      expect(selection.period2.from.month).toBe(1)
      expect(selection.activePreset).toBe('prevMonth')
    })

    it('custom: period2 は変わらない', () => {
      usePeriodSelectionStore.getState().resetToMonth(2026, 2)
      const before = usePeriodSelectionStore.getState().selection.period2

      usePeriodSelectionStore.getState().setPreset('custom')

      const { selection } = usePeriodSelectionStore.getState()
      expect(selection.period2).toEqual(before)
      expect(selection.activePreset).toBe('custom')
    })
  })

  describe('setComparisonEnabled', () => {
    it('ON/OFF を切り替え', () => {
      usePeriodSelectionStore.getState().setComparisonEnabled(false)
      expect(usePeriodSelectionStore.getState().selection.comparisonEnabled).toBe(false)

      usePeriodSelectionStore.getState().setComparisonEnabled(true)
      expect(usePeriodSelectionStore.getState().selection.comparisonEnabled).toBe(true)
    })
  })

  describe('resetToMonth', () => {
    it('指定月の全日で初期化、プリセット維持', () => {
      usePeriodSelectionStore.getState().setPreset('prevMonth')
      usePeriodSelectionStore.getState().resetToMonth(2026, 6)

      const { selection } = usePeriodSelectionStore.getState()
      expect(selection.period1.from).toEqual({ year: 2026, month: 6, day: 1 })
      expect(selection.period1.to).toEqual({ year: 2026, month: 6, day: 30 })
      // prevMonth プリセットが維持される
      expect(selection.activePreset).toBe('prevMonth')
      expect(selection.period2.from.month).toBe(5)
    })

    it('比較ON/OFF も維持', () => {
      usePeriodSelectionStore.getState().setComparisonEnabled(false)
      usePeriodSelectionStore.getState().resetToMonth(2026, 6)

      expect(usePeriodSelectionStore.getState().selection.comparisonEnabled).toBe(false)
    })
  })
})
