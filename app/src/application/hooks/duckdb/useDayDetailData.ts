/**
 * 日別詳細データ取得フック
 *
 * カレンダーモーダルが必要とするDuckDBデータ（CTS・天気）を一括取得する。
 * 前年対応日の解決、isPrevYear フォールバック、天気の ETRN フォールバック —
 * すべてこのフック内に閉じる。presentation/ は結果だけを受け取る。
 *
 * ## 設計原則
 * - UIは「この日のデータをくれ」と言うだけ
 * - 比較モード（同日/同曜日）の解釈はフック内で完結
 * - DuckDB の isPrevYear フラグの存在を UI は知らない
 *
 * ## R11 準拠
 * 日付範囲の計算は resolveDayDetailRanges() 純粋関数に分離。
 * フック本体は DuckDB クエリ発行 + 結果の組み立てのみ。
 */
import { useMemo } from 'react'
import type { CalendarDate, DateRange } from '@/domain/models/CalendarDate'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { getLegacyDuckDB } from '@/application/queries/QueryPort'
import { toDateKey } from '@/domain/models/CalendarDate'
import type { ComparisonScope } from '@/domain/models/ComparisonScope'
import { resolvePrevDate } from '@/domain/models/ComparisonScope'
import type { CategoryTimeSalesRecord, HourlyWeatherRecord } from '@/domain/models/record'
import { useDuckDBCategoryTimeRecords } from './useCtsHierarchyQueries'
import { useDuckDBStoreDaySummary } from './useSummaryQueries'
import type { StoreDaySummaryRow } from './useSummaryQueries'
import { useDuckDBWeatherHourly } from './useWeatherHourlyQuery'
import type { AsyncQueryResult } from './useAsyncQuery'

// ── 型定義 ──

/** 天気候補店舗 */
export interface WeatherCandidate {
  readonly id: string
  readonly name: string
}

/** 日別集約サマリー（DuckDB store_day_summary 由来） */
export interface DaySummary {
  readonly sales: number
  readonly customers: number
}

/** useDayDetailData の戻り値 */
export interface DayDetailData {
  /** 前年対応日（UI のラベル表示用） */
  readonly prevDate: CalendarDate
  readonly prevDateKey: string

  // ── 日別サマリー（DuckDB store_day_summary 由来 — 客数を含む） ──
  /** 当日の売上・客数（DuckDB） */
  readonly daySummary: DaySummary
  /** 前年対応日の売上・客数（DuckDB） */
  readonly prevDaySummary: DaySummary

  // ── CTS ──
  readonly dayRecords: readonly CategoryTimeSalesRecord[]
  readonly prevDayRecords: readonly CategoryTimeSalesRecord[]
  readonly wowPrevDayRecords: readonly CategoryTimeSalesRecord[]
  readonly cumRecords: readonly CategoryTimeSalesRecord[]
  readonly cumPrevRecords: readonly CategoryTimeSalesRecord[]

  // ── 天気 ──
  readonly weatherHourly: readonly HourlyWeatherRecord[] | undefined
  readonly prevWeatherHourly: readonly HourlyWeatherRecord[] | undefined
}

/** useDayDetailData のパラメータ */
export interface DayDetailDataParams {
  readonly queryExecutor: QueryExecutor | null
  /** DuckDB データバージョン（useMemo 依存配列用、0 = 未ロード） */
  readonly dataVersion: number
  readonly year: number
  readonly month: number
  readonly day: number
  readonly comparisonScope: ComparisonScope | null
  readonly selectedStoreIds: ReadonlySet<string>
  /** 天気データ取得対象の店舗ID */
  readonly weatherStoreId: string
}

const EMPTY_RECORDS: readonly CategoryTimeSalesRecord[] = []

// ── 純粋関数: 日付範囲の計算 ──

/** 日別詳細に必要な全日付範囲を一括計算する（純粋関数） */
export function resolveDayDetailRanges(
  year: number,
  month: number,
  day: number,
  comparisonScope: ComparisonScope | null,
) {
  const currentDate: CalendarDate = { year, month, day }
  const prevDate = resolvePrevDate(comparisonScope?.alignmentMode ?? 'sameDate', currentDate)
  const prevDateKey = toDateKey(prevDate)
  const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  const singleDayRange: DateRange = { from: currentDate, to: currentDate }
  const prevDayRange: DateRange = { from: prevDate, to: prevDate }

  const wowPrevDay = day - 7
  const canWoW = wowPrevDay >= 1
  const wowRange: DateRange | undefined = canWoW
    ? { from: { year, month, day: wowPrevDay }, to: { year, month, day: wowPrevDay } }
    : undefined

  const cumRange: DateRange = { from: { year, month, day: 1 }, to: { year, month, day } }
  // 前年累計は当年と同じ日数分だけ遡る（同曜日比較で日がずれても正しい日数になる）
  const cumDays = day - 1 // 当年の累計日数 - 1（prevDate からの遡り日数）
  const prevFrom = new Date(prevDate.year, prevDate.month - 1, prevDate.day - cumDays)
  const cumPrevRange: DateRange = {
    from: { year: prevFrom.getFullYear(), month: prevFrom.getMonth() + 1, day: prevFrom.getDate() },
    to: prevDate,
  }

  return {
    currentDate,
    prevDate,
    prevDateKey,
    dateKey,
    singleDayRange,
    prevDayRange,
    wowRange,
    cumRange,
    cumPrevRange,
  }
}

