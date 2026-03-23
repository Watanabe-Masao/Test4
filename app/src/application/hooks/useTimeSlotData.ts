/**
 * TimeSlotChart のデータロジックフック
 *
 * R11準拠: 純粋計算は useTimeSlotDataLogic.ts に分離。
 * 本ファイルは DuckDB クエリ発行 + 状態管理 + 計算結果の memo のみ。
 *
 * @layer Application — orchestrator hook
 * @guard G5 state ≤6 (5個), memo ≤7 (4個)
 */
import { useState, useMemo } from 'react'
import type { AsyncDuckDBConnection, AsyncDuckDB } from '@duckdb/duckdb-wasm'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import {
  useDuckDBHourlyAggregation,
  useDuckDBDistinctDayCount,
  useDuckDBLevelAggregation,
  useDuckDBCategoryHourly,
} from '@/application/hooks/useDuckDBQuery'
import { useDuckDBWeatherHourlyAvg } from '@/application/hooks/duckdb/useWeatherHourlyQuery'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { useDataStore } from '@/application/stores/dataStore'
import {
  useHierarchySelection,
  useHierarchyOptions,
} from '@/application/hooks/useHierarchySelection'
import {
  type ViewMode,
  type MetricMode,
  buildWowRange,
  computeChartDataAndKpi,
  computeYoYData,
  computeInsights,
} from '@/application/usecases/timeSlotDataLogic'

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
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDb?: AsyncDuckDB | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  readonly prevYearScope?: PrevYearScope
}

export function useDuckDBTimeSlotData({
  duckConn,
  duckDb,
  duckDataVersion,
  currentDateRange,
  selectedStoreIds,
  prevYearScope,
}: Params) {
  // ── UI State (5 個 — G5 ≤6 準拠) ──
  const [viewMode, setViewMode] = useState<ViewMode>('chart')
  const [metricMode, setMetricMode] = useState<MetricMode>('amount')
  const [compMode, setCompMode] = useState<'yoy' | 'wow'>('yoy')
  const [showPrev, setShowPrev] = useState(true)
  const [mode, setMode] = useState<'total' | 'daily'>('total')

  // ── Hierarchy State (sub-hook: state 3 + memo 1) ──
  const { deptCode, lineCode, klassCode, setDeptCode, setLineCode, setKlassCode, hierarchy } =
    useHierarchySelection()

  // ── Comparison Range ──
  const wowRange = useMemo(() => buildWowRange(currentDateRange), [currentDateRange])
  const compRange = compMode === 'wow' ? wowRange : prevYearScope?.dateRange
  const compIsPrevYear = compMode === 'yoy'

  // ── DuckDB queries ──

  const {
    data: currentHourly,
    isLoading,
    error,
  } = useDuckDBHourlyAggregation(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    hierarchy,
    false,
  )
  const { data: compHourly } = useDuckDBHourlyAggregation(
    duckConn,
    duckDataVersion,
    compRange,
    selectedStoreIds,
    hierarchy,
    compIsPrevYear,
  )
  const { data: currentDayCount } = useDuckDBDistinctDayCount(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    false,
  )
  const { data: compDayCount } = useDuckDBDistinctDayCount(
    duckConn,
    duckDataVersion,
    compRange,
    selectedStoreIds,
    compIsPrevYear,
  )

  // Hierarchy dropdowns
  const { data: departments } = useDuckDBLevelAggregation(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    'department',
    undefined,
    false,
  )
  const { data: lines } = useDuckDBLevelAggregation(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    'line',
    deptCode ? { deptCode } : undefined,
    false,
  )
  const { data: klasses } = useDuckDBLevelAggregation(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    'klass',
    deptCode || lineCode
      ? { deptCode: deptCode || undefined, lineCode: lineCode || undefined }
      : undefined,
    false,
  )

  // ── Hierarchy Options (sub-hook: 3 useMemo) ──
  const { deptOptions, lineOptions, klassOptions } = useHierarchyOptions(
    departments,
    lines,
    klasses,
  )

  // ── カテゴリ×時間帯集約 ──
  const heatmapLevel = deptCode ? (lineCode ? 'klass' : 'line') : 'department'
  const { data: categoryHourlyData } = useDuckDBCategoryHourly(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    heatmapLevel as 'department' | 'line' | 'klass',
    hierarchy,
    false,
  )

  // ── 天気時間帯平均 ──
  const storeLocations = useSettingsStore((s) => s.settings.storeLocations)
  const allStoreIds = useDataStore((s) => s.data.stores)
  const weatherStoreId = useMemo(() => {
    const ids = selectedStoreIds.size > 0 ? [...selectedStoreIds] : [...allStoreIds.keys()]
    return ids.find((id) => storeLocations[id]) ?? ids[0] ?? ''
  }, [selectedStoreIds, allStoreIds, storeLocations])

  const prevDateRange = compMode === 'yoy' ? prevYearScope?.dateRange : undefined
  const { data: curWeatherAvg } = useDuckDBWeatherHourlyAvg(
    duckConn,
    duckDataVersion,
    weatherStoreId,
    currentDateRange,
    duckDb,
  )
  const { data: prevWeatherAvg } = useDuckDBWeatherHourlyAvg(
    duckConn,
    duckDataVersion,
    weatherStoreId,
    prevDateRange,
    duckDb,
  )

  const hasPrev = (compHourly?.length ?? 0) > 0
  const compLabel = compMode === 'wow' ? '前週' : '前年'
  const curLabel = compMode === 'wow' ? '当週' : '当年'

  // ── Computed values (4 useMemo — G5 ≤7 準拠) ──

  const { chartData, kpi } = useMemo(
    () =>
      computeChartDataAndKpi({
        currentHourly,
        compHourly,
        mode,
        currentDayCount,
        compDayCount,
        hasPrev,
      }),
    [currentHourly, compHourly, mode, currentDayCount, compDayCount, hasPrev],
  )

  const yoyData = useMemo(
    () => computeYoYData(currentHourly, compHourly),
    [currentHourly, compHourly],
  )

  const insights = useMemo(
    () => computeInsights(kpi, compHourly, yoyData, compLabel),
    [kpi, compHourly, yoyData, compLabel],
  )

  return {
    chartData,
    kpi,
    yoyData,
    insights,
    isLoading,
    error,
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
    categoryHourlyData,
    curWeatherAvg,
    prevWeatherAvg,
  }
}
