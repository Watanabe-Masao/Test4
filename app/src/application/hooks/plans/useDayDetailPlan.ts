/**
 * useDayDetailPlan — 日別詳細の Screen Query Plan
 *
 * カテゴリ leaf 日次比較（当日 + 累計）+ TimeSlot 集計（時間帯）+ Summary +
 * Weather を一括管理する。比較 fallback（前年空 → 当年同日付救済）は
 * `useCategoryLeafDailyBundle` 内部で畳み込むため、plan 本体は bundle 結果を
 * そのまま返す。
 *
 * @guard H1 Screen Plan 経由のみ
 * @guard H2 比較は pair/bundle 契約
 *
 * @responsibility R:query-plan
 */
import { useMemo } from 'react'
import type { PlanComparisonProvenance } from '@/domain/models/ComparisonWindow'
import { yoyWindow } from '@/domain/models/ComparisonWindow'
import type { ComparisonScope } from '@/domain/models/ComparisonScope'
import { useTimeSlotBundle } from '@/application/hooks/timeSlot/useTimeSlotBundle'
import type {
  TimeSlotFrame,
  TimeSlotSeries,
} from '@/application/hooks/timeSlot/TimeSlotBundle.types'
import { useCategoryLeafDailyBundle } from '@/application/hooks/categoryLeafDaily/useCategoryLeafDailyBundle'
import type {
  CategoryLeafDailyFrame,
  CategoryLeafDailyEntry,
  CategoryLeafDailySeries,
} from '@/application/hooks/categoryLeafDaily/CategoryLeafDailyBundle.types'
import { toCategoryLeafDailyEntries } from '@/application/hooks/categoryLeafDaily/projectCategoryLeafDailySeries'
import { categoryTimeRecordsHandler } from '@/application/queries/cts/CategoryTimeRecordsHandler'
import { storeDaySummaryHandler } from '@/application/queries/summary/StoreDaySummaryHandler'
import { weatherHourlyHandler } from '@/application/queries/weather/WeatherHourlyHandler'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import {
  resolveDayDetailRanges,
  buildCtsInput,
  buildDayComparisonScope,
  buildSummaryInput,
  buildWeatherInput,
  aggregateSummary,
  ZERO_SUMMARY,
} from '../duckdb/dayDetailDataLogic'
import type { DaySummary } from '../duckdb/dayDetailDataLogic'
import type { HourlyWeatherRecord } from '@/domain/models/record'

const emptyEntries: readonly CategoryLeafDailyEntry[] = []
const zeroSummary = ZERO_SUMMARY

type DayDetailRanges = ReturnType<typeof resolveDayDetailRanges>

export interface DayDetailPlanResult {
  readonly daySummary: DaySummary
  readonly prevDaySummary: DaySummary
  /** 当日の leaf 群 — dayLeafBundle.currentSeries.entries と同一参照 */
  readonly dayRecords: readonly CategoryLeafDailyEntry[]
  /** 比較日の leaf 群（fallback 反映後）*/
  readonly prevDayRecords: readonly CategoryLeafDailyEntry[]
  /** 前週同曜日 leaf 群（単発取得、bundle 対象外） */
  readonly wowPrevDayRecords: readonly CategoryLeafDailyEntry[]
  /** 累計 leaf 群 */
  readonly cumRecords: readonly CategoryLeafDailyEntry[]
  readonly cumPrevRecords: readonly CategoryLeafDailyEntry[]
  /** 当日 leaf series */
  readonly dayLeafCurrentSeries: CategoryLeafDailySeries | null
  readonly dayLeafComparisonSeries: CategoryLeafDailySeries | null
  /** 累計 leaf series */
  readonly cumLeafCurrentSeries: CategoryLeafDailySeries | null
  readonly cumLeafComparisonSeries: CategoryLeafDailySeries | null
  readonly weatherHourly: readonly HourlyWeatherRecord[] | undefined
  readonly prevWeatherHourly: readonly HourlyWeatherRecord[] | undefined
  /** 時間帯集計 lane（当日）— HourlyChart の amount/quantity 源 */
  readonly timeSlotCurrentSeries: TimeSlotSeries | null
  /** 時間帯集計 lane（比較日） */
  readonly timeSlotComparisonSeries: TimeSlotSeries | null
  readonly comparisonProvenance: PlanComparisonProvenance
}

