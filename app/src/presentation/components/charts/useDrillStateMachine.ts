/**
 * useDrillStateMachine — IntegratedSalesChart のドリル状態マシン
 *
 * useIntegratedSalesState.ts から分離。
 * 7 つの useState を 1 つの useReducer に統合し、
 * ドリルレベル遷移・範囲選択・サブタブ切替を単一の状態遷移で管理する。
 *
 * @guard G5 presentationStateLimits 許可リスト削除条件: "ドリル状態を reducer に統合する時"
 */
import { useReducer, useCallback, useRef, useEffect } from 'react'
import type { SubTabKey } from './IntegratedSalesSubTabs'

// ── State ──

interface SelectedRange {
  readonly start: number
  readonly end: number
}

export interface DrillState {
  readonly selectedRange: SelectedRange | null
  readonly drillLevel: number
  readonly slideDirection: number
  readonly clickedDay: number | null
  readonly subTab: SubTabKey
  readonly pendingRange: SelectedRange | null
  readonly drillEnd: number | null
}

const INITIAL_STATE: DrillState = {
  selectedRange: null,
  drillLevel: 0,
  slideDirection: 1,
  clickedDay: null,
  subTab: 'trend',
  pendingRange: null,
  drillEnd: null,
}

// ── Actions ──

type DrillAction =
  | { type: 'DAY_CLICK'; day: number }
  | { type: 'DAY_RANGE_SELECT'; start: number; end: number }
  | { type: 'RANGE_TO_TIMESLOT' }
  | { type: 'RANGE_TO_DRILLDOWN' }
  | { type: 'RANGE_CANCEL' }
  | { type: 'DRILL_TO_TIMESLOT' }
  | { type: 'BACK_TO_DAILY' }
  | { type: 'SET_SUB_TAB'; tab: SubTabKey }
  | { type: 'SET_CLICKED_DAY'; day: number | null }
  | { type: 'SET_DRILL_END'; end: number | null }

// ── Reducer ──

function drillReducer(state: DrillState, action: DrillAction): DrillState {
  switch (action.type) {
    case 'DAY_CLICK': {
      const isToggleOff = state.clickedDay === action.day
      return {
        ...state,
        clickedDay: isToggleOff ? null : action.day,
        subTab: isToggleOff ? 'trend' : 'drilldown',
        drillEnd: null,
        pendingRange: null,
      }
    }
    case 'DAY_RANGE_SELECT':
      return {
        ...state,
        pendingRange: { start: action.start, end: action.end },
        clickedDay: action.start,
        drillEnd: action.end,
        subTab: 'drilldown',
      }
    case 'RANGE_TO_TIMESLOT':
      if (!state.pendingRange) return state
      return {
        ...state,
        selectedRange: state.pendingRange,
        pendingRange: null,
        slideDirection: 1,
        drillLevel: 1,
      }
    case 'RANGE_TO_DRILLDOWN':
      if (!state.pendingRange) return state
      return {
        ...state,
        drillEnd: state.pendingRange.end,
        clickedDay: state.pendingRange.start,
        pendingRange: null,
        subTab: 'drilldown',
      }
    case 'RANGE_CANCEL':
      return { ...state, pendingRange: null }
    case 'DRILL_TO_TIMESLOT':
      return {
        ...state,
        slideDirection: 1 > state.drillLevel ? 1 : -1,
        drillLevel: 1,
      }
    case 'BACK_TO_DAILY':
      return {
        ...state,
        slideDirection: 0 > state.drillLevel ? 1 : -1,
        drillLevel: 0,
        selectedRange: null,
      }
    case 'SET_SUB_TAB':
      return { ...state, subTab: action.tab }
    case 'SET_CLICKED_DAY':
      return { ...state, clickedDay: action.day }
    case 'SET_DRILL_END':
      return { ...state, drillEnd: action.end }
  }
}

// ── Hook ──

/** ヘッダ固定分の offset（px） */
const SCROLL_OFFSET = 16

