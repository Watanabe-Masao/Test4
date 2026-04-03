/**
 * useIntegratedSalesState — IntegratedSalesChart の状態管理
 *
 * ドリル状態マシンは useDrillStateMachine に、
 * 分析文脈構築は useIntegratedSalesContext に分離。
 * クエリ取得は useIntegratedSalesPlan に委譲。
 *
 * @guard H1 Screen Plan 経由のみ — useIntegratedSalesPlan がクエリを一元管理
 * @guard H2 比較は pair/bundle 契約 — dailyQuantityPairHandler で cur/prev 一括取得
 */
import { useState } from 'react'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useIntegratedSalesPlan } from './useIntegratedSalesPlan'
import { useDrillStateMachine } from './useDrillStateMachine'
import { useIntegratedSalesContext } from './useIntegratedSalesContext'
import type { RightAxisMode } from './DailySalesChartBodyLogic'
import type { ViewType } from './DailySalesChartBody'

interface UseIntegratedSalesStateParams {
  readonly queryExecutor: QueryExecutor | null
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  readonly prevYearScope?: PrevYearScope
  readonly year: number
  readonly month: number
  readonly daysInMonth: number
}

export function useIntegratedSalesState(params: UseIntegratedSalesStateParams) {
  const {
    queryExecutor,
    currentDateRange,
    selectedStoreIds,
    prevYearScope,
    year,
    month,
    daysInMonth,
  } = params

  // ── UI state ──
  const [rightAxisMode, setRightAxisMode] = useState<RightAxisMode>('quantity')
  const [dailyView, setDailyView] = useState<ViewType>('standard')
  const [showMovingAverage, setShowMovingAverage] = useState(true)

  const canDrill = queryExecutor?.isReady === true

  // ── ドリル状態マシン ──
  const drill = useDrillStateMachine({ canDrill })

  // ── 分析文脈 ──
  const contexts = useIntegratedSalesContext({
    currentDateRange,
    selectedStoreIds,
    prevYearScope,
    year,
    month,
    selectedRange: drill.selectedRange,
    isDrilled: drill.isDrilled,
    clickedDay: drill.clickedDay,
    drillEnd: drill.drillEnd,
  })

  // ── Screen Query Plan（クエリ取得を plan に委譲） ──
  const { dailyQuantity, maOverlays } = useIntegratedSalesPlan({
    queryExecutor,
    currentDateRange,
    selectedStoreIds,
    prevYearScope,
    daysInMonth,
    rightAxisMode,
    showMovingAverage,
    dailyView,
  })

  // ── 表示用ラベル ──
  const { selectedRange } = drill
  const rangeLabel =
    selectedRange != null
      ? selectedRange.start === selectedRange.end
        ? `${month}月${selectedRange.start}日`
        : `${month}月${selectedRange.start}〜${selectedRange.end}日`
      : ''

  return {
    // state
    rightAxisMode,
    setRightAxisMode,
    dailyView,
    setDailyView,
    drillLevel: drill.drillLevel,
    slideDirection: drill.slideDirection,
    clickedDay: drill.clickedDay,
    setClickedDay: drill.setClickedDay,
    subTab: drill.subTab,
    setSubTab: drill.setSubTab,
    pendingRange: drill.pendingRange,
    drillEnd: drill.drillEnd,
    setDrillEnd: drill.setDrillEnd,
    showMovingAverage,
    setShowMovingAverage,
    // refs
    parentRef: drill.parentRef,
    drillPanelRef: drill.drillPanelRef,
    // derived
    canDrill,
    isDrilled: drill.isDrilled,
    dailyQuantity,
    drillContext: contexts.drillContext,
    analysisContext: contexts.analysisContext,
    drillTabDateRange: contexts.drillTabDateRange,
    maOverlays,
    rangeLabel,
    // handlers
    handleDayClick: drill.handleDayClick,
    handleDayRangeSelect: drill.handleDayRangeSelect,
    handleRangeToTimeSlot: drill.handleRangeToTimeSlot,
    handleDblClickToTimeSlot: drill.handleDblClickToTimeSlot,
    handleRangeToDrilldown: drill.handleRangeToDrilldown,
    handleRangeCancel: drill.handleRangeCancel,
    handleDrillToTimeSlot: drill.handleDrillToTimeSlot,
    handleBackToDaily: drill.handleBackToDaily,
  }
}
