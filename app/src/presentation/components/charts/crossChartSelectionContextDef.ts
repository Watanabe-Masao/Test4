/**
 * CrossChartSelection コンテキスト定義（型 + createContext）
 *
 * react-refresh/only-export-components 対応のため、
 * createContext と型定義を .ts ファイルに分離。
 */
import { createContext } from 'react'

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

export interface CrossChartSelectionState {
  /** ハイライト中のカテゴリ（nullで解除） */
  readonly highlightedCategory: CategoryHighlight | null
  /** ハイライト中の時間帯（nullで解除） */
  readonly highlightedTimeSlot: TimeSlotHighlight | null
  /** ハイライト中の店舗ID（nullで解除） */
  readonly highlightedStoreId: string | null
  /** ドリルスルーリクエスト（nullで無し） */
  readonly drillThroughTarget: DrillThroughTarget | null
}

export interface CrossChartSelectionActions {
  highlightCategory: (category: CategoryHighlight | null) => void
  highlightTimeSlot: (timeSlot: TimeSlotHighlight | null) => void
  highlightStore: (storeId: string | null) => void
  requestDrillThrough: (target: DrillThroughTarget | null) => void
  clearAll: () => void
}

export type CrossChartSelectionContextValue = CrossChartSelectionState & CrossChartSelectionActions

// ─── Context ──────────────────────────────────────────

export const INITIAL_STATE: CrossChartSelectionState = {
  highlightedCategory: null,
  highlightedTimeSlot: null,
  highlightedStoreId: null,
  drillThroughTarget: null,
}

export const CrossChartSelectionContext = createContext<CrossChartSelectionContextValue>({
  ...INITIAL_STATE,
  highlightCategory: () => {},
  highlightTimeSlot: () => {},
  highlightStore: () => {},
  requestDrillThrough: () => {},
  clearAll: () => {},
})
