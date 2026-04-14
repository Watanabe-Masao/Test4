/**
 * useTimeSlotPlan — TimeSlotChart の Screen Query Plan
 *
 * WoW/YoY comparison routing + hourly aggregation + category hourly pair を管理��る。
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
import { hourlyAggregationPairHandler } from '@/application/queries/cts/HourlyAggregationPairHandler'
import {
  distinctDayCountHandler,
  type DistinctDayCountInput,
} from '@/application/queries/cts/DistinctDayCountHandler'
import { distinctDayCountPairHandler } from '@/application/queries/cts/DistinctDayCountPairHandler'
import { categoryHourlyPairHandler } from '@/application/queries/cts/CategoryHourlyPairHandler'
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

// ── Types ──

export type CompMode = 'yoy' | 'wow'

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
  // ── Provenance ──
  readonly comparisonProvenance: PlanComparisonProvenance
  // ── Status ──
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

// ── Pure input builders（テスト可能な純粋関数） ──

export interface TimeSlotPlanInputsParams {
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  readonly prevYearScope?: PrevYearScope
  readonly compMode: CompMode
  readonly hierarchy: {
    readonly deptCode?: string
    readonly lineCode?: string
    readonly klassCode?: string
  }
}

export interface TimeSlotPlanInputs {
  readonly curHourlyInput: HourlyAggregationInput
  readonly compHourlyInput: HourlyAggregationInput | null
  readonly curDayCountInput: DistinctDayCountInput
  readonly compDayCountInput: DistinctDayCountInput | null
}

/**
 * TimeSlotChart の query 入力を純粋関数で構築する。
 *
 * 比較期間の解決:
 * - compMode='yoy' → prevYearScope.dateRange（親から渡される前年スコープ）
 * - compMode='wow' → 7日前の同範囲（buildWowRange）+ isPrevYear=false
 *
 * 責務: クエリ入力の組み立てのみ。React 非依存のため単体テスト可能。
 *
 * @responsibility R:query-plan
 */
