/**
 * 部門KPIクエリフック群
 *
 * SQL は加重合計（numerator）のみ返し、
 * 率の算出は domain/calculations の safeDivide 経由で行う（禁止事項 #10）。
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
import { safeDivide } from '@/domain/calculations/utils'
import { useAsyncQuery, type AsyncQueryResult } from './useAsyncQuery'

/** 率算出済みの部門KPIサマリー */
export interface DeptKpiSummaryResolved {
  readonly deptCount: number
  readonly totalSalesBudget: number
  readonly totalSalesActual: number
  readonly overallSalesAchievement: number
  readonly weightedGpRateBudget: number
  readonly weightedGpRateActual: number
  readonly weightedDiscountRate: number
  readonly weightedMarkupRate: number
}

export interface DuckDBDeptKpiResult {
  readonly ranked: readonly DeptKpiRankedRow[]
  readonly summary: DeptKpiSummaryResolved | null
}

/** SQL の加重合計から率を算出する */
function resolveSummary(raw: DeptKpiSummaryRow): DeptKpiSummaryResolved {
  return {
    deptCount: raw.deptCount,
    totalSalesBudget: raw.totalSalesBudget,
    totalSalesActual: raw.totalSalesActual,
    overallSalesAchievement: raw.overallSalesAchievement,
    weightedGpRateBudget: safeDivide(raw.gpBudgetWeightedSum, raw.totalSalesActual),
    weightedGpRateActual: safeDivide(raw.gpActualWeightedSum, raw.totalSalesActual),
    weightedDiscountRate: safeDivide(raw.discountWeightedSum, raw.totalSalesActual),
    weightedMarkupRate: safeDivide(raw.markupWeightedSum, raw.totalSalesActual),
  }
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
      const [ranked, rawSummary] = await Promise.all([
        queryDeptKpiRanked(c, params),
        queryDeptKpiSummary(c, params),
      ])
      return {
        ranked,
        summary: rawSummary ? resolveSummary(rawSummary) : null,
      }
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