export function useDayDetailPlan(
  queryExecutor: QueryExecutor | null,
  ranges: DayDetailRanges,
  selectedStoreIds: ReadonlySet<string>,
  weatherStoreId: string | undefined,
  comparisonScope: ComparisonScope | null,
): DayDetailPlanResult {
  // ── Leaf 日次 bundle の frame（当日 / 累計）──
  // 空 Set = 全店フィルタなし (bundle が空配列 → undefined に変換する)。
  // 早期 null return 禁止 (summary/weather と同様に「全店」は有効な scope)。
  const dayLeafFrame = useMemo<CategoryLeafDailyFrame>(
    () => ({
      dateRange: ranges.singleDayRange,
      storeIds: [...selectedStoreIds],
      comparison: buildDayComparisonScope(comparisonScope, ranges),
    }),
    [ranges, selectedStoreIds, comparisonScope],
  )

  const cumLeafFrame = useMemo<CategoryLeafDailyFrame>(
    () => ({
      dateRange: ranges.cumRange,
      storeIds: [...selectedStoreIds],
      comparison: buildDayComparisonScope(comparisonScope, {
        singleDayRange: ranges.cumRange,
        prevDayRange: ranges.cumPrevRange,
      }),
    }),
    [ranges, selectedStoreIds, comparisonScope],
  )

  const dayLeafBundle = useCategoryLeafDailyBundle(queryExecutor, dayLeafFrame)
  const cumLeafBundle = useCategoryLeafDailyBundle(queryExecutor, cumLeafFrame)

  // ── wow（単発、bundle 対象外）──
  const wowInput = useMemo(
    () => buildCtsInput(ranges.wowRange, selectedStoreIds),
    [ranges.wowRange, selectedStoreIds],
  )
  const wowResult = useQueryWithHandler(queryExecutor, categoryTimeRecordsHandler, wowInput)

  // ── Summary 入力（3系統を1 useMemo に集約） ──
  const summary = useMemo(
    () => ({
      cur: buildSummaryInput(ranges.singleDayRange, selectedStoreIds),
      prev: buildSummaryInput(ranges.prevDayRange, selectedStoreIds, true),
      prevFallback: buildSummaryInput(ranges.prevDayRange, selectedStoreIds),
    }),
    [ranges, selectedStoreIds],
  )

  // ── Weather 入力（2系統を1 useMemo に集約） ──
  const weather = useMemo(
    () => ({
      cur: buildWeatherInput(weatherStoreId ?? '', ranges.dateKey),
      prev: buildWeatherInput(weatherStoreId ?? '', ranges.prevDateKey),
    }),
    [weatherStoreId, ranges],
  )

  const curSummaryResult = useQueryWithHandler(queryExecutor, storeDaySummaryHandler, summary.cur)
  const prevSummaryResult = useQueryWithHandler(queryExecutor, storeDaySummaryHandler, summary.prev)
  const prevSummaryFallback = useQueryWithHandler(
    queryExecutor,
    storeDaySummaryHandler,
    summary.prevFallback,
  )
  const daySummary = aggregateSummary(curSummaryResult.data?.records) ?? zeroSummary
  const prevDaySummary =
    aggregateSummary(prevSummaryResult.data?.records) ??
    aggregateSummary(prevSummaryFallback.data?.records) ??
    zeroSummary

  const weatherResult = useQueryWithHandler(queryExecutor, weatherHourlyHandler, weather.cur)
  const prevWeatherResult = useQueryWithHandler(queryExecutor, weatherHourlyHandler, weather.prev)

  const timeSlotFrame = useMemo<TimeSlotFrame>(() => {
    return {
      dateRange: ranges.singleDayRange,
      storeIds: [...selectedStoreIds],
      comparison: buildDayComparisonScope(comparisonScope, ranges),
    }
  }, [ranges, selectedStoreIds, comparisonScope])
  const timeSlotBundle = useTimeSlotBundle(queryExecutor, timeSlotFrame)

  const comparisonProvenance = useMemo<PlanComparisonProvenance>(
    () => ({
      window: yoyWindow(ranges.prevDayRange),
      comparisonAvailable: dayLeafBundle.comparisonSeries != null,
    }),
    [ranges.prevDayRange, dayLeafBundle.comparisonSeries],
  )

  const wowPrevDayRecords = useMemo<readonly CategoryLeafDailyEntry[]>(
    () => (wowResult.data ? toCategoryLeafDailyEntries(wowResult.data.records) : emptyEntries),
    [wowResult.data],
  )

  return {
    daySummary,
    prevDaySummary,
    dayRecords: dayLeafBundle.currentSeries?.entries ?? emptyEntries,
    prevDayRecords: dayLeafBundle.comparisonSeries?.entries ?? emptyEntries,
    wowPrevDayRecords,
    cumRecords: cumLeafBundle.currentSeries?.entries ?? emptyEntries,
    cumPrevRecords: cumLeafBundle.comparisonSeries?.entries ?? emptyEntries,
    dayLeafCurrentSeries: dayLeafBundle.currentSeries,
    dayLeafComparisonSeries: dayLeafBundle.comparisonSeries,
    cumLeafCurrentSeries: cumLeafBundle.currentSeries,
    cumLeafComparisonSeries: cumLeafBundle.comparisonSeries,
    weatherHourly: weatherResult.data?.records ?? undefined,
    prevWeatherHourly: prevWeatherResult.data?.records ?? undefined,
    timeSlotCurrentSeries: timeSlotBundle.currentSeries,
    timeSlotComparisonSeries: timeSlotBundle.comparisonSeries,
    comparisonProvenance,
  }
}
