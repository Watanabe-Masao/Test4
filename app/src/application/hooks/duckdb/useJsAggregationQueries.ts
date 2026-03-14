/**
 * クエリフック群（集約は SQL、統計計算は JS）
 *
 * DuckDB SQL で集約（GROUP BY, SUM OVER 等）し、
 * 統計計算（移動平均、Z-score、曜日パターン等）は JS の純粋関数で行う。
 *
 * ## 責務分担
 *
 * - SQL (DuckDB): 明細からの GROUP BY 集約、ウィンドウ関数（aggregate-source）
 * - JS (TS): 統計計算、意味づけ（authoritative-metric / derived）
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
import type { DailyCumulativeRow } from '@/infrastructure/duckdb/queries/aggregates/dailyAggregation'
import { queryDailyCumulativeAggregation } from '@/infrastructure/duckdb/queries/aggregates/dailyAggregation'
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
import {
  computeDowPattern,
  computeDailyFeatures,
  computeYoyDailyV2,
  computeHourlyProfile,
} from './jsAggregationLogic'
import type { CompareModeV2 } from '@/application/comparison/comparisonTypes'
import type { AlignmentPolicy } from '@/domain/models/ComparisonFrame'

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

// ─── 日別累積売上（SQL 集約版） ──────────────────────────

/**
 * DuckDB SQL で日別売上を GROUP BY 集約 + ウィンドウ関数で累積合計
 *
 * 集約は SQL 側（aggregate-source）、TS 側は結果の受け渡しのみ。
 * 返り値は DailyCumulativeRow[] 互換。
 */
export function useJsDailyCumulative(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
  isPrevYear?: boolean,
): AsyncQueryResult<readonly DailyCumulativeRow[]> {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    const { dateFrom, dateTo } = toDateKeys(dateRange)
    return (c: AsyncDuckDBConnection) =>
      queryDailyCumulativeAggregation(c, {
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

// ─── YoY 日別比較（JS計算版 V2） ─────────────────────

/** AlignmentPolicy → CompareModeV2 の変換 */
function toCompareModeV2(policy: AlignmentPolicy | undefined): CompareModeV2 {
  if (policy === 'sameDayOfWeek') return 'sameDayOfWeek'
  return 'sameDate'
}

/**
 * DuckDB 生データ（当期 + 前期を別取得）→ V2 日単位比較先解決
 *
 * V2: dowOffset を受け取らず、compareMode に応じて日単位で比較先を解決する。
 * compareMode は frame.policy から導出する（第一ソース）。
 *
 * 返り値は YoyDailyRow[] 互換（YoyDailyRowVm は YoyDailyRow の上位互換）。
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

  // compareMode は frame.policy から導出（第一ソース）
  const resolvedMode = toCompareModeV2(frame?.policy)

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
    return computeYoyDailyV2(curRows, prevRows, resolvedMode)
  }, [curRows, prevRows, resolvedMode])

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
