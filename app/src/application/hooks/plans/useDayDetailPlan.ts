/**
 * useDayDetailPlan — 日別詳細の Screen Query Plan
 *
 * 14 本のクエリ（CTS 7系統 + Summary 3系統 + Weather 2系統）を一括管理し、
 * isPrevYear fallback を plan 内に閉じる。
 *
 * dayDetailDataLogic.ts の純粋関数（入力構築・fallback 選択・集約）を使用し、
 * plan 本体はクエリ発行と結果の組み立てのみを担当する。
 *
 * @guard H1 Screen Plan 経由のみ
 * @guard H2 比較は pair/bundle 契約
 */
import { useMemo } from 'react'
import type { PlanComparisonProvenance } from '@/domain/models/ComparisonWindow'
import { yoyWindow } from '@/domain/models/ComparisonWindow'
import { categoryTimeRecordsHandler } from '@/application/queries/cts/CategoryTimeRecordsHandler'
import { storeDaySummaryHandler } from '@/application/queries/summary/StoreDaySummaryHandler'
import { weatherHourlyHandler } from '@/application/queries/weather/WeatherHourlyHandler'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import {
  resolveDayDetailRanges,
  buildCtsInput,
  buildSummaryInput,
  buildWeatherInput,
  selectCtsWithFallback,
  aggregateSummary,
  EMPTY_RECORDS,
  ZERO_SUMMARY,
} from '../duckdb/dayDetailDataLogic'
import type { DaySummary } from '../duckdb/dayDetailDataLogic'
import type { CategoryTimeSalesRecord, HourlyWeatherRecord } from '@/domain/models/record'

/** resolveDayDetailRanges の戻り値型 */
type DayDetailRanges = ReturnType<typeof resolveDayDetailRanges>

export interface DayDetailPlanResult {
  readonly daySummary: DaySummary
  readonly prevDaySummary: DaySummary
  readonly dayRecords: readonly CategoryTimeSalesRecord[]
  readonly prevDayRecords: readonly CategoryTimeSalesRecord[]
  readonly wowPrevDayRecords: readonly CategoryTimeSalesRecord[]
  readonly cumRecords: readonly CategoryTimeSalesRecord[]
  readonly cumPrevRecords: readonly CategoryTimeSalesRecord[]
  readonly weatherHourly: readonly HourlyWeatherRecord[] | undefined
  readonly prevWeatherHourly: readonly HourlyWeatherRecord[] | undefined
  readonly comparisonProvenance: PlanComparisonProvenance
}

export function useDayDetailPlan(
  queryExecutor: QueryExecutor | null,
  ranges: DayDetailRanges,
  selectedStoreIds: ReadonlySet<string>,
  weatherStoreId: string | undefined,
): DayDetailPlanResult {
  // ── CTS 入力（7系統を1 useMemo に集約） ──
  const cts = useMemo(
    () => ({
      day: buildCtsInput(ranges.singleDayRange, selectedStoreIds),
      prevDay: buildCtsInput(ranges.prevDayRange, selectedStoreIds, true),
      prevDayFallback: buildCtsInput(ranges.prevDayRange, selectedStoreIds),
      wow: buildCtsInput(ranges.wowRange, selectedStoreIds),
      cum: buildCtsInput(ranges.cumRange, selectedStoreIds),
      cumPrev: buildCtsInput(ranges.cumPrevRange, selectedStoreIds, true),
      cumPrevFallback: buildCtsInput(ranges.cumPrevRange, selectedStoreIds),
    }),
    [ranges, selectedStoreIds],
  )

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

  // ── CTS クエリ実行 ──
  const dayResult = useQueryWithHandler(queryExecutor, categoryTimeRecordsHandler, cts.day)
  const prevDayResult = useQueryWithHandler(queryExecutor, categoryTimeRecordsHandler, cts.prevDay)
  const prevDayFallback = useQueryWithHandler(
    queryExecutor,
    categoryTimeRecordsHandler,
    cts.prevDayFallback,
  )
  const wowResult = useQueryWithHandler(queryExecutor, categoryTimeRecordsHandler, cts.wow)
  const cumResult = useQueryWithHandler(queryExecutor, categoryTimeRecordsHandler, cts.cum)
  const cumPrevResult = useQueryWithHandler(queryExecutor, categoryTimeRecordsHandler, cts.cumPrev)
  const cumPrevFallback = useQueryWithHandler(
    queryExecutor,
    categoryTimeRecordsHandler,
    cts.cumPrevFallback,
  )

  const prevDayRecords = selectCtsWithFallback(prevDayResult, prevDayFallback)
  const cumPrevRecords = selectCtsWithFallback(cumPrevResult, cumPrevFallback)

  // ── Summary クエリ実行 ──
  const curSummaryResult = useQueryWithHandler(queryExecutor, storeDaySummaryHandler, summary.cur)
  const prevSummaryResult = useQueryWithHandler(queryExecutor, storeDaySummaryHandler, summary.prev)
  const prevSummaryFallback = useQueryWithHandler(
    queryExecutor,
    storeDaySummaryHandler,
    summary.prevFallback,
  )
  const daySummary = aggregateSummary(curSummaryResult.data?.records) ?? ZERO_SUMMARY
  const prevDaySummary =
    aggregateSummary(prevSummaryResult.data?.records) ??
    aggregateSummary(prevSummaryFallback.data?.records) ??
    ZERO_SUMMARY

  // ── Weather クエリ実行 ──
  const weatherResult = useQueryWithHandler(queryExecutor, weatherHourlyHandler, weather.cur)
  const prevWeatherResult = useQueryWithHandler(queryExecutor, weatherHourlyHandler, weather.prev)

  const comparisonProvenance = useMemo<PlanComparisonProvenance>(
    () => ({
      window: yoyWindow(ranges.prevDayRange),
      comparisonAvailable: prevDayResult.data != null || prevDayFallback.data != null,
    }),
    [ranges.prevDayRange, prevDayResult.data, prevDayFallback.data],
  )

  return {
    daySummary,
    prevDaySummary,
    dayRecords: dayResult.data?.records ?? EMPTY_RECORDS,
    prevDayRecords,
    wowPrevDayRecords: wowResult.data?.records ?? EMPTY_RECORDS,
    cumRecords: cumResult.data?.records ?? EMPTY_RECORDS,
    cumPrevRecords,
    weatherHourly: weatherResult.data?.records ?? undefined,
    prevWeatherHourly: prevWeatherResult.data?.records ?? undefined,
    comparisonProvenance,
  }
}
