/**
 * JS売上比較フック（日別累積・前年比較・時間帯別）
 *
 * DuckDB SQL 集約または JS 純粋関数で売上比較データを算出する。
 * useJsAggregationQueries.ts から分割。
 * @responsibility R:query-exec
 */
import { useMemo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import type { ComparisonScope } from '@/domain/models/ComparisonScope'
import type { DailyCumulativeRow } from '@/infrastructure/duckdb/queries/aggregates/dailyAggregation'
import { queryDailyCumulativeAggregation } from '@/infrastructure/duckdb/queries/aggregates/dailyAggregation'
import type { HourlyProfileRow } from '@/infrastructure/duckdb/queries/features'
import type { YoyDailyRow } from '@/infrastructure/duckdb/queries/yoyComparison'
import {
  queryStoreAggregation,
  type CtsFilterParams,
} from '@/infrastructure/duckdb/queries/categoryTimeSales'
import { useAsyncQuery, toDateKeys, storeIdsToArray, type AsyncQueryResult } from './useAsyncQuery'
import { computeYoyDailyV2, computeHourlyProfile } from './jsAggregationLogic'
import { useRawSummaryRows } from './useJsFeatureQueries'
import type { CompareModeV2 } from '@/application/comparison/comparisonTypes'
import type { AlignmentMode } from '@/domain/models/ComparisonScope'

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

// ─── YoY 日別比較（JS計算版 V2） ─────────────────────

/** AlignmentMode → CompareModeV2 の変換 */
function toCompareModeV2(mode: AlignmentMode | undefined): CompareModeV2 {
  if (mode === 'sameDayOfWeek') return 'sameDayOfWeek'
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
  scope: ComparisonScope | null,
  storeIds: ReadonlySet<string>,
  prevYearScope?: PrevYearScope,
): AsyncQueryResult<readonly YoyDailyRow[]> {
  // prevYearScope が渡された場合はオフセット調整済み範囲を使用
  const prevDateRange = prevYearScope?.dateRange ?? scope?.effectivePeriod2

  // compareMode は scope.alignmentMode から導出（第一ソース）
  const resolvedMode = toCompareModeV2(scope?.alignmentMode)

  // 当期データ取得
  const {
    data: curRows,
    isLoading: curLoading,
    error: curError,
  } = useRawSummaryRows(conn, dataVersion, scope?.effectivePeriod1, storeIds, false)

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
