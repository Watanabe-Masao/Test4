/**
 * JS 計算ベースクエリフック群
 *
 * DuckDB から生データ（store_day_summary SELECT *）を取得し、
 * rawAggregation.ts の純粋関数で集約・統計計算を行うフック群。
 *
 * DuckDB SQL 内の集約ロジック（GROUP BY, OVER, STDDEV_POP 等）を
 * JS 側に移行する Phase 3 の中核。
 *
 * ## 移行パターン
 *
 * Before: useDuckDBDailyCumulative → queryDailyCumulative (SQL: SUM OVER)
 * After:  useJsDailyCumulative → queryStoreDaySummary (SQL: SELECT *) → aggregateByDay + cumulativeSum (JS)
 *
 * チャートコンポーネントの API（返り値の型）は変更しない。
 */
import { useMemo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange, ComparisonFrame, PrevYearScope } from '@/domain/models'
import {
  queryStoreDaySummary,
  type StoreDaySummaryRow,
} from '@/infrastructure/duckdb/queries/storeDaySummary'
import type { DailyCumulativeRow } from '@/infrastructure/duckdb/queries/storeDaySummary'
import type {
  DowPatternRow,
  DailyFeatureRow,
  HourlyProfileRow,
} from '@/infrastructure/duckdb/queries/features'
import type { YoyDailyRow } from '@/infrastructure/duckdb/queries/yoyComparison'
import {
  queryStoreAggregation,
  type CtsFilterParams,
} from '@/infrastructure/duckdb/queries/categoryTimeSales'
import { toDateKey } from '@/domain/models/CalendarDate'
import { useAsyncQuery, toDateKeys, storeIdsToArray, type AsyncQueryResult } from './useAsyncQuery'
import { aggregateByDay, cumulativeSum } from '@/domain/calculations/rawAggregation'
import {
  computeDowPattern,
  computeDailyFeatures,
  computeYoyDaily,
  computeHourlyProfile,
} from './jsAggregationLogic'

// ─── 生データ取得（共通） ────────────────────────────────

/**
 * store_day_summary の生レコードを取得するフック。
 *
 * SQL は SELECT * WHERE のみ。集約は JS 側で行う。
 */
function useRawSummaryRows(
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

// ─── 日別累積売上（JS計算版） ──────────────────────────

/**
 * DuckDB 生データ → JS aggregateByDay + cumulativeSum
 *
 * SQL の SUM(sales) OVER (ORDER BY date_key) を置き換え。
 * 返り値は DailyCumulativeRow[] 互換。
 */
export function useJsDailyCumulative(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
  isPrevYear?: boolean,
): AsyncQueryResult<readonly DailyCumulativeRow[]> {
  const {
    data: rawRows,
    isLoading,
    error,
  } = useRawSummaryRows(conn, dataVersion, dateRange, storeIds, isPrevYear)

  const data = useMemo(() => {
    if (!rawRows) return null
    const daily = aggregateByDay(rawRows)
    return cumulativeSum(daily)
  }, [rawRows])

  return { data, isLoading, error }
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

// ─── YoY 日別比較（JS計算版） ─────────────────────────

/**
 * DuckDB 生データ（当期 + 前期を別取得）→ JS FULL OUTER JOIN
 *
 * SQL の FULL OUTER JOIN ON month=month AND day=day を置き換え。
 * 返り値は YoyDailyRow[] 互換。
 */
export function useJsYoyDaily(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  frame: ComparisonFrame | undefined,
  storeIds: ReadonlySet<string>,
  prevYearScope?: PrevYearScope,
): AsyncQueryResult<readonly YoyDailyRow[]> {
  // prevYearScope が渡された場合はオフセット調整済み範囲を使用
  const prevDateRange = prevYearScope?.dateRange ?? frame?.previous

  // 当期データ取得
  const {
    data: curRows,
    isLoading: curLoading,
    error: curError,
  } = useRawSummaryRows(conn, dataVersion, frame?.current, storeIds, false)

  // 前期データ取得
  const {
    data: prevRows,
    isLoading: prevLoading,
    error: prevError,
  } = useRawSummaryRows(conn, dataVersion, prevDateRange, storeIds, true)

  const data = useMemo(() => {
    if (!curRows || !prevRows) return null
    return computeYoyDaily(curRows, prevRows)
  }, [curRows, prevRows])

  return {
    data,
    isLoading: curLoading || prevLoading,
    error: curError || prevError,
  }
}

// ─── 時間帯別売上構成比（JS計算版） ──────────────────

/**
 * DuckDB の GROUP BY (store_id, hour) 結果 → JS で share + rank 計算
 *
 * SQL の SUM(amount) OVER (PARTITION BY store_id) + RANK() OVER を置き換え。
 * queryStoreAggregation (GROUP BY store_id, hour) の結果を再利用し、
 * share と rank は JS で計算する。
 *
 * 返り値は HourlyProfileRow[] 互換。
 */
export function useJsHourlyProfile(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
): AsyncQueryResult<readonly HourlyProfileRow[]> {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    const { dateFrom, dateTo } = toDateKeys(dateRange)
    const params: CtsFilterParams = {
      dateFrom,
      dateTo,
      storeIds: storeIdsToArray(storeIds),
    }
    return (c: AsyncDuckDBConnection) => queryStoreAggregation(c, params)
  }, [dateRange, storeIds])

  const { data: storeRows, isLoading, error } = useAsyncQuery(conn, dataVersion, queryFn)

  const data = useMemo(() => {
    if (!storeRows) return null
    return computeHourlyProfile(storeRows)
  }, [storeRows])

  return { data, isLoading, error }
}
