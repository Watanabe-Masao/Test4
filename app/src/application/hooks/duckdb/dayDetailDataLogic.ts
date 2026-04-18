/**
 * 日別詳細データの純粋ロジック
 *
 * useDayDetailData から分離した型定義・日付範囲計算・入力構築・集約関数。
 * React 依存なし — テスト可能な純粋関数のみ。
 *
 * @guard G5 hook ≤300行 — 純粋関数を分離
 *
 * @responsibility R:calculation
 */
import type { CalendarDate, DateRange } from '@/domain/models/CalendarDate'
import { toDateKey, dateRangeToKeys } from '@/domain/models/CalendarDate'
import type { ComparisonScope } from '@/domain/models/ComparisonScope'
import { resolvePrevDate } from '@/domain/models/ComparisonScope'
import type { CategoryTimeSalesRecord, HourlyWeatherRecord } from '@/domain/models/record'
import type {
  CategoryTimeRecordsInput,
  CategoryTimeRecordsOutput,
} from '@/application/queries/cts/CategoryTimeRecordsHandler'
import type { PairedInput } from '@/application/queries/createPairedHandler'
import type { PairedQueryOutput } from '@/application/queries/PairedQueryContract'
import type { TimeSlotSeries } from '@/application/hooks/timeSlot/TimeSlotBundle.types'
import type { StoreDaySummaryInput } from '@/application/queries/summary/StoreDaySummaryHandler'
import type { StoreDaySummaryRow } from '@/application/queries/summary/StoreDaySummaryHandler'
import type { WeatherHourlyInput } from '@/application/queries/weather/WeatherHourlyHandler'
import type { AsyncQueryResult } from '@/application/queries/QueryContract'

// ── 型定義 ──

/** 天気候補店舗  *
 * @responsibility R:calculation
 */
export interface WeatherCandidate {
  readonly id: string
  readonly name: string
}

/** 日別集約サマリー（DuckDB store_day_summary 由来）  *
 * @responsibility R:calculation
 */
export interface DaySummary {
  readonly sales: number
  readonly customers: number
}

/** useDayDetailData の戻り値  *
 * @responsibility R:calculation
 */
export interface DayDetailData {
  /** 前年対応日（UI のラベル表示用）  *
   * @responsibility R:calculation
   */
  readonly prevDate: CalendarDate
  readonly prevDateKey: string

  // ── 日別サマリー（DuckDB store_day_summary 由来 — 客数を含む） ──
  readonly daySummary: DaySummary
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

  // ── TimeSlot 集計 lane（HourlyChart 用、leaf-grain は dayRecords 等で別途配布） ──
  readonly timeSlotCurrentSeries: TimeSlotSeries | null
  readonly timeSlotComparisonSeries: TimeSlotSeries | null
}

/** useDayDetailData のパラメータ  *
 * @responsibility R:calculation
 */
export interface DayDetailDataParams {
  readonly queryExecutor: import('@/application/queries/QueryPort').QueryExecutor | null
  readonly dataVersion: number
  readonly year: number
  readonly month: number
  readonly day: number
  readonly comparisonScope: ComparisonScope | null
  readonly selectedStoreIds: ReadonlySet<string>
  readonly weatherStoreId: string
}

export const EMPTY_RECORDS: readonly CategoryTimeSalesRecord[] = []
export const ZERO_SUMMARY: DaySummary = { sales: 0, customers: 0 }

// ── 純粋関数: 日付範囲の計算 ──

