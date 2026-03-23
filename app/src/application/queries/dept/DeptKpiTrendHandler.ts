/**
 * DeptKpiTrendHandler — 部門KPI月次トレンドクエリ
 *
 * DeptTrendChart で使用。
 * 入力は BaseQueryInput ベースではなく、yearMonths + deptCode の独自形式。
 */
import type { QueryHandler } from '../QueryContract'
import {
  queryDeptKpiMonthlyTrend,
  type DeptKpiMonthlyTrendRow,
} from '@/infrastructure/duckdb/queries/departmentKpi'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'

export interface DeptKpiTrendInput {
  readonly yearMonths: readonly { readonly year: number; readonly month: number }[]
  readonly deptCode?: string
}

export interface DeptKpiTrendOutput {
  readonly records: readonly DeptKpiMonthlyTrendRow[]
}

export const deptKpiTrendHandler: QueryHandler<DeptKpiTrendInput, DeptKpiTrendOutput> = {
  name: 'DeptKpiTrend',
  async execute(
    conn: AsyncDuckDBConnection,
    input: DeptKpiTrendInput,
  ): Promise<DeptKpiTrendOutput> {
    const records = await queryDeptKpiMonthlyTrend(conn, input)
    return { records }
  },
}

export type { DeptKpiMonthlyTrendRow }
