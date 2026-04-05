/**
 * TimeSlotChart のデータロジックフック
 *
 * R11準拠: 純粋計算は timeSlotDataLogic.ts に分離。
 * クエリ orchestration は useTimeSlotPlan に分離（P2-3/P3-1）。
 * 本ファイルは UI state + hierarchy state + derivation memo のみ。
 *
 * @layer Application — orchestrator hook
 * @guard H1 Screen Plan 経由のみ
 */
import { useState, useMemo } from 'react'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import type { WeatherPersister } from '@/application/queries/weather'
import {
  useHierarchySelection,
  useHierarchyOptions,
} from '@/application/hooks/useHierarchySelection'
import {
  type ViewMode,
  type MetricMode,
  computeChartDataAndKpi,
  computeYoYData,
  computeInsights,
} from '@/application/usecases/timeSlotDataLogic'
import { useTimeSlotPlan } from '@/features/time-slot'

// Re-export types for consumers
export type {
  ViewMode,
  MetricMode,
  TimeSlotKpi,
  YoYRow,
  YoYData,
} from '@/application/usecases/timeSlotDataLogic'
export type { HierarchyOption } from '@/application/hooks/useHierarchySelection'

// ── Hook ──

interface Params {
  readonly queryExecutor: QueryExecutor | null
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  readonly prevYearScope?: PrevYearScope
  /** 天気データ永続化コールバック（ETRN フォールバック用） */
  readonly weatherPersist?: WeatherPersister | null
}

export function useTimeSlotData({
  queryExecutor,
  currentDateRange,
  selectedStoreIds,
  prevYearScope,
  weatherPersist,
}: Params) {
  // ── UI State ──
  const [viewMode, setViewMode] = useState<ViewMode>('chart')
  const [metricMode, setMetricMode] = useState<MetricMode>('amount')
  const [compMode, setCompMode] = useState<'yoy' | 'wow'>('yoy')
  const [showPrev, setShowPrev] = useState(true)
  const [mode, setMode] = useState<'total' | 'daily'>('total')

  // ── Hierarchy State ──
  const { deptCode, lineCode, klassCode, setDeptCode, setLineCode, setKlassCode, hierarchy } =
    useHierarchySelection()

  // ── Query Plan ──
  const plan = useTimeSlotPlan({
    queryExecutor,
    currentDateRange,
    selectedStoreIds,
    prevYearScope,
    weatherPersist,
    compMode,
    hierarchy,
  })

  // ── Hierarchy Options ──
  const { deptOptions, lineOptions, klassOptions } = useHierarchyOptions(
    plan.deptRecords,
    plan.lineRecords,
    plan.klassRecords,
  )

  const hasPrev = (plan.compHourly?.length ?? 0) > 0
  const compLabel = compMode === 'wow' ? '前週' : '前年'
  const curLabel = compMode === 'wow' ? '当週' : '当年'

  // ── Computed values ──

  const { chartData, kpi } = useMemo(
    () =>
      computeChartDataAndKpi({
        currentHourly: plan.currentHourly,
        compHourly: plan.compHourly,
        mode,
        currentDayCount: plan.currentDayCount,
        compDayCount: plan.compDayCount,
        hasPrev,
      }),
    [plan.currentHourly, plan.compHourly, mode, plan.currentDayCount, plan.compDayCount, hasPrev],
  )

  const yoyData = useMemo(
    () => computeYoYData(plan.currentHourly, plan.compHourly),
    [plan.currentHourly, plan.compHourly],
  )

  const insights = useMemo(
    () => computeInsights(kpi, plan.compHourly, yoyData, compLabel),
    [kpi, plan.compHourly, yoyData, compLabel],
  )

  return {
    chartData,
    kpi,
    yoyData,
    insights,
    isLoading: plan.isLoading,
    error: plan.error,
    viewMode,
    setViewMode,
    metricMode,
    setMetricMode,
    compMode,
    setCompMode,
    showPrev,
    setShowPrev,
    mode,
    setMode,
    hasPrev,
    compLabel,
    curLabel,
    deptCode,
    lineCode,
    klassCode,
    setDeptCode,
    setLineCode,
    setKlassCode,
    deptOptions,
    lineOptions,
    klassOptions,
    categoryHourlyData: plan.categoryHourlyData,
    prevCategoryHourlyData: plan.prevCategoryHourlyData,
    curWeatherAvg: plan.curWeatherAvg,
    prevWeatherAvg: plan.prevWeatherAvg,
  }
}
