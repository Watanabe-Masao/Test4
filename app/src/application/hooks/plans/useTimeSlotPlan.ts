/**
 * useTimeSlotPlan — TimeSlotChart の Screen Query Plan
 *
 * 10 本の useQueryWithHandler + weather ETRN fallback + WoW/YoY comparison routing を
 * 単一の plan hook に集約する。UI state・derivation は useTimeSlotData に残す。
 *
 * @guard H1 Screen Plan 経由のみ
 * @guard H4 component に acquisition logic 禁止
 */
import { useState, useMemo } from 'react'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import { dateRangeToKeys } from '@/domain/models/CalendarDate'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import {
  hourlyAggregationHandler,
  type HourlyAggregationInput,
  type HourlyAggregationRow,
} from '@/application/queries/cts/HourlyAggregationHandler'
import {
  distinctDayCountHandler,
  type DistinctDayCountInput,
} from '@/application/queries/cts/DistinctDayCountHandler'
import {
  levelAggregationHandler,
  type LevelAggregationInput,
  type LevelAggregationRow,
} from '@/application/queries/cts/LevelAggregationHandler'
import { categoryHourlyPairHandler } from '@/application/queries/cts/CategoryHourlyPairHandler'
import type { CategoryHourlyInput } from '@/application/queries/cts/CategoryHourlyHandler'
import type { CategoryHourlyRow } from '@/application/queries/cts/CategoryHourlyHandler'
import type { PairedInput } from '@/application/queries/createPairedHandler'
import {
  weatherHourlyAvgHandler,
  type WeatherHourlyAvgInput,
  type WeatherPersister,
} from '@/application/queries/weather'
import type { HourlyWeatherAvgRow } from '@/application/queries/weather/WeatherHourlyHandler'
import type { Store } from '@/domain/models/Store'
import type { StoreLocation } from '@/domain/models/record'
import { useWeatherFallback } from '@/application/hooks/useWeatherFallback'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { useDataStore } from '@/application/stores/dataStore'
import { buildWowRange } from '@/application/usecases/timeSlotDataLogic'

// ── Types ──

export type CompMode = 'yoy' | 'wow'

export interface TimeSlotPlanParams {
  readonly queryExecutor: QueryExecutor | null
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  readonly prevYearScope?: PrevYearScope
  readonly weatherPersist?: WeatherPersister | null
  /** comparison mode — plan が WoW/YoY routing を制御する */
  readonly compMode: CompMode
  /** hierarchy filter（dept/line/klass） */
  readonly hierarchy: {
    readonly deptCode?: string
    readonly lineCode?: string
    readonly klassCode?: string
  }
}

export interface TimeSlotPlanResult {
  // ── Hourly Aggregation ──
  readonly currentHourly: readonly HourlyAggregationRow[] | null
  readonly compHourly: readonly HourlyAggregationRow[] | null
  readonly currentDayCount: number | null
  readonly compDayCount: number | null
  // ── Hierarchy (dept/line/klass records) ──
  readonly deptRecords: readonly LevelAggregationRow[] | undefined
  readonly lineRecords: readonly LevelAggregationRow[] | undefined
  readonly klassRecords: readonly LevelAggregationRow[] | undefined
  // ── Category Hourly (pair) ──
  readonly categoryHourlyData: readonly CategoryHourlyRow[] | null
  readonly prevCategoryHourlyData: readonly CategoryHourlyRow[] | null
  // ── Weather ──
  readonly curWeatherAvg: readonly HourlyWeatherAvgRow[] | null
  readonly prevWeatherAvg: readonly HourlyWeatherAvgRow[] | null
  // ── Status ──
  readonly isLoading: boolean
  readonly error: Error | null
}

const EMPTY_STORES: ReadonlyMap<string, Store> = new Map()

// ── Helpers ──

function toKeys(range: DateRange): { dateFrom: string; dateTo: string } {
  const { fromKey, toKey } = dateRangeToKeys(range)
  return { dateFrom: fromKey, dateTo: toKey }
}

function storeIdsArray(ids: ReadonlySet<string>): readonly string[] | undefined {
  return ids.size > 0 ? [...ids] : undefined
}

// ── Hook ──

export function useTimeSlotPlan(params: TimeSlotPlanParams): TimeSlotPlanResult {
  const {
    queryExecutor,
    currentDateRange,
    selectedStoreIds,
    prevYearScope,
    weatherPersist,
    compMode,
    hierarchy,
  } = params

  // ── Comparison Range ──
  const wowRange = useMemo(() => buildWowRange(currentDateRange), [currentDateRange])
  const compRange = compMode === 'wow' ? wowRange : prevYearScope?.dateRange
  const compIsPrevYear = compMode === 'yoy'

  // ── Query Inputs ──
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

  const deptCode = hierarchy.deptCode
  const lineCode = hierarchy.lineCode

  const deptInput = useMemo<LevelAggregationInput>(
    () => ({
      ...toKeys(currentDateRange),
      storeIds,
      level: 'department' as const,
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
    }
  }, [currentDateRange, storeIds, deptCode, lineCode])

  const heatmapLevel = deptCode ? (lineCode ? 'klass' : 'line') : 'department'
  const pyRange = compMode === 'yoy' ? prevYearScope?.dateRange : undefined
  const categoryHourlyPairInput = useMemo<PairedInput<CategoryHourlyInput>>(() => {
    const base: PairedInput<CategoryHourlyInput> = {
      ...toKeys(currentDateRange),
      storeIds,
      level: heatmapLevel as 'department' | 'line' | 'klass',
      ...hierarchy,
    }
    if (pyRange) {
      const prev = toKeys(pyRange)
      return { ...base, comparisonDateFrom: prev.dateFrom, comparisonDateTo: prev.dateTo }
    }
    return base
  }, [currentDateRange, pyRange, storeIds, heatmapLevel, hierarchy])

  // ── Weather Inputs ──
  const storeLocations = useSettingsStore((s) => s.settings.storeLocations)
  const allStoreIds = useDataStore((s) => s.currentMonthData?.stores ?? EMPTY_STORES)
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
  const { data: catHourlyPairOut } = useQueryWithHandler(
    queryExecutor,
    categoryHourlyPairHandler,
    categoryHourlyPairInput,
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

  // ── Weather ETRN Fallback ──
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

  // ── Unwrap ──
  const catHourlyOut = catHourlyPairOut?.current ?? null
  const prevCatHourlyOut = catHourlyPairOut?.comparison ?? null

  return {
    currentHourly: curHourlyOut?.records ?? null,
    compHourly: compHourlyOut?.records ?? null,
    currentDayCount: curDayCountOut?.count ?? null,
    compDayCount: compDayCountOut?.count ?? null,
    deptRecords: deptOut?.records,
    lineRecords: lineOut?.records,
    klassRecords: klassOut?.records,
    categoryHourlyData: catHourlyOut?.records ?? null,
    prevCategoryHourlyData: prevCatHourlyOut?.records ?? null,
    curWeatherAvg: curWeatherOut?.records ?? null,
    prevWeatherAvg: prevWeatherOut?.records ?? null,
    isLoading,
    error: error ?? null,
  }
}
