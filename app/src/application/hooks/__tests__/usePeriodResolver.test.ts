import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { usePeriodSelection } from '../usePeriodResolver'
import { usePeriodSelectionStore } from '@/application/stores/periodSelectionStore'

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
