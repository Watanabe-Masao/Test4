/**
 * JS統計計算フック（曜日パターン・日別特徴量）
 *
 * DuckDB から生データを取得し、JS 純粋関数で統計量を算出する。
 * useJsAggregationQueries.ts から分割。
 */
import { useMemo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models/calendar'
import {
  queryStoreDaySummary,
  type StoreDaySummaryRow,
} from '@/infrastructure/duckdb/queries/storeDaySummary'
import type { DowPatternRow, DailyFeatureRow } from '@/infrastructure/duckdb/queries/features'
import { toDateKey } from '@/domain/models/CalendarDate'
import { useAsyncQuery, toDateKeys, storeIdsToArray, type AsyncQueryResult } from './useAsyncQuery'
import { computeDowPattern, computeDailyFeatures } from './jsAggregationLogic'

// ─── 生データ取得（共通） ────────────────────────────────

/**
 * store_day_summary の生レコードを取得するフック。
 *
 * SQL は SELECT * WHERE のみ。集約は JS 側で行う。
 */
export function useRawSummaryRows(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
  isPrevYear?: boolean,
): AsyncQueryResult<readonly StoreDaySummaryRow[]> {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    const { dateFrom, dateTo } = toDateKeys(dateRange)
    return (c: AsyncDuckDBConnection) =>
      queryStoreDaySummary(c, {
        dateFrom,
        dateTo,
        storeIds: storeIdsToArray(storeIds),
        isPrevYear,
      })
  }, [dateRange, storeIds, isPrevYear])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

// ─── 曜日パターン（JS計算版） ──────────────────────────

/**
 * DuckDB 生データ → JS aggregateByDay + dowAggregate
 *
 * SQL の AVG/STDDEV_POP per dow を置き換え。
 * 返り値は DowPatternRow[] 互換（storeId は集約後 'ALL'）。
 */
export function useJsDowPattern(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
): AsyncQueryResult<readonly DowPatternRow[]> {
  const {
    data: rawRows,
    isLoading,
    error,
  } = useRawSummaryRows(conn, dataVersion, dateRange, storeIds)

  const data = useMemo(() => {
    if (!rawRows) return null
    return computeDowPattern(rawRows)
  }, [rawRows])

  return { data, isLoading, error }
}

// ─── 日別特徴量ベクトル（JS計算版） ────────────────────

/** MA-28 のために必要な先行データ日数 */
const MA_LOOKBACK_DAYS = 27

/**
 * DateRange を lookbackDays 分だけ前に拡張する。
 * 移動平均の計算で月初のデータ欠落を防ぐ。
 */
function extendRangeBack(range: DateRange, lookbackDays: number): DateRange {
  const fromDate = new Date(range.from.year, range.from.month - 1, range.from.day - lookbackDays)
  return {
    from: {
      year: fromDate.getFullYear(),
      month: fromDate.getMonth() + 1,
      day: fromDate.getDate(),
    },
    to: range.to,
  }
}

/**
 * DuckDB 生データ → JS 移動平均 + Z-score + CV + スパイク比率
 *
 * SQL のウィンドウ関数 (AVG OVER w3/w7/w28, LAG, STDDEV_POP, cumulative SUM) を置き換え。
 *
 * MA-28 のために、dateRange.from の 27日前からデータを取得し、
 * 計算後に元の dateRange に含まれる行のみを返す。
 */
export function useJsDailyFeatures(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
): AsyncQueryResult<readonly DailyFeatureRow[]> {
  // MA-28 用に取得範囲を前方に拡張
  const extendedRange = useMemo(
    () => (dateRange ? extendRangeBack(dateRange, MA_LOOKBACK_DAYS) : undefined),
    [dateRange],
  )

  const {
    data: rawRows,
    isLoading,
    error,
  } = useRawSummaryRows(conn, dataVersion, extendedRange, storeIds)

  const trimFromKey = useMemo(
    () => (dateRange ? toDateKey(dateRange.from) : undefined),
    [dateRange],
  )

  const data = useMemo(() => {
    if (!rawRows) return null
    return computeDailyFeatures(rawRows, trimFromKey)
  }, [rawRows, trimFromKey])

  return { data, isLoading, error }
}
