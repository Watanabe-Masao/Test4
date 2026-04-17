/**
 * useTimeSlotPlan — TimeSlotChart の Screen Query Plan
 *
 * WoW/YoY comparison routing + hourly aggregation + category hourly pair を管理する。
 * 階層ドリルスルーは useTimeSlotHierarchyPlan に委譲。
 * 天気データ取得は useTimeSlotWeatherPlan に委譲。
 *
 * @guard H1 Screen Plan 経由のみ
 * @guard H4 component に acquisition logic 禁止
 */
import { useMemo } from 'react'
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
import { categoryHourlyPairHandler } from '@/application/queries/cts/CategoryHourlyPairHandler'
import type { CategoryHourlyInput } from '@/application/queries/cts/CategoryHourlyHandler'
import type { CategoryHourlyRow } from '@/application/queries/cts/CategoryHourlyHandler'
import type { PairedInput } from '@/application/queries/createPairedHandler'
import type { WeatherPersister } from '@/application/queries/weather'
import type { HourlyWeatherAvgRow } from '@/application/queries/weather/WeatherHourlyHandler'
import type { LevelAggregationRow } from '@/application/queries/cts/LevelAggregationHandler'
import { buildWowRange } from '@/application/usecases/timeSlotDataLogic'
import type { PlanComparisonProvenance } from '@/domain/models/ComparisonWindow'
import { currentOnly, yoyWindow, wowWindow } from '@/domain/models/ComparisonWindow'
import { useTimeSlotWeatherPlan } from './useTimeSlotWeatherPlan'
import { useTimeSlotHierarchyPlan } from './useTimeSlotHierarchyPlan'
import type { CompMode } from './buildTimeSlotPlanInputs'

// ── Types ──

export type { CompMode }
export {
  buildTimeSlotPlanInputs,
  type TimeSlotPlanInputsParams,
  type TimeSlotPlanInputs,
} from './buildTimeSlotPlanInputs'

export interface TimeSlotPlanParams {
  readonly queryExecutor: QueryExecutor | null
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  readonly prevYearScope?: PrevYearScope
  readonly weatherPersist?: WeatherPersister | null
  readonly compMode: CompMode
  readonly hierarchy: {
    readonly deptCode?: string
    readonly lineCode?: string
    readonly klassCode?: string
  }
}

export interface TimeSlotPlanResult {
  readonly currentHourly: readonly HourlyAggregationRow[] | null
  readonly compHourly: readonly HourlyAggregationRow[] | null
  readonly currentDayCount: number | null
  readonly compDayCount: number | null
  readonly deptRecords: readonly LevelAggregationRow[] | undefined
  readonly lineRecords: readonly LevelAggregationRow[] | undefined
  readonly klassRecords: readonly LevelAggregationRow[] | undefined
  readonly categoryHourlyData: readonly CategoryHourlyRow[] | null
  readonly prevCategoryHourlyData: readonly CategoryHourlyRow[] | null
  readonly curWeatherAvg: readonly HourlyWeatherAvgRow[] | null
  readonly prevWeatherAvg: readonly HourlyWeatherAvgRow[] | null
  readonly comparisonProvenance: PlanComparisonProvenance
  readonly isLoading: boolean
  readonly error: Error | null
}

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

  const wowRange = useMemo(() => buildWowRange(currentDateRange), [currentDateRange])
  const compRange = compMode === 'wow' ? wowRange : prevYearScope?.dateRange
  const compIsPrevYear = compMode === 'yoy'
  const prevDateRange = compMode === 'yoy' ? prevYearScope?.dateRange : undefined

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

  const heatmapLevel = hierarchy.deptCode ? (hierarchy.lineCode ? 'klass' : 'line') : 'department'
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

  // ── Query Execution ──
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
  const { data: catHourlyPairOut } = useQueryWithHandler(
    queryExecutor,
    categoryHourlyPairHandler,
    categoryHourlyPairInput,
  )

  // ── Sub-plans ──
  const { deptRecords, lineRecords, klassRecords } = useTimeSlotHierarchyPlan({
    queryExecutor,
    currentDateRange,
    selectedStoreIds,
    hierarchy,
  })

  const { curWeatherAvg, prevWeatherAvg } = useTimeSlotWeatherPlan({
    queryExecutor,
    currentDateRange,
    selectedStoreIds,
    prevDateRange,
    weatherPersist,
  })

  const comparisonProvenance = useMemo<PlanComparisonProvenance>(() => {
    if (!compRange) return { window: currentOnly(), comparisonAvailable: false }
    const win =
      compMode === 'wow' ? wowWindow(compRange) : yoyWindow(compRange, prevYearScope?.dowOffset)
    return { window: win, comparisonAvailable: compHourlyOut != null }
  }, [compMode, compRange, prevYearScope?.dowOffset, compHourlyOut])

  const catHourlyOut = catHourlyPairOut?.current ?? null
  const prevCatHourlyOut = catHourlyPairOut?.comparison ?? null

  return {
    currentHourly: curHourlyOut?.records ?? null,
    compHourly: compHourlyOut?.records ?? null,
    currentDayCount: curDayCountOut?.count ?? null,
    compDayCount: compDayCountOut?.count ?? null,
    deptRecords,
    lineRecords,
    klassRecords,
    categoryHourlyData: catHourlyOut?.records ?? null,
    prevCategoryHourlyData: prevCatHourlyOut?.records ?? null,
    curWeatherAvg,
    prevWeatherAvg,
    comparisonProvenance,
    isLoading,
    error: error ?? null,
  }
}
