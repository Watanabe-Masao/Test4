/**
 * クロスチャート統合選択コンテキスト
 *
 * 複数のチャート間でカテゴリ・時間帯・店舗の選択状態を共有し、
 * 一方のチャートでの操作が他方のチャートに伝播する統合的な分析体験を実現する。
 */
import { useState, useMemo, useCallback, type ReactNode } from 'react'
import { CrossChartSelectionContext, INITIAL_STATE } from './crossChartSelectionContextDef'
import type {
  CategoryHighlight,
  TimeSlotHighlight,
  DrillThroughTarget,
  CrossChartSelectionState,
} from './crossChartSelectionContextDef'

// Type-only re-exports (don't trigger react-refresh warning)
export type {
  CategoryHighlight,
  TimeSlotHighlight,
  DrillThroughTarget,
} from './crossChartSelectionContextDef'

// ─── Provider ─────────────────────────────────────────

export function CrossChartSelectionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CrossChartSelectionState>(INITIAL_STATE)

  const highlightCategory = useCallback((category: CategoryHighlight | null) => {
    setState((prev) => ({ ...prev, highlightedCategory: category }))
  }, [])

  const highlightTimeSlot = useCallback((timeSlot: TimeSlotHighlight | null) => {
    setState((prev) => ({ ...prev, highlightedTimeSlot: timeSlot }))
  }, [])

  const highlightStore = useCallback((storeId: string | null) => {
    setState((prev) => ({ ...prev, highlightedStoreId: storeId }))
  }, [])

  const requestDrillThrough = useCallback((target: DrillThroughTarget | null) => {
    setState((prev) => ({ ...prev, drillThroughTarget: target }))
  }, [])

  const clearAll = useCallback(() => {
    setState(INITIAL_STATE)
  }, [])

  const value = useMemo(
    () => ({
      ...state,
      highlightCategory,
      highlightTimeSlot,
      highlightStore,
      requestDrillThrough,
      clearAll,
    }),
    [state, highlightCategory, highlightTimeSlot, highlightStore, requestDrillThrough, clearAll],
  )

  return (
    <CrossChartSelectionContext.Provider value={value}>
      {children}
    </CrossChartSelectionContext.Provider>
  )
}