/** 日別詳細に必要な全日付範囲を一括計算する  *
 * @responsibility R:calculation
 */
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
  const cumDays = day - 1
  const prevFrom = new Date(prevDate.year, prevDate.month - 1, prevDate.day - cumDays)
  const cumPrevRange: DateRange = {
    from: {
      year: prevFrom.getFullYear(),
      month: prevFrom.getMonth() + 1,
      day: prevFrom.getDate(),
    },
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

// ── 入力構築ヘルパー ──

export function buildCtsInput(
  range: DateRange | undefined,
  storeIds: ReadonlySet<string>,
  isPrevYear?: boolean,
): CategoryTimeRecordsInput | null {
  if (!range) return null
  const { fromKey, toKey } = dateRangeToKeys(range)
  return {
    dateFrom: fromKey,
    dateTo: toKey,
    storeIds: storeIds.size > 0 ? [...storeIds] : undefined,
    isPrevYear,
  }
}

/** useTimeSlotBundle 用に単日 scope 向けの ComparisonScope を合成する。
 * useTimeSlotBundle は effectivePeriod2 / alignmentMode のみ参照するため、外側の
 * scope から alignment メタを引き継いで period1/2 / effectivePeriod1/2 を単日に pin する。
 * @responsibility R:calculation
 */
export function buildDayComparisonScope(
  outer: ComparisonScope | null,
  ranges: Pick<ReturnType<typeof resolveDayDetailRanges>, 'singleDayRange' | 'prevDayRange'>,
): ComparisonScope | null {
  if (!outer) return null
  return {
    ...outer,
    period1: ranges.singleDayRange,
    period2: ranges.prevDayRange,
    effectivePeriod1: ranges.singleDayRange,
    effectivePeriod2: ranges.prevDayRange,
  }
}

/** current/comparison を 1 入力にまとめた pair handler 用入力を構築する  *
 * @responsibility R:calculation
 */
export function buildCtsPairInput(
  currentRange: DateRange | undefined,
  comparisonRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
): PairedInput<CategoryTimeRecordsInput> | null {
  if (!currentRange) return null
  const { fromKey, toKey } = dateRangeToKeys(currentRange)
  const storeIdsArr = storeIds.size > 0 ? [...storeIds] : undefined
  if (!comparisonRange) {
    return { dateFrom: fromKey, dateTo: toKey, storeIds: storeIdsArr }
  }
  const { fromKey: cFromKey, toKey: cToKey } = dateRangeToKeys(comparisonRange)
  return {
    dateFrom: fromKey,
    dateTo: toKey,
    storeIds: storeIdsArr,
    comparisonDateFrom: cFromKey,
    comparisonDateTo: cToKey,
  }
}

export function buildSummaryInput(
  range: DateRange | undefined,
  storeIds: ReadonlySet<string>,
  isPrevYear?: boolean,
): StoreDaySummaryInput | null {
  if (!range) return null
  const { fromKey, toKey } = dateRangeToKeys(range)
  return {
    dateFrom: fromKey,
    dateTo: toKey,
    storeIds: storeIds.size > 0 ? [...storeIds] : undefined,
    isPrevYear,
  }
}

export function buildWeatherInput(
  storeId: string,
  dateKey: string | null,
): WeatherHourlyInput | null {
  if (!storeId || !dateKey) return null
  return { storeId, dateFrom: dateKey, dateTo: dateKey }
}

// ── 集約ヘルパー ──

/** isPrevYear=true の結果が空なら isPrevYear=false のフォールバックを使う  *
 * @responsibility R:calculation
 */
export function selectCtsWithFallback(
  primary: AsyncQueryResult<{ readonly records: readonly CategoryTimeSalesRecord[] }>,
  fallback: AsyncQueryResult<{ readonly records: readonly CategoryTimeSalesRecord[] }>,
): readonly CategoryTimeSalesRecord[] {
  const primaryData = primary.data?.records ?? EMPTY_RECORDS
  return primaryData.length > 0 ? primaryData : (fallback.data?.records ?? EMPTY_RECORDS)
}

/** pair 結果の comparison 側を primary、別 query を fallback として {@link selectCtsWithFallback} と
 * 同じ意味論で解決する  *
 * @responsibility R:calculation
 */
export function selectCtsWithFallbackFromPair(
  pair: AsyncQueryResult<PairedQueryOutput<CategoryTimeRecordsOutput>>,
  fallback: AsyncQueryResult<{ readonly records: readonly CategoryTimeSalesRecord[] }>,
): readonly CategoryTimeSalesRecord[] {
  const primaryData = pair.data?.comparison?.records ?? EMPTY_RECORDS
  return primaryData.length > 0 ? primaryData : (fallback.data?.records ?? EMPTY_RECORDS)
}

/** StoreDaySummaryRow[] を店舗横断で集約して DaySummary に変換する  *
 * @responsibility R:calculation
 */
export function aggregateSummary(
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
