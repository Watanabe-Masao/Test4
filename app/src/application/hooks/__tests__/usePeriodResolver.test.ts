import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { usePeriodResolver, usePeriodSelection } from '../usePeriodResolver'
import { usePeriodSelectionStore } from '@/application/stores/periodSelectionStore'

describe('usePeriodResolver', () => {
  beforeEach(() => {
    usePeriodSelectionStore.getState().resetToMonth(2026, 2)
    usePeriodSelectionStore.getState().setPreset('prevYearSameMonth')
    usePeriodSelectionStore.getState().setComparisonEnabled(true)
  })

  describe('need: current', () => {
    it('period1 のみ返す', () => {
      const { result } = renderHook(() => usePeriodResolver('current'))
      expect(result.current.period1).toBeDefined()
      expect(result.current.period2).toBeUndefined()
      expect(result.current.period1Adjacent).toBeUndefined()
      expect(result.current.period2Adjacent).toBeUndefined()
    })

    it('comparisonEnabled の状態は含まれる', () => {
      const { result } = renderHook(() => usePeriodResolver('current'))
      expect(result.current.comparisonEnabled).toBe(true)
    })
  })

  describe('need: comparison', () => {
    it('比較ON: period1 + period2', () => {
      const { result } = renderHook(() => usePeriodResolver('comparison'))
      expect(result.current.period1).toBeDefined()
      expect(result.current.period2).toBeDefined()
      expect(result.current.period2!.from.year).toBe(2025)
    })

    it('比較OFF: period2 は undefined', () => {
      usePeriodSelectionStore.getState().setComparisonEnabled(false)
      const { result } = renderHook(() => usePeriodResolver('comparison'))
      expect(result.current.period1).toBeDefined()
      expect(result.current.period2).toBeUndefined()
    })
  })

  describe('need: adjacent', () => {
    it('period1 + 隣接月を返す', () => {
      const { result } = renderHook(() => usePeriodResolver('adjacent'))
      expect(result.current.period1).toBeDefined()
      expect(result.current.period1Adjacent).toBeDefined()
      // 2026年2月の前月 = 1月
      expect(result.current.period1Adjacent!.prevMonth.from.month).toBe(1)
      // 2026年2月の翌月 = 3月
      expect(result.current.period1Adjacent!.nextMonth.from.month).toBe(3)
      // period2 は含まない
      expect(result.current.period2).toBeUndefined()
    })
  })

  describe('need: comparisonFull', () => {
    it('比較ON: 全期間 + 全隣接月', () => {
      const { result } = renderHook(() => usePeriodResolver('comparisonFull'))
      expect(result.current.period1).toBeDefined()
      expect(result.current.period2).toBeDefined()
      expect(result.current.period1Adjacent).toBeDefined()
      expect(result.current.period2Adjacent).toBeDefined()
    })

    it('比較OFF: period1 + period1Adjacent のみ', () => {
      usePeriodSelectionStore.getState().setComparisonEnabled(false)
      const { result } = renderHook(() => usePeriodResolver('comparisonFull'))
      expect(result.current.period1).toBeDefined()
      expect(result.current.period1Adjacent).toBeDefined()
      expect(result.current.period2).toBeUndefined()
      expect(result.current.period2Adjacent).toBeUndefined()
    })
  })

  describe('selection の参照', () => {
    it('元の PeriodSelection が含まれる', () => {
      const { result } = renderHook(() => usePeriodResolver('current'))
      expect(result.current.selection).toBeDefined()
      expect(result.current.selection.activePreset).toBe('prevYearSameMonth')
    })
  })
})

describe('usePeriodSelection', () => {
  beforeEach(() => {
    usePeriodSelectionStore.getState().resetToMonth(2026, 2)
    usePeriodSelectionStore.getState().setPreset('prevYearSameMonth')
  })

  it('selection と操作関数を返す', () => {
    const { result } = renderHook(() => usePeriodSelection())
    expect(result.current.selection).toBeDefined()
    expect(typeof result.current.setPeriod1).toBe('function')
    expect(typeof result.current.setPeriod2).toBe('function')
    expect(typeof result.current.setPreset).toBe('function')
    expect(typeof result.current.setComparisonEnabled).toBe('function')
  })
})
