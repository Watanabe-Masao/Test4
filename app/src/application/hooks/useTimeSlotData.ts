/**
 * TimeSlotChart のデータロジックフック
 *
 * R11準拠: 純粋計算は timeSlotDataLogic.ts に分離。
 * 本ファイルは QueryHandler 経由クエリ発行 + 状態管理 + 計算結果の memo のみ。
 *
 * @layer Application — orchestrator hook
 * @guard G5 state ≤6 (6個), memo ≤7 (6個)
 */
import { useState, useMemo } from 'react'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import { dateRangeToKeys } from '@/domain/models/CalendarDate'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import {
  hourlyAggregationHandler,
  type HourlyAggregationInput,
} from '@/application/queries/cts/HourlyAggregationHandler'
import {
  distinctDayCountHandler,
  type DistinctDayCountInput,
} from '@/application/queries/cts/DistinctDayCountHandler'
import {
  levelAggregationHandler,
  type LevelAggregationInput,
} from '@/application/queries/cts/LevelAggregationHandler'
import {
  categoryHourlyHandler,
  type CategoryHourlyInput,
} from '@/application/queries/cts/CategoryHourlyHandler'
import {
  weatherHourlyAvgHandler,
  type WeatherHourlyAvgInput,
  type WeatherPersister,
} from '@/application/queries/weather'
import type { StoreLocation } from '@/domain/models/record'
import { useWeatherFallback } from './useWeatherFallback'
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

// ── Helper ──

function toKeys(range: DateRange): { dateFrom: string; dateTo: string } {
  const { fromKey, toKey } = dateRangeToKeys(range)
  return { dateFrom: fromKey, dateTo: toKey }
}

