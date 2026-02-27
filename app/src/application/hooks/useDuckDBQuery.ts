/**
 * DuckDB クエリフック
 *
 * WidgetContext の duckConn / duckDataVersion を使って DuckDB にクエリを発行し、
 * 結果を React ステートとして返す。非同期クエリの状態管理（loading / error）を内蔵。
 *
 * 各フックは DuckDB が未準備のときは null を返す。
 * ウィジェット側では null の場合に既存の JS パスにフォールバックする想定。
 */
import { useState, useEffect, useRef, useMemo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import { dateRangeToKeys } from '@/domain/models'
import type { DateRange } from '@/domain/models'
import {
  queryHourlyAggregation,
  queryLevelAggregation,
  queryStoreAggregation,
  queryHourDowMatrix,
  queryDistinctDayCount,
  queryDowDivisorMap,
  type CtsFilterParams,
  type HourlyAggregationRow,
  type LevelAggregationRow,
  type StoreAggregationRow,
  type HourDowMatrixRow,
} from '@/infrastructure/duckdb/queries/categoryTimeSales'
import {
  queryDeptKpiRanked,
  queryDeptKpiSummary,
  type DeptKpiRankedRow,
  type DeptKpiSummaryRow,
} from '@/infrastructure/duckdb/queries/departmentKpi'
import {
  queryDailyCumulative,
  queryAggregatedRates,
  type DailyCumulativeRow,
  type AggregatedRatesRow,
} from '@/infrastructure/duckdb/queries/storeDaySummary'
import {
  queryYoyDailyComparison,
  queryYoyCategoryComparison,
  type YoyDailyRow,
  type YoyCategoryRow,
} from '@/infrastructure/duckdb/queries/yoyComparison'
import {
  queryDailyFeatures,
  queryHourlyProfile,
  queryDowPattern,
  type DailyFeatureRow,
  type HourlyProfileRow,
  type DowPatternRow,
} from '@/infrastructure/duckdb/queries/features'

// ── 汎用非同期クエリフック ──

interface AsyncQueryResult<T> {
  readonly data: T | null
  readonly isLoading: boolean
  readonly error: string | null
}

/**
 * 汎用非同期 DuckDB クエリフック。
 *
 * queryFn が変わるたびにクエリを再実行し、結果をステートに反映する。
 * conn が null の場合はクエリを実行せず { data: null } を返す。
 */
function useAsyncQuery<T>(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  queryFn: ((conn: AsyncDuckDBConnection) => Promise<T>) | null,
): AsyncQueryResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const seqRef = useRef(0)

  useEffect(() => {
    if (!conn || !queryFn || dataVersion === 0) {
      ++seqRef.current
      return
    }

    const seq = ++seqRef.current
    let cancelled = false

    // async IIFE: setState は await 後（非同期コンテキスト）で呼ばれるため
    // react-hooks の同期 setState ルールに抵触しない
    const run = async () => {
      // await で非同期コンテキストに入ってから setState
      await Promise.resolve()
      if (cancelled) return
      setIsLoading(true)
      setError(null)
      try {
        const result = await queryFn(conn)
        if (!cancelled && seq === seqRef.current) {
          setData(result)
        }
      } catch (err: unknown) {
        if (!cancelled && seq === seqRef.current) {
          setError(err instanceof Error ? err.message : String(err))
        }
      } finally {
        if (!cancelled && seq === seqRef.current) {
          setIsLoading(false)
        }
      }
    }
    run()

    return () => {
      cancelled = true
    }
  }, [conn, dataVersion, queryFn])

  return { data, isLoading, error }
}

// ── DateRange → CtsFilterParams 変換ヘルパー ──

function toDateKeys(range: DateRange): { dateFrom: string; dateTo: string } {
  const { fromKey, toKey } = dateRangeToKeys(range)
  return { dateFrom: fromKey, dateTo: toKey }
}

function storeIdsToArray(storeIds: ReadonlySet<string>): readonly string[] | undefined {
  return storeIds.size > 0 ? [...storeIds] : undefined
}

// ── CTS クエリフック ──

/** 時間帯別集約データ */
export function useDuckDBHourlyAggregation(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
  hierarchy?: { deptCode?: string; lineCode?: string; klassCode?: string },
  isPrevYear?: boolean,
): AsyncQueryResult<readonly HourlyAggregationRow[]> {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    const { dateFrom, dateTo } = toDateKeys(dateRange)
    const params: CtsFilterParams = {
      dateFrom,
      dateTo,
      storeIds: storeIdsToArray(storeIds),
      deptCode: hierarchy?.deptCode,
      lineCode: hierarchy?.lineCode,
      klassCode: hierarchy?.klassCode,
      isPrevYear,
    }
    return (c: AsyncDuckDBConnection) => queryHourlyAggregation(c, params)
  }, [dateRange, storeIds, hierarchy?.deptCode, hierarchy?.lineCode, hierarchy?.klassCode, isPrevYear])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

