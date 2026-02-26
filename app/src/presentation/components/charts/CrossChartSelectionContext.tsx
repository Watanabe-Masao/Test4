/**
 * クロスチャート統合選択コンテキスト
 *
 * 複数のチャート間でカテゴリ・時間帯・店舗の選択状態を共有し、
 * 一方のチャートでの操作が他方のチャートに伝播する統合的な分析体験を実現する。
 */
import { createContext, useContext, useState, useMemo, useCallback, type ReactNode } from 'react'

// ─── Types ────────────────────────────────────────────

/** ハイライト対象カテゴリ */
export interface CategoryHighlight {
  readonly departmentCode?: string
  readonly lineCode?: string
  readonly klassCode?: string
  readonly name: string
}

/** ハイライト対象時間帯 */
export interface TimeSlotHighlight {
  readonly hour: number
  readonly dow?: number // 曜日（0=日, 1=月, ..., 6=土）
}

/** ドリルスルーリンクの宛先 */
export interface DrillThroughTarget {
  readonly widgetId: string
  readonly filter?: {
    readonly storeId?: string
    readonly categoryCode?: string
    readonly hour?: number
  }
}

interface CrossChartSelectionState {
  /** ハイライト中のカテゴリ（nullで解除） */
  readonly highlightedCategory: CategoryHighlight | null
  /** ハイライト中の時間帯（nullで解除） */
  readonly highlightedTimeSlot: TimeSlotHighlight | null
  /** ハイライト中の店舗ID（nullで解除） */
  readonly highlightedStoreId: string | null
  /** ドリルスルーリクエスト（nullで無し） */
  readonly drillThroughTarget: DrillThroughTarget | null
}

interface CrossChartSelectionActions {
  highlightCategory: (category: CategoryHighlight | null) => void
  highlightTimeSlot: (timeSlot: TimeSlotHighlight | null) => void
  highlightStore: (storeId: string | null) => void
  requestDrillThrough: (target: DrillThroughTarget | null) => void
  clearAll: () => void
}

type CrossChartSelectionContextValue = CrossChartSelectionState & CrossChartSelectionActions

// ─── Context ──────────────────────────────────────────

const INITIAL_STATE: CrossChartSelectionState = {
  highlightedCategory: null,
  highlightedTimeSlot: null,
  highlightedStoreId: null,
  drillThroughTarget: null,
}

const CrossChartSelectionContext = createContext<CrossChartSelectionContextValue>({
  ...INITIAL_STATE,
  highlightCategory: () => {},
  highlightTimeSlot: () => {},
  highlightStore: () => {},
  requestDrillThrough: () => {},
  clearAll: () => {},
})

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

// ─── Hook ─────────────────────────────────────────────

export function useCrossChartSelection() {
  return useContext(CrossChartSelectionContext)
}

/**
 * ドリルスルーリンクを受信するフック。
 * 指定されたwidgetIdが自分のIDと一致した場合にフィルタを返す。
 */
export function useDrillThroughReceiver(widgetId: string) {
  const { drillThroughTarget, requestDrillThrough } = useCrossChartSelection()

  const isTargeted = drillThroughTarget?.widgetId === widgetId
  const filter = isTargeted ? drillThroughTarget?.filter ?? null : null

  const dismiss = useCallback(() => {
    if (isTargeted) {
      requestDrillThrough(null)
    }
  }, [isTargeted, requestDrillThrough])

  return { isTargeted, filter, dismiss }
}
