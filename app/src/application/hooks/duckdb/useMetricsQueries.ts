/**
 * 店舗期間メトリクス + 予算分析クエリフック群
 *
 * storePeriodMetrics.ts / budgetAnalysis.ts のクエリを
 * useAsyncQuery ベースのフックとして提供する。
 */
import { useMemo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import {
  queryStorePeriodMetrics,
  type StorePeriodMetricsRow,
} from '@/infrastructure/duckdb/queries/storePeriodMetrics'
import {
  queryDailyCumulativeBudget,
  queryBudgetAnalysisSummary,
  type DailyCumulativeBudgetRow,
  type BudgetAnalysisSummaryRow,
} from '@/infrastructure/duckdb/queries/budgetAnalysis'
import { useAsyncQuery, type AsyncQueryResult } from './useAsyncQuery'

// ── 店舗期間メトリクスフック（StoreResult の SQL 版）──

/**
 * 店舗別期間メトリクスを取得する。
 *
 * StoreResult の全計算値を SQL CTE で算出した結果を返す。
 * Infrastructure 層がドメイン型を直接受け取るため、
 * フック側でのパラメータ変換は不要。
 */
export function useDuckDBStorePeriodMetrics(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
): AsyncQueryResult<readonly StorePeriodMetricsRow[]> {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    return (c: AsyncDuckDBConnection) => queryStorePeriodMetrics(c, dateRange, storeIds)
  }, [dateRange, storeIds])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

// ── 予算分析フック ──

/** 日別累積売上・予算を取得する */
export function useDuckDBDailyCumulativeBudget(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
): AsyncQueryResult<readonly DailyCumulativeBudgetRow[]> {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    return (c: AsyncDuckDBConnection) => queryDailyCumulativeBudget(c, dateRange, storeIds)
  }, [dateRange, storeIds])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

/** 店舗別予算分析サマリーを取得する */
export function useDuckDBBudgetAnalysisSummary(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
): AsyncQueryResult<readonly BudgetAnalysisSummaryRow[]> {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    return (c: AsyncDuckDBConnection) => queryBudgetAnalysisSummary(c, dateRange, storeIds)
  }, [dateRange, storeIds])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

export type { StorePeriodMetricsRow, DailyCumulativeBudgetRow, BudgetAnalysisSummaryRow }