/** 階層レベル別集約 */
export function useDuckDBLevelAggregation(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
  level: 'department' | 'line' | 'klass',
  hierarchy?: { deptCode?: string; lineCode?: string; klassCode?: string },
  isPrevYear?: boolean,
): AsyncQueryResult<readonly LevelAggregationRow[]> {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    const { dateFrom, dateTo } = toDateKeys(dateRange)
    const params: CtsFilterParams & { level: 'department' | 'line' | 'klass' } = {
      dateFrom,
      dateTo,
      storeIds: storeIdsToArray(storeIds),
      deptCode: hierarchy?.deptCode,
      lineCode: hierarchy?.lineCode,
      klassCode: hierarchy?.klassCode,
      isPrevYear,
      level,
    }
    return (c: AsyncDuckDBConnection) => queryLevelAggregation(c, params)
  }, [dateRange, storeIds, level, hierarchy?.deptCode, hierarchy?.lineCode, hierarchy?.klassCode, isPrevYear])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

/** 店舗別×時間帯集約 */
export function useDuckDBStoreAggregation(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
  hierarchy?: { deptCode?: string; lineCode?: string; klassCode?: string },
  isPrevYear?: boolean,
): AsyncQueryResult<readonly StoreAggregationRow[]> {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    const { dateFrom, dateTo } = toDateKeys(dateRange)
    const params: CtsFilterParams = {
      dateFrom,
      dateTo,
      storeIds: storeIdsToArray(storeIds),
      deptCode: hierarchy?.deptCode,
      lineCode: hierarchy?.lineCode,
      klassCode: hierarchy?.klassCode,
      isPrevYear,
    }
    return (c: AsyncDuckDBConnection) => queryStoreAggregation(c, params)
  }, [dateRange, storeIds, hierarchy?.deptCode, hierarchy?.lineCode, hierarchy?.klassCode, isPrevYear])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

/** 時間帯×曜日マトリクス */
export function useDuckDBHourDowMatrix(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
  hierarchy?: { deptCode?: string; lineCode?: string; klassCode?: string },
): AsyncQueryResult<readonly HourDowMatrixRow[]> {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    const { dateFrom, dateTo } = toDateKeys(dateRange)
    const params: CtsFilterParams = {
      dateFrom,
      dateTo,
      storeIds: storeIdsToArray(storeIds),
      deptCode: hierarchy?.deptCode,
      lineCode: hierarchy?.lineCode,
      klassCode: hierarchy?.klassCode,
    }
    return (c: AsyncDuckDBConnection) => queryHourDowMatrix(c, params)
  }, [dateRange, storeIds, hierarchy?.deptCode, hierarchy?.lineCode, hierarchy?.klassCode])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

/** distinct 日数 */
export function useDuckDBDistinctDayCount(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
  isPrevYear?: boolean,
): AsyncQueryResult<number> {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    const { dateFrom, dateTo } = toDateKeys(dateRange)
    const params: CtsFilterParams = {
      dateFrom,
      dateTo,
      storeIds: storeIdsToArray(storeIds),
      isPrevYear,
    }
    return (c: AsyncDuckDBConnection) => queryDistinctDayCount(c, params)
  }, [dateRange, storeIds, isPrevYear])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

/** 曜日別除数マップ */
export function useDuckDBDowDivisorMap(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
  isPrevYear?: boolean,
): AsyncQueryResult<ReadonlyMap<number, number>> {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    const { dateFrom, dateTo } = toDateKeys(dateRange)
    const params: CtsFilterParams = {
      dateFrom,
      dateTo,
      storeIds: storeIdsToArray(storeIds),
      isPrevYear,
    }
    return (c: AsyncDuckDBConnection) => queryDowDivisorMap(c, params)
  }, [dateRange, storeIds, isPrevYear])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

// ── 部門KPIクエリフック ──

export interface DuckDBDeptKpiResult {
  readonly ranked: readonly DeptKpiRankedRow[]
  readonly summary: DeptKpiSummaryRow | null
}

