/**
 * useDayDetailPlan — 日別詳細の Screen Query Plan
 *
 * 10 本のクエリ（CTS 5系統 + Summary 3系統 + Weather 2系統）を一括管理し、
 * isPrevYear fallback を plan 内に閉じる。
 * CTS は pair handler（dayPair / cumPair）+ 単発（wow）+ フォールバック 2 系統。
 *
 * dayDetailDataLogic.ts の純粋関数（入力構築・fallback 選択・集約）を使用し、
 * plan 本体はクエリ発行と結果の組み立てのみを担当する。
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
import { categoryTimeRecordsHandler } from '@/application/queries/cts/CategoryTimeRecordsHandler'
import { categoryTimeRecordsPairHandler } from '@/application/queries/cts/CategoryTimeRecordsPairHandler'
import { storeDaySummaryHandler } from '@/application/queries/summary/StoreDaySummaryHandler'
import { weatherHourlyHandler } from '@/application/queries/weather/WeatherHourlyHandler'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import {
  resolveDayDetailRanges,
  buildCtsInput,
  buildCtsPairInput,
  buildDayComparisonScope,
  buildSummaryInput,
  buildWeatherInput,
  selectCtsWithFallbackFromPair,
  aggregateSummary,
  EMPTY_RECORDS,
  ZERO_SUMMARY,
} from '../duckdb/dayDetailDataLogic'
import type { DaySummary } from '../duckdb/dayDetailDataLogic'
import type { CategoryTimeSalesRecord, HourlyWeatherRecord } from '@/domain/models/record'

const emptyRecords = EMPTY_RECORDS
const zeroSummary = ZERO_SUMMARY

/** resolveDayDetailRanges の戻り値型  *
 * @responsibility R:query-plan
 */
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
  /** 時間帯集計 lane（当日）— HourlyChart の amount/quantity 源 */
  readonly timeSlotCurrentSeries: TimeSlotSeries | null
  /** 時間帯集計 lane（前年同日 — comparisonScope.alignmentMode に従う） */
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
  // ── CTS 入力（pair 化済 5 系統を1 useMemo に集約） ──
  // dayPair / cumPair は (day, prevDay) / (cum, cumPrev) を pair handler で同時取得する。
  // wow は比較相手を持たないため単発のまま。
  // prevDayFallback / cumPrevFallback は前年スコープが空のときの当年スコープ救済で、
  //   data-flow-unification 完了後も Phase B で bundle 経由化と同時に撤廃判断する。
  const cts = useMemo(
    () => ({
      dayPair: buildCtsPairInput(ranges.singleDayRange, ranges.prevDayRange, selectedStoreIds),
      prevDayFallback: buildCtsInput(ranges.prevDayRange, selectedStoreIds),
      wow: buildCtsInput(ranges.wowRange, selectedStoreIds),
      cumPair: buildCtsPairInput(ranges.cumRange, ranges.cumPrevRange, selectedStoreIds),
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
  const dayPairResult = useQueryWithHandler(
    queryExecutor,
    categoryTimeRecordsPairHandler,
    cts.dayPair,
  )
  const prevDayFallback = useQueryWithHandler(
    queryExecutor,
    categoryTimeRecordsHandler,
    cts.prevDayFallback,
  )
  const wowResult = useQueryWithHandler(queryExecutor, categoryTimeRecordsHandler, cts.wow)
  const cumPairResult = useQueryWithHandler(
    queryExecutor,
    categoryTimeRecordsPairHandler,
    cts.cumPair,
  )
  const cumPrevFallback = useQueryWithHandler(
    queryExecutor,
    categoryTimeRecordsHandler,
    cts.cumPrevFallback,
  )

  const prevDayRecords = selectCtsWithFallbackFromPair(dayPairResult, prevDayFallback)
  const cumPrevRecords = selectCtsWithFallbackFromPair(cumPairResult, cumPrevFallback)

  // ── Summary クエリ実行 ──
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

  // ── Weather クエリ実行 ──
  const weatherResult = useQueryWithHandler(queryExecutor, weatherHourlyHandler, weather.cur)
  const prevWeatherResult = useQueryWithHandler(queryExecutor, weatherHourlyHandler, weather.prev)

  // ── TimeSlot 集計 lane（当日 + 比較日）──
  // HourlyChart の amount/quantity 集計源。leaf-grain（カテゴリ詳細）用の raw CTS は
  // 別経路で dayRecords / prevDayRecords に保持する。
  const timeSlotFrame = useMemo<TimeSlotFrame | null>(() => {
    if (selectedStoreIds.size === 0) return null
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
      comparisonAvailable: dayPairResult.data?.comparison != null || prevDayFallback.data != null,
    }),
    [ranges.prevDayRange, dayPairResult.data, prevDayFallback.data],
  )

  return {
    daySummary,
    prevDaySummary,
    dayRecords: dayPairResult.data?.current?.records ?? emptyRecords,
    prevDayRecords,
    wowPrevDayRecords: wowResult.data?.records ?? emptyRecords,
    cumRecords: cumPairResult.data?.current?.records ?? emptyRecords,
    cumPrevRecords,
    weatherHourly: weatherResult.data?.records ?? undefined,
    prevWeatherHourly: prevWeatherResult.data?.records ?? undefined,
    timeSlotCurrentSeries: timeSlotBundle.currentSeries,
    timeSlotComparisonSeries: timeSlotBundle.comparisonSeries,
    comparisonProvenance,
  }
}
