/**
 * useIntegratedSalesState — IntegratedSalesChart の状態管理・データ取得ロジック
 *
 * ドリル状態マシンは useDrillStateMachine に、
 * 分析文脈構築は useIntegratedSalesContext に分離。
 * 本 hook は日別点数クエリと移動平均 overlay を担う。
 */
import { useState, useMemo } from 'react'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import { dateRangeToKeys } from '@/domain/models/CalendarDate'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import { useMultiMovingAverage } from '@/application/hooks/useMultiMovingAverage'
import {
  dailyQuantityHandler,
  type DailyQuantityInput,
} from '@/application/queries/summary/DailyQuantityHandler'
import { aggregateDailyQuantity } from './IntegratedSalesChartLogic'
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

  // ── 日別点数データ（DuckDB 由来） ──
  const storeIds = useMemo(
    () => (selectedStoreIds.size > 0 ? [...selectedStoreIds] : undefined),
    [selectedStoreIds],
  )
  const curQtyInput = useMemo<DailyQuantityInput | null>(() => {
    const { fromKey, toKey } = dateRangeToKeys(currentDateRange)
    return { dateFrom: fromKey, dateTo: toKey, storeIds, isPrevYear: false }
  }, [currentDateRange, storeIds])
  const prevYearDateRange = prevYearScope?.dateRange
  const prevQtyInput = useMemo<DailyQuantityInput | null>(() => {
    if (!prevYearDateRange) return null
    const { fromKey, toKey } = dateRangeToKeys(prevYearDateRange)
    return { dateFrom: fromKey, dateTo: toKey, storeIds, isPrevYear: true }
  }, [prevYearDateRange, storeIds])
  const { data: curQtyOut } = useQueryWithHandler(queryExecutor, dailyQuantityHandler, curQtyInput)
  const { data: prevQtyOut } = useQueryWithHandler(
    queryExecutor,
    dailyQuantityHandler,
    prevQtyInput,
  )
  const dailyQuantity = useMemo(
    () =>
      aggregateDailyQuantity(
        curQtyOut?.records,
        prevQtyOut?.records,
        prevYearDateRange,
        currentDateRange,
        daysInMonth,
      ),
    [curQtyOut, prevQtyOut, prevYearDateRange, currentDateRange, daysInMonth],
  )

  // ── 移動平均 overlay ──
  const RIGHT_AXIS_MA_METRIC: Partial<
    Record<RightAxisMode, import('@/domain/models/temporal').AnalysisMetric>
  > = {
    quantity: 'quantity',
    customers: 'customers',
    discount: 'discount',
  }
  const maOverlays = useMultiMovingAverage(
    queryExecutor ?? null,
    currentDateRange,
    selectedStoreIds,
    prevYearScope,
    RIGHT_AXIS_MA_METRIC[rightAxisMode] ?? null,
    showMovingAverage && dailyView === 'standard',
  )

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
    handleRangeToDrilldown: drill.handleRangeToDrilldown,
    handleRangeCancel: drill.handleRangeCancel,
    handleDrillToTimeSlot: drill.handleDrillToTimeSlot,
    handleBackToDaily: drill.handleBackToDaily,
  }
}