function storeIdsArray(ids: ReadonlySet<string>): readonly string[] | undefined {
  return ids.size > 0 ? [...ids] : undefined
}

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

  // ── Query Inputs (5 useMemo — G5 ≤7 準拠) ──

  const storeIds = storeIdsArray(selectedStoreIds)

  const curHourlyInput = useMemo<HourlyAggregationInput>(
    () => ({ ...toKeys(currentDateRange), storeIds, ...hierarchy, isPrevYear: false }),
    [currentDateRange, storeIds, hierarchy],
  )

  const compHourlyInput = useMemo<HourlyAggregationInput | null>(() => {
    if (!compRange) return null
    return { ...toKeys(compRange), storeIds, ...hierarchy, isPrevYear: compIsPrevYear }
  }, [compRange, storeIds, hierarchy, compIsPrevYear])

  const curDayCountInput = useMemo<DistinctDayCountInput>(
    () => ({ ...toKeys(currentDateRange), storeIds, isPrevYear: false }),
    [currentDateRange, storeIds],
  )

  const compDayCountInput = useMemo<DistinctDayCountInput | null>(() => {
    if (!compRange) return null
    return { ...toKeys(compRange), storeIds, isPrevYear: compIsPrevYear }
  }, [compRange, storeIds, compIsPrevYear])

  const deptInput = useMemo<LevelAggregationInput>(
    () => ({
      ...toKeys(currentDateRange),
      storeIds,
      level: 'department' as const,
      isPrevYear: false,
    }),
    [currentDateRange, storeIds],
  )

  const lineInput = useMemo<LevelAggregationInput | null>(() => {
    if (!deptCode) return null
    return {
      ...toKeys(currentDateRange),
      storeIds,
      level: 'line' as const,
      deptCode,
      isPrevYear: false,
    }
  }, [currentDateRange, storeIds, deptCode])

  const klassInput = useMemo<LevelAggregationInput | null>(() => {
    if (!deptCode && !lineCode) return null
    return {
      ...toKeys(currentDateRange),
      storeIds,
      level: 'klass' as const,
      deptCode: deptCode || undefined,
      lineCode: lineCode || undefined,
      isPrevYear: false,
    }
  }, [currentDateRange, storeIds, deptCode, lineCode])

  const heatmapLevel = deptCode ? (lineCode ? 'klass' : 'line') : 'department'
  const categoryHourlyInput = useMemo<CategoryHourlyInput>(
    () => ({
      ...toKeys(currentDateRange),
      storeIds,
      level: heatmapLevel as 'department' | 'line' | 'klass',
      ...hierarchy,
      isPrevYear: false,
    }),
    [currentDateRange, storeIds, heatmapLevel, hierarchy],
  )

  const pyRange = compMode === 'yoy' ? prevYearScope?.dateRange : undefined
  const prevCatHourlyInput = useMemo<CategoryHourlyInput | null>(
    () =>
      pyRange
        ? {
            ...toKeys(pyRange),
            storeIds,
            level: heatmapLevel as 'department' | 'line' | 'klass',
            ...hierarchy,
            isPrevYear: true,
          }
        : null,
    [pyRange, storeIds, heatmapLevel, hierarchy],
  )

  // ── Weather ──
  const storeLocations = useSettingsStore((s) => s.settings.storeLocations)
  const allStoreIds = useDataStore((s) => s.data.stores)
  const weatherStoreId = useMemo(() => {
    const ids = selectedStoreIds.size > 0 ? [...selectedStoreIds] : [...allStoreIds.keys()]
    return ids.find((id) => storeLocations[id]) ?? ids[0] ?? ''
  }, [selectedStoreIds, allStoreIds, storeLocations])

  const prevDateRange = compMode === 'yoy' ? prevYearScope?.dateRange : undefined
  const [prevWeatherRetry, setPrevWeatherRetry] = useState(0)
  const prevWeatherInput = useMemo<WeatherHourlyAvgInput | null>(() => {
    if (!prevDateRange) return null
    return {
      storeId: weatherStoreId,
      ...toKeys(prevDateRange),
      ...(prevWeatherRetry > 0 ? { _v: prevWeatherRetry } : {}),
    }
  }, [weatherStoreId, prevDateRange, prevWeatherRetry])

  const weatherKeys = useMemo(() => toKeys(currentDateRange), [currentDateRange])
  const location: StoreLocation | undefined = storeLocations[weatherStoreId]

  // curWeatherInput: weatherRetry をダミー値として含め、ETRN 永続化後に再クエリをトリガー
  const [weatherRetry, setWeatherRetry] = useState(0)
  const curWeatherInput = useMemo<WeatherHourlyAvgInput>(
    () => ({
      storeId: weatherStoreId,
      ...weatherKeys,
      ...(weatherRetry > 0 ? { _v: weatherRetry } : {}),
    }),
    [weatherStoreId, weatherKeys, weatherRetry],
  )

  // ── QueryHandler Queries ──

  const {
    data: curHourlyOut,
    isLoading,
    error,
  } = useQueryWithHandler(queryExecutor, hourlyAggregationHandler, curHourlyInput)
  const { data: compHourlyOut } = useQueryWithHandler(
    queryExecutor,
    hourlyAggregationHandler,
    compHourlyInput,
  )
  const { data: curDayCountOut } = useQueryWithHandler(
    queryExecutor,
    distinctDayCountHandler,
    curDayCountInput,
  )
  const { data: compDayCountOut } = useQueryWithHandler(
    queryExecutor,
    distinctDayCountHandler,
    compDayCountInput,
  )
  const { data: deptOut } = useQueryWithHandler(queryExecutor, levelAggregationHandler, deptInput)
  const { data: lineOut } = useQueryWithHandler(queryExecutor, levelAggregationHandler, lineInput)
  const { data: klassOut } = useQueryWithHandler(queryExecutor, levelAggregationHandler, klassInput)
  const { data: catHourlyOut } = useQueryWithHandler(
    queryExecutor,
    categoryHourlyHandler,
    categoryHourlyInput,
  )
  const { data: prevCatHourlyOut } = useQueryWithHandler(
    queryExecutor,
    categoryHourlyHandler,
    prevCatHourlyInput,
  )
  const { data: curWeatherOut } = useQueryWithHandler(
    queryExecutor,
    weatherHourlyAvgHandler,
    curWeatherInput,
  )
  const { data: prevWeatherOut } = useQueryWithHandler(
    queryExecutor,
    weatherHourlyAvgHandler,
    prevWeatherInput,
  )

  // ── Weather ETRN Fallback (sub-hook) ──
  // DuckDB クエリが完了して空だった場合のみ ETRN フォールバックを実行
  const duckQueryEmpty = curWeatherOut === null ? null : (curWeatherOut.records ?? []).length === 0
  useWeatherFallback({
    duckQueryEmpty,
    storeId: weatherStoreId,
    location,
    dateRange: currentDateRange,
    dateFrom: weatherKeys.dateFrom,
    dateTo: weatherKeys.dateTo,
    persist: weatherPersist,
    onRetry: () => setWeatherRetry((v) => v + 1),
  })

  // 前年天気の ETRN フォールバック
  const prevDuckQueryEmpty =
    prevWeatherOut === null ? null : (prevWeatherOut.records ?? []).length === 0
  const prevWeatherKeys = useMemo(
    () => (prevDateRange ? toKeys(prevDateRange) : null),
    [prevDateRange],
  )
  useWeatherFallback({
    duckQueryEmpty: prevDuckQueryEmpty,
    storeId: weatherStoreId,
    location,
    dateRange: prevDateRange ?? currentDateRange,
    dateFrom: prevWeatherKeys?.dateFrom ?? '',
    dateTo: prevWeatherKeys?.dateTo ?? '',
    persist: weatherPersist,
    onRetry: () => setPrevWeatherRetry((v) => v + 1),
  })
  // ── Unwrap query results ──

  const currentHourly = curHourlyOut?.records ?? null
  const compHourly = compHourlyOut?.records ?? null
  const currentDayCount = curDayCountOut?.count ?? null
  const compDayCount = compDayCountOut?.count ?? null
  const categoryHourlyData = catHourlyOut?.records ?? null
  const prevCategoryHourlyData = prevCatHourlyOut?.records ?? null
  const curWeatherAvg = curWeatherOut?.records ?? null
  const prevWeatherAvg = prevWeatherOut?.records ?? null

  // ── Hierarchy Options (sub-hook: 3 useMemo) ──
  const { deptOptions, lineOptions, klassOptions } = useHierarchyOptions(
    deptOut?.records,
    lineOut?.records,
    klassOut?.records,
  )

  const hasPrev = (compHourly?.length ?? 0) > 0
  const compLabel = compMode === 'wow' ? '前週' : '前年'
  const curLabel = compMode === 'wow' ? '当週' : '当年'

  // ── Computed values ──

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
    prevCategoryHourlyData,
    curWeatherAvg,
    prevWeatherAvg,
  }
}

/**
 * @deprecated バレル互換。新規コードは useTimeSlotData を直接使用すること。
 */
// 旧エイリアス useDuckDBTimeSlotData は削除済み — useTimeSlotData を直接使用
