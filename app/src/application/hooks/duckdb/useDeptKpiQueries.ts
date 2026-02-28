/**
 * 部門KPIクエリフック群
 */
import { useMemo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import {
  queryDeptKpiRanked,
  queryDeptKpiSummary,
  queryDeptKpiMonthlyTrend,
  type DeptKpiRankedRow,
  type DeptKpiSummaryRow,
  type DeptKpiMonthlyTrendRow,
} from '@/infrastructure/duckdb/queries/departmentKpi'
import { useAsyncQuery, type AsyncQueryResult } from './useAsyncQuery'

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

/** 部門KPI月別トレンド */
export function useDuckDBDeptKpiTrend(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  yearMonths: readonly { readonly year: number; readonly month: number }[],
  deptCode?: string,
): AsyncQueryResult<readonly DeptKpiMonthlyTrendRow[]> {
  const queryFn = useMemo(() => {
    if (yearMonths.length === 0) return null
    return (c: AsyncDuckDBConnection) => queryDeptKpiMonthlyTrend(c, { yearMonths, deptCode })
  }, [yearMonths, deptCode])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

export type { DeptKpiRankedRow, DeptKpiSummaryRow, DeptKpiMonthlyTrendRow }