export function buildTimeSlotPlanInputs(params: TimeSlotPlanInputsParams): TimeSlotPlanInputs {
  const { currentDateRange, selectedStoreIds, prevYearScope, compMode, hierarchy } = params

  const storeIds = storeIdsArray(selectedStoreIds)
  const wowRange = buildWowRange(currentDateRange)
  const compRange = compMode === 'wow' ? wowRange : prevYearScope?.dateRange
  const compIsPrevYear = compMode === 'yoy'

  const curHourlyInput: HourlyAggregationInput = {
    ...toKeys(currentDateRange),
    storeIds,
    ...hierarchy,
    isPrevYear: false,
  }

  const compHourlyInput: HourlyAggregationInput | null = compRange
    ? { ...toKeys(compRange), storeIds, ...hierarchy, isPrevYear: compIsPrevYear }
    : null

  const curDayCountInput: DistinctDayCountInput = {
    ...toKeys(currentDateRange),
    storeIds,
    isPrevYear: false,
  }

  const compDayCountInput: DistinctDayCountInput | null = compRange
    ? { ...toKeys(compRange), storeIds, isPrevYear: compIsPrevYear }
    : null

  return { curHourlyInput, compHourlyInput, curDayCountInput, compDayCountInput }
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

  // ── 全 query inputs を 1 つの useMemo で組み立て（query-plan tag 制約: useMemo ≤ 5） ──
  // 単発 input は wow モードの fallback と pure テスト用に保持する。
  // yoy モードでは paired input が production 経路となる:
  //   INV-RUN-02: cur と prev を 1 ハンドラで取得し、ステート同期のレースを排する。
  //   wow モードは pair handler が isPrevYear=true を強制する制約上対象外で、
  //   既存の単発 handler 経路を残している。TimeSlotChart の UI には wow トグルが
  //   無いため、現状の TimeSlot 経路は実質 yoy 専用。
  const inputs = useMemo(() => {
    const single = buildTimeSlotPlanInputs({
      currentDateRange,
      selectedStoreIds,
      prevYearScope,
      compMode,
      hierarchy,
    })
    const isYoy = compMode === 'yoy'
    const storeIds = storeIdsArray(selectedStoreIds)
    const heatmapLevel: 'department' | 'line' | 'klass' = hierarchy.deptCode
      ? hierarchy.lineCode
        ? 'klass'
        : 'line'
      : 'department'
    const pyRange = isYoy ? prevYearScope?.dateRange : undefined
    const curKeys = toKeys(currentDateRange)
    const prevKeys = pyRange ? toKeys(pyRange) : null

    const buildPair = <T extends object>(extra: T) => {
      const base = { ...curKeys, storeIds, ...extra } as PairedInput<T & typeof curKeys>
      return prevKeys
        ? { ...base, comparisonDateFrom: prevKeys.dateFrom, comparisonDateTo: prevKeys.dateTo }
        : base
    }

    return {
      isYoy,
      storeIds,
      heatmapLevel,
      compRange: isYoy ? prevYearScope?.dateRange : buildWowRange(currentDateRange),
      prevDateRange: pyRange,
      ...single,
      hourlyPairInput: isYoy ? buildPair({ ...hierarchy }) : null,
      dayCountPairInput: isYoy ? buildPair({}) : null,
      categoryHourlyPairInput: buildPair({ level: heatmapLevel, ...hierarchy }),
    }
  }, [currentDateRange, selectedStoreIds, prevYearScope, compMode, hierarchy])

  const {
    isYoy,
    compRange,
    prevDateRange,
    curHourlyInput,
    compHourlyInput,
    curDayCountInput,
    compDayCountInput,
    hourlyPairInput,
    dayCountPairInput,
    categoryHourlyPairInput,
  } = inputs

  // ── Query Execution ──
  // yoy: pair handler 1 本で cur + comparison を atomic 取得（INV-RUN-02）
  // wow: 既存の単発 handler 2 本で fallback（pair handler は wow 非対応）
  const {
    data: hourlyPairOut,
    isLoading: hourlyPairLoading,
    error: hourlyPairError,
  } = useQueryWithHandler(queryExecutor, hourlyAggregationPairHandler, hourlyPairInput)
  const {
    data: curHourlySingleOut,
    isLoading: curHourlySingleLoading,
    error: curHourlySingleError,
  } = useQueryWithHandler(queryExecutor, hourlyAggregationHandler, isYoy ? null : curHourlyInput)
  const { data: compHourlySingleOut } = useQueryWithHandler(
    queryExecutor,
    hourlyAggregationHandler,
    isYoy ? null : compHourlyInput,
  )

  const { data: dayCountPairOut } = useQueryWithHandler(
    queryExecutor,
    distinctDayCountPairHandler,
    dayCountPairInput,
  )
  const { data: curDayCountSingleOut } = useQueryWithHandler(
    queryExecutor,
    distinctDayCountHandler,
    isYoy ? null : curDayCountInput,
  )
  const { data: compDayCountSingleOut } = useQueryWithHandler(
    queryExecutor,
    distinctDayCountHandler,
    isYoy ? null : compDayCountInput,
  )

  // yoy/wow 経路の出力を統合する
  const curHourlyOut = isYoy ? hourlyPairOut?.current : curHourlySingleOut
  const compHourlyOut = isYoy ? hourlyPairOut?.comparison : compHourlySingleOut
  const curDayCountOut = isYoy ? dayCountPairOut?.current : curDayCountSingleOut
  const compDayCountOut = isYoy ? dayCountPairOut?.comparison : compDayCountSingleOut
  const isLoading = isYoy ? hourlyPairLoading : curHourlySingleLoading
  const error = isYoy ? hourlyPairError : curHourlySingleError

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

  // ── Comparison Provenance ──
  const comparisonProvenance = useMemo<PlanComparisonProvenance>(() => {
    if (!compRange) return { window: currentOnly(), comparisonAvailable: false }
    const win =
      compMode === 'wow' ? wowWindow(compRange) : yoyWindow(compRange, prevYearScope?.dowOffset)
    return { window: win, comparisonAvailable: compHourlyOut != null }
  }, [compMode, compRange, prevYearScope?.dowOffset, compHourlyOut])

  // ── Unwrap ──
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
