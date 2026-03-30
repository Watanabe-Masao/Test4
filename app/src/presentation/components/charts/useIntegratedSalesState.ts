/**
 * useIntegratedSalesState — IntegratedSalesChart の状態管理・データ取得ロジック
 *
 * drill state machine、日別点数クエリ、分析文脈構築、移動平均 overlay を担う。
 * UI レンダリングは IntegratedSalesChart.tsx に残す。
 *
 * @guard G5 hook ≤300行
 */
import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
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
import { useDrillDateRange } from '@/application/hooks/useDrillDateRange'
import {
  buildSalesAnalysisContext,
  deriveChildContext,
} from '@/application/models/SalesAnalysisContext'
import {
  buildRootNodeContext,
  deriveNodeContext,
  deriveDeptPatternContext,
  DEFAULT_TOP_DEPARTMENT_POLICY,
} from '@/application/models/AnalysisNodeContext'
import type { RightAxisMode } from './DailySalesChartBodyLogic'
import type { ViewType } from './DailySalesChartBody'
import type { SubTabKey } from './IntegratedSalesSubTabs'

interface SelectedRange {
  readonly start: number
  readonly end: number
}

interface UseIntegratedSalesStateParams {
  readonly queryExecutor: QueryExecutor | null
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  readonly prevYearScope?: PrevYearScope
  readonly year: number
  readonly month: number
  readonly daysInMonth: number
}

