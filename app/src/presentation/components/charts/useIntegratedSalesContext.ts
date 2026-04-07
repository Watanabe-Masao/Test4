/**
 * useIntegratedSalesContext — 分析文脈の構築
 *
 * useIntegratedSalesState.ts から分離。
 * SalesAnalysisContext / AnalysisNodeContext の構築と
 * drill 用 DateRange の解決を担う。
 * @responsibility R:orchestration
 */
import { useMemo } from 'react'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
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
import { useDrillDateRange } from '@/application/hooks/useDrillDateRange'

interface SelectedRange {
  readonly start: number
  readonly end: number
}

interface UseIntegratedSalesContextParams {
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  readonly prevYearScope?: PrevYearScope
  readonly year: number
  readonly month: number
  // drill state
  readonly selectedRange: SelectedRange | null
  readonly isDrilled: boolean
  readonly clickedDay: number | null
  readonly drillEnd: number | null
}

export function useIntegratedSalesContext(params: UseIntegratedSalesContextParams) {
  const {
    currentDateRange,
    selectedStoreIds,
    prevYearScope,
    year,
    month,
    selectedRange,
    isDrilled,
    clickedDay,
    drillEnd,
  } = params

  // ── drill DateRange（時間帯ドリル用） ──
  const { dateRange: rangeDateRange, prevYearScope: rangePrevYearScope } = useDrillDateRange(
    selectedRange,
    year,
    month,
    prevYearScope,
  )

  // ── 親コンテキスト ──
  const parentContext = useMemo(
    () => buildSalesAnalysisContext(currentDateRange, selectedStoreIds, prevYearScope),
    [currentDateRange, selectedStoreIds, prevYearScope],
  )

  // ── ドリルコンテキスト（時間帯分析） ──
  const drillContext = useMemo(() => {
    if (!isDrilled || !rangeDateRange) return null
    return deriveChildContext(parentContext, rangeDateRange, rangePrevYearScope ?? undefined)
  }, [isDrilled, rangeDateRange, rangePrevYearScope, parentContext])

  // ── サブタブ用 DateRange ──
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

  // ── 分析コンテキスト（サブタブ用） ──
  const analysisContext = useMemo(() => {
    if (!drillTabDateRange) return parentContext
    return deriveChildContext(parentContext, drillTabDateRange, drillTabPrevYearScope ?? undefined)
  }, [parentContext, drillTabDateRange, drillTabPrevYearScope])

  // ── AnalysisNodeContext ──
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

  return {
    rangeDateRange,
    parentContext,
    drillContext,
    drillTabDateRange,
    analysisContext,
  }
}