/**
 * 日別詳細に必要な全 DuckDB データを取得する。
 *
 * - CTS: 当日・前年当日・前週・累計当年・累計前年
 * - 天気: 当日・前年
 * - 前年対応日: comparisonScope.alignmentMode に基づいて resolvePrevDate で解決
 */
export function useDayDetailData(params: DayDetailDataParams): DayDetailData {
  const {
    queryExecutor,
    dataVersion,
    year,
    month,
    day,
    comparisonScope,
    selectedStoreIds,
    weatherStoreId,
  } = params

  // Legacy escape hatch — QueryHandler 未移行の旧フック用（getLegacyDuckDB は移行完了後に削除）
  const { conn, db } = getLegacyDuckDB(queryExecutor)

  // 全日付範囲を一括計算（純粋関数 — useMemo 1つに集約）
  const ranges = useMemo(
    () => resolveDayDetailRanges(year, month, day, comparisonScope),
    [year, month, day, comparisonScope],
  )

  // ── CTS: 当日 ──
  const dayResult = useDuckDBCategoryTimeRecords(
    conn,
    dataVersion,
    ranges.singleDayRange,
    selectedStoreIds,
  )

  // ── CTS: 前年当日（isPrevYear=true + フォールバック） ──
  const prevDayResult = useDuckDBCategoryTimeRecords(
    conn,
    dataVersion,
    ranges.prevDayRange,
    selectedStoreIds,
    true,
  )
  const prevDayFallback = useDuckDBCategoryTimeRecords(
    conn,
    dataVersion,
    ranges.prevDayRange,
    selectedStoreIds,
  )
  const prevDayRecords = selectWithFallback(prevDayResult, prevDayFallback)

  // ── CTS: 前週（WoW） ──
  const wowResult = useDuckDBCategoryTimeRecords(
    conn,
    dataVersion,
    ranges.wowRange,
    selectedStoreIds,
  )

  // ── CTS: 累計当年 ──
  const cumResult = useDuckDBCategoryTimeRecords(
    conn,
    dataVersion,
    ranges.cumRange,
    selectedStoreIds,
  )

  // ── CTS: 累計前年 ──
  const cumPrevResult = useDuckDBCategoryTimeRecords(
    conn,
    dataVersion,
    ranges.cumPrevRange,
    selectedStoreIds,
    true,
  )
  const cumPrevFallback = useDuckDBCategoryTimeRecords(
    conn,
    dataVersion,
    ranges.cumPrevRange,
    selectedStoreIds,
  )
  const cumPrevRecords = selectWithFallback(cumPrevResult, cumPrevFallback)

  // ── 日別サマリー: 当日・前年の売上+客数（store_day_summary） ──
  const curSummaryResult = useDuckDBStoreDaySummary(
    conn,
    dataVersion,
    ranges.singleDayRange,
    selectedStoreIds,
  )
  const prevSummaryResult = useDuckDBStoreDaySummary(
    conn,
    dataVersion,
    ranges.prevDayRange,
    selectedStoreIds,
    true,
  )
  const prevSummaryFallback = useDuckDBStoreDaySummary(
    conn,
    dataVersion,
    ranges.prevDayRange,
    selectedStoreIds,
  )
  const daySummary = aggregateSummary(curSummaryResult.data)
  const prevDaySummary =
    aggregateSummary(prevSummaryResult.data) ??
    aggregateSummary(prevSummaryFallback.data) ??
    ZERO_SUMMARY

  // ── 天気: 当日 + 前年 ──
  const weatherResult = useDuckDBWeatherHourly(
    conn,
    dataVersion,
    weatherStoreId,
    ranges.dateKey,
    db,
  )
  const prevWeatherResult = useDuckDBWeatherHourly(
    conn,
    dataVersion,
    weatherStoreId,
    ranges.prevDateKey,
    db,
  )

  return {
    prevDate: ranges.prevDate,
    prevDateKey: ranges.prevDateKey,
    daySummary: daySummary ?? ZERO_SUMMARY,
    prevDaySummary,
    dayRecords: dayResult.data ?? EMPTY_RECORDS,
    prevDayRecords,
    wowPrevDayRecords: wowResult.data ?? EMPTY_RECORDS,
    cumRecords: cumResult.data ?? EMPTY_RECORDS,
    cumPrevRecords,
    weatherHourly: weatherResult.data ?? undefined,
    prevWeatherHourly: prevWeatherResult.data ?? undefined,
  }
}

/** isPrevYear=true の結果が空なら isPrevYear=false のフォールバックを使う */
function selectWithFallback(
  primary: AsyncQueryResult<readonly CategoryTimeSalesRecord[]>,
  fallback: AsyncQueryResult<readonly CategoryTimeSalesRecord[]>,
): readonly CategoryTimeSalesRecord[] {
  const primaryData = primary.data ?? EMPTY_RECORDS
  return primaryData.length > 0 ? primaryData : (fallback.data ?? EMPTY_RECORDS)
}

const ZERO_SUMMARY: DaySummary = { sales: 0, customers: 0 }

/** StoreDaySummaryRow[] を店舗横断で集約して DaySummary に変換する */
function aggregateSummary(
  rows: readonly StoreDaySummaryRow[] | null | undefined,
): DaySummary | null {
  if (!rows || rows.length === 0) return null
  let sales = 0
  let customers = 0
  for (const r of rows) {
    sales += r.sales
    customers += r.customers
  }
  return { sales, customers }
}