/** ヘッダ固定分の offset（px） */
const SCROLL_OFFSET = 16

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
  const [selectedRange, setSelectedRange] = useState<SelectedRange | null>(null)
  const [rightAxisMode, setRightAxisMode] = useState<RightAxisMode>('quantity')
  const [dailyView, setDailyView] = useState<ViewType>('standard')
  const [drillLevel, setDrillLevel] = useState(0)
  const [slideDirection, setSlideDirection] = useState(1)
  const [clickedDay, setClickedDay] = useState<number | null>(null)
  const [subTab, setSubTab] = useState<SubTabKey>('trend')
  const [pendingRange, setPendingRange] = useState<{ start: number; end: number } | null>(null)
  const [drillEnd, setDrillEnd] = useState<number | null>(null)
  const [showMovingAverage, setShowMovingAverage] = useState(true)

  // ── refs ──
  const parentRef = useRef<HTMLDivElement>(null)
  const drillPanelRef = useRef<HTMLDivElement>(null)
  const prevIsDrilledRef = useRef(false)

  const canDrill = queryExecutor?.isReady === true

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

  // ── イベントハンドラ ──
  const handleDayClick = useCallback((day: number) => {
    setClickedDay((prev) => {
      if (prev === day) {
        setSubTab('trend')
        return null
      }
      setSubTab('drilldown')
      return day
    })
    setDrillEnd(null)
  }, [])

  const handleDayRangeSelect = useCallback(
    (startDay: number, endDay: number) => {
      if (!canDrill) return
      setPendingRange({ start: startDay, end: endDay })
    },
    [canDrill],
  )

  const handleRangeToTimeSlot = useCallback(() => {
    if (!pendingRange) return
    setSelectedRange(pendingRange)
    setPendingRange(null)
    setSlideDirection(1)
    setDrillLevel(1)
  }, [pendingRange])

  const handleRangeToDrilldown = useCallback(() => {
    if (!pendingRange) return
    setDrillEnd(pendingRange.end)
    setClickedDay(pendingRange.start)
    setPendingRange(null)
    setSubTab('drilldown')
  }, [pendingRange])

  const handleRangeCancel = useCallback(() => setPendingRange(null), [])

  // ── drill DateRange ──
  const { dateRange: rangeDateRange, prevYearScope: rangePrevYearScope } = useDrillDateRange(
    selectedRange,
    year,
    month,
    prevYearScope,
  )

  const isDrilled = selectedRange != null && rangeDateRange != null

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

  // ── 分析文脈 ──
  const parentContext = useMemo(
    () => buildSalesAnalysisContext(currentDateRange, selectedStoreIds, prevYearScope),
    [currentDateRange, selectedStoreIds, prevYearScope],
  )

  const drillContext = useMemo(() => {
    if (!isDrilled || !rangeDateRange) return null
    return deriveChildContext(parentContext, rangeDateRange, rangePrevYearScope ?? undefined)
  }, [isDrilled, rangeDateRange, rangePrevYearScope, parentContext])

  const drillTabRange = useMemo<{ start: number; end: number } | null>(
    () => (clickedDay != null ? { start: clickedDay, end: drillEnd ?? clickedDay } : null),
    [clickedDay, drillEnd],
  )
  const { dateRange: drillTabDateRange, prevYearScope: drillTabPrevYearScope } = useDrillDateRange(
    drillTabRange,
    year,
    month,
    prevYearScope,
  )
  const analysisContext = useMemo(() => {
    if (!drillTabDateRange) return parentContext
    return deriveChildContext(parentContext, drillTabDateRange, drillTabPrevYearScope ?? undefined)
  }, [parentContext, drillTabDateRange, drillTabPrevYearScope])

  // AnalysisNodeContext
  const dailyNode = useMemo(
    () => buildRootNodeContext(parentContext, 'daily-sales'),
    [parentContext],
  )
  const timeSlotNode = useMemo(
    () =>
      isDrilled && drillContext
        ? deriveNodeContext(dailyNode, 'time-slot', {
            overrideBase: drillContext,
            focus: selectedRange
              ? {
                  kind: 'day-range' as const,
                  startDay: selectedRange.start,
                  endDay: selectedRange.end,
                }
              : undefined,
          })
        : null,
    [dailyNode, isDrilled, drillContext, selectedRange],
  )
  const deptPatternNode = useMemo(
    () =>
      timeSlotNode ? deriveDeptPatternContext(timeSlotNode, DEFAULT_TOP_DEPARTMENT_POLICY) : null,
    [timeSlotNode],
  )
  void deptPatternNode

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
  const rangeLabel =
    selectedRange != null
      ? selectedRange.start === selectedRange.end
        ? `${month}月${selectedRange.start}日`
        : `${month}月${selectedRange.start}〜${selectedRange.end}日`
      : ''

  // ── ドリルレベル管理 ──
  const setDrillWithDirection = useCallback(
    (next: number) => {
      setSlideDirection(next > drillLevel ? 1 : -1)
      setDrillLevel(next)
    },
    [drillLevel],
  )

  const handleDrillToTimeSlot = useCallback(() => setDrillWithDirection(1), [setDrillWithDirection])
  const handleBackToDaily = useCallback(() => {
    setDrillWithDirection(0)
    setSelectedRange(null)
    requestAnimationFrame(() => {
      if (parentRef.current) {
        const rect = parentRef.current.getBoundingClientRect()
        window.scrollTo({
          top: window.scrollY + rect.top - SCROLL_OFFSET,
          behavior: 'smooth',
        })
      }
    })
  }, [setDrillWithDirection])

  return {
    // state
    selectedRange,
    rightAxisMode,
    setRightAxisMode,
    dailyView,
    setDailyView,
    drillLevel,
    slideDirection,
    clickedDay,
    setClickedDay,
    subTab,
    setSubTab,
    pendingRange,
    drillEnd,
    setDrillEnd,
    showMovingAverage,
    setShowMovingAverage,
    // refs
    parentRef,
    drillPanelRef,
    // derived
    canDrill,
    isDrilled,
    dailyQuantity,
    drillContext,
    analysisContext,
    drillTabDateRange,
    maOverlays,
    rangeLabel,
    // handlers
    handleDayClick,
    handleDayRangeSelect,
    handleRangeToTimeSlot,
    handleRangeToDrilldown,
    handleRangeCancel,
    handleDrillToTimeSlot,
    handleBackToDaily,
  }
}