interface UseDrillStateMachineParams {
  readonly canDrill: boolean
}

export function useDrillStateMachine({ canDrill }: UseDrillStateMachineParams) {
  const [state, dispatch] = useReducer(drillReducer, INITIAL_STATE)

  const parentRef = useRef<HTMLDivElement>(null)
  const drillPanelRef = useRef<HTMLDivElement>(null)
  const prevIsDrilledRef = useRef(false)

  const isDrilled = state.selectedRange != null

  // drill 開始時: ナビ見出しへ自動スクロール
  useEffect(() => {
    if (isDrilled && !prevIsDrilledRef.current) {
      requestAnimationFrame(() => {
        if (parentRef.current) {
          const rect = parentRef.current.getBoundingClientRect()
          window.scrollTo({
            top: window.scrollY + rect.top - SCROLL_OFFSET,
            behavior: 'smooth',
          })
        }
      })
    }
    prevIsDrilledRef.current = isDrilled
  }, [isDrilled])

  // ── handlers ──
  const handleDayClick = useCallback((day: number) => {
    dispatch({ type: 'DAY_CLICK', day })
  }, [])

  const handleDayRangeSelect = useCallback(
    (startDay: number, endDay: number) => {
      if (!canDrill) return
      dispatch({ type: 'DAY_RANGE_SELECT', start: startDay, end: endDay })
    },
    [canDrill],
  )

  const handleRangeToTimeSlot = useCallback(() => dispatch({ type: 'RANGE_TO_TIMESLOT' }), [])

  /** ダブルクリック → 範囲選択 + 即座に時間帯チャートへ遷移 */
  const handleDblClickToTimeSlot = useCallback(
    (day: number) => {
      if (!canDrill) return
      dispatch({ type: 'DAY_RANGE_SELECT', start: day, end: day })
      // 次の tick で RANGE_TO_TIMESLOT を dispatch（state 更新後に実行）
      setTimeout(() => dispatch({ type: 'RANGE_TO_TIMESLOT' }), 0)
    },
    [canDrill],
  )

  const handleRangeToDrilldown = useCallback(() => dispatch({ type: 'RANGE_TO_DRILLDOWN' }), [])
  const handleRangeCancel = useCallback(() => dispatch({ type: 'RANGE_CANCEL' }), [])
  const handleDrillToTimeSlot = useCallback(() => dispatch({ type: 'DRILL_TO_TIMESLOT' }), [])

  const handleBackToDaily = useCallback(() => {
    dispatch({ type: 'BACK_TO_DAILY' })
    requestAnimationFrame(() => {
      if (parentRef.current) {
        const rect = parentRef.current.getBoundingClientRect()
        window.scrollTo({
          top: window.scrollY + rect.top - SCROLL_OFFSET,
          behavior: 'smooth',
        })
      }
    })
  }, [])

  const setSubTab = useCallback((tab: SubTabKey) => dispatch({ type: 'SET_SUB_TAB', tab }), [])
  const setClickedDay = useCallback(
    (day: number | null) => dispatch({ type: 'SET_CLICKED_DAY', day }),
    [],
  )
  const setDrillEnd = useCallback(
    (end: number | null) => dispatch({ type: 'SET_DRILL_END', end }),
    [],
  )

  return {
    // state (flat for consumer convenience)
    selectedRange: state.selectedRange,
    drillLevel: state.drillLevel,
    slideDirection: state.slideDirection,
    clickedDay: state.clickedDay,
    subTab: state.subTab,
    pendingRange: state.pendingRange,
    drillEnd: state.drillEnd,
    // derived
    isDrilled,
    // refs
    parentRef,
    drillPanelRef,
    // setters
    setSubTab,
    setClickedDay,
    setDrillEnd,
    // handlers
    handleDayClick,
    handleDayRangeSelect,
    handleRangeToTimeSlot,
    handleDblClickToTimeSlot,
    handleRangeToDrilldown,
    handleRangeCancel,
    handleDrillToTimeSlot,
    handleBackToDaily,
  }
}
