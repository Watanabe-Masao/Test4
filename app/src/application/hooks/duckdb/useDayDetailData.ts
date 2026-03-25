/**
 * 日別詳細データ取得フック
 *
 * カレンダーモーダルが必要とするDuckDBデータ（CTS・天気）を一括取得する。
 * 前年対応日の解決、isPrevYear フォールバック —
 * すべてこのフック内に閉じる。presentation/ は結果だけを受け取る。
 *
 * ## 設計原則
 * - UIは「この日のデータをくれ」と言うだけ
 * - 比較モード（同日/同曜日）の解釈はフック内で完結
 * - DuckDB の isPrevYear フラグの存在を UI は知らない
 *
 * ## QueryHandler 移行済み
 * 全クエリを useQueryWithHandler 経由で実行。getLegacyDuckDB 不使用。
 *
 * ## R11 準拠
 * 日付範囲の計算は resolveDayDetailRanges() 純粋関数に分離（dayDetailDataLogic.ts）。
 * フック本体は入力構築 + クエリ発行 + 結果の組み立てのみ。
 */
import { useMemo } from 'react'
import { categoryTimeRecordsHandler } from '@/application/queries/cts/CategoryTimeRecordsHandler'
import { storeDaySummaryHandler } from '@/application/queries/summary/StoreDaySummaryHandler'
import { weatherHourlyHandler } from '@/application/queries/weather/WeatherHourlyHandler'
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
} from './dayDetailDataLogic'
import type { DayDetailDataParams, DayDetailData } from './dayDetailDataLogic'

// 後方互換 re-export
export { resolveDayDetailRanges } from './dayDetailDataLogic'
export type {
  DayDetailData,
  DayDetailDataParams,
  WeatherCandidate,
  DaySummary,
} from './dayDetailDataLogic'

/**
 * 日別詳細に必要な全 DuckDB データを取得する。
 *
 * - CTS: 当日・前年当日・前週・累計当年・累計前年
 * - 天気: 当日・前年
 * - 前年対応日: comparisonScope.alignmentMode に基づいて resolvePrevDate で解決
 */
export function useDayDetailData(params: DayDetailDataParams): DayDetailData {
  const { queryExecutor, year, month, day, comparisonScope, selectedStoreIds, weatherStoreId } =
    params

  // 全日付範囲を一括計算（純粋関数 — useMemo 1つに集約）
  const ranges = useMemo(
    () => resolveDayDetailRanges(year, month, day, comparisonScope),
    [year, month, day, comparisonScope],
  )

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
      cur: buildWeatherInput(weatherStoreId, ranges.dateKey),
      prev: buildWeatherInput(weatherStoreId, ranges.prevDateKey),
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

  return {
    prevDate: ranges.prevDate,
    prevDateKey: ranges.prevDateKey,
    daySummary,
    prevDaySummary,
    dayRecords: dayResult.data?.records ?? EMPTY_RECORDS,
    prevDayRecords,
    wowPrevDayRecords: wowResult.data?.records ?? EMPTY_RECORDS,
    cumRecords: cumResult.data?.records ?? EMPTY_RECORDS,
    cumPrevRecords,
    weatherHourly: weatherResult.data?.records ?? undefined,
    prevWeatherHourly: prevWeatherResult.data?.records ?? undefined,
  }
}