/** 部門KPI（ランキング + サマリー一括取得） */
export function useDuckDBDeptKpi(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  year: number,
  month: number,
): AsyncQueryResult<DuckDBDeptKpiResult> {
  const queryFn = useMemo(() => {
    const params = { year, month }
    return async (c: AsyncDuckDBConnection): Promise<DuckDBDeptKpiResult> => {
      const [ranked, summary] = await Promise.all([
        queryDeptKpiRanked(c, params),
        queryDeptKpiSummary(c, params),
      ])
      return { ranked, summary }
    }
  }, [year, month])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

// ── StoreDaySummary クエリフック ──

/** 日別累積売上 */
export function useDuckDBDailyCumulative(
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
      queryDailyCumulative(c, {
        dateFrom,
        dateTo,
        storeIds: storeIdsToArray(storeIds),
        isPrevYear,
      })
  }, [dateRange, storeIds, isPrevYear])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

/** 期間集約レート */
export function useDuckDBAggregatedRates(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
  isPrevYear?: boolean,
): AsyncQueryResult<AggregatedRatesRow | null> {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    const { dateFrom, dateTo } = toDateKeys(dateRange)
    return (c: AsyncDuckDBConnection) =>
      queryAggregatedRates(c, {
        dateFrom,
        dateTo,
        storeIds: storeIdsToArray(storeIds),
        isPrevYear,
      })
  }, [dateRange, storeIds, isPrevYear])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

// ── YoY クエリフック ──

/** 日別前年比較 */
export function useDuckDBYoyDaily(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  curRange: DateRange | undefined,
  prevRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
): AsyncQueryResult<readonly YoyDailyRow[]> {
  const queryFn = useMemo(() => {
    if (!curRange || !prevRange) return null
    const cur = toDateKeys(curRange)
    const prev = toDateKeys(prevRange)
    return (c: AsyncDuckDBConnection) =>
      queryYoyDailyComparison(c, {
        curDateFrom: cur.dateFrom,
        curDateTo: cur.dateTo,
        prevDateFrom: prev.dateFrom,
        prevDateTo: prev.dateTo,
        storeIds: storeIdsToArray(storeIds),
      })
  }, [curRange, prevRange, storeIds])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

/** カテゴリ別前年比較 */
export function useDuckDBYoyCategory(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  curRange: DateRange | undefined,
  prevRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
  level: 'department' | 'line' | 'klass',
): AsyncQueryResult<readonly YoyCategoryRow[]> {
  const queryFn = useMemo(() => {
    if (!curRange || !prevRange) return null
    const cur = toDateKeys(curRange)
    const prev = toDateKeys(prevRange)
    return (c: AsyncDuckDBConnection) =>
      queryYoyCategoryComparison(c, {
        curDateFrom: cur.dateFrom,
        curDateTo: cur.dateTo,
        prevDateFrom: prev.dateFrom,
        prevDateTo: prev.dateTo,
        storeIds: storeIdsToArray(storeIds),
        level,
      })
  }, [curRange, prevRange, storeIds, level])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

// ── 特徴量クエリフック ──

/** 日別売上特徴量ベクトル */
export function useDuckDBDailyFeatures(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
): AsyncQueryResult<readonly DailyFeatureRow[]> {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    const { dateFrom, dateTo } = toDateKeys(dateRange)
    return (c: AsyncDuckDBConnection) =>
      queryDailyFeatures(c, {
        dateFrom,
        dateTo,
        storeIds: storeIdsToArray(storeIds),
      })
  }, [dateRange, storeIds])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

/** 時間帯別売上構成比 */
export function useDuckDBHourlyProfile(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
): AsyncQueryResult<readonly HourlyProfileRow[]> {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    const { dateFrom, dateTo } = toDateKeys(dateRange)
    return (c: AsyncDuckDBConnection) =>
      queryHourlyProfile(c, {
        dateFrom,
        dateTo,
        storeIds: storeIdsToArray(storeIds),
      })
  }, [dateRange, storeIds])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

/** 曜日パターン */
export function useDuckDBDowPattern(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
): AsyncQueryResult<readonly DowPatternRow[]> {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    const { dateFrom, dateTo } = toDateKeys(dateRange)
    return (c: AsyncDuckDBConnection) =>
      queryDowPattern(c, {
        dateFrom,
        dateTo,
        storeIds: storeIdsToArray(storeIds),
      })
  }, [dateRange, storeIds])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

// ── Re-export types for consumer convenience ──

export type {
  HourlyAggregationRow,
  LevelAggregationRow,
  StoreAggregationRow,
  HourDowMatrixRow,
  DeptKpiRankedRow,
  DeptKpiSummaryRow,
  DailyCumulativeRow,
  AggregatedRatesRow,
  YoyDailyRow,
  YoyCategoryRow,
  DailyFeatureRow,
  HourlyProfileRow,
  DowPatternRow,
}
