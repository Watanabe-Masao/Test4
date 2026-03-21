/**
 * 分類別時間帯売上 (CTS) クエリモジュール
 *
 * 既存の JS 関数との対応:
 * | JS (filters.ts / aggregation.ts)    | DuckDB SQL                  |
 * |--------------------------------------|-----------------------------|
 * | queryByDateRange + aggregateHourly   | queryHourlyAggregation      |
 * | queryByDateRange + aggregateByLevel  | queryLevelAggregation       |
 * | queryByDateRange + aggregateByStore  | queryStoreAggregation       |
 * | aggregateHourDow                     | queryHourDowMatrix          |
 * | countDistinctDays (PeriodFilter)     | queryDistinctDayCount       |
 * | computeDowDivisorMap (PeriodFilter)  | queryDowDivisorMap          |
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import {
  queryToObjects,
  queryScalar,
  buildWhereClause,
  storeIdFilterWithAlias,
} from '../queryRunner'
import { validateDateKey, validateCode } from '../queryParams'

// ── 共通フィルタ ──

/** 共通フィルタ条件 */
export interface CtsFilterParams {
  readonly dateFrom: string // 'YYYY-MM-DD'
  readonly dateTo: string
  readonly storeIds?: readonly string[]
  readonly deptCode?: string
  readonly lineCode?: string
  readonly klassCode?: string
  readonly dow?: readonly number[] // 0=Sun..6=Sat
  readonly isPrevYear?: boolean
}

/** date_key + is_prev_year + 階層フィルタの WHERE 条件を組み立てる */
export function ctsWhereClause(params: CtsFilterParams, tableAlias: string): string {
  const a = tableAlias
  const dateFrom = validateDateKey(params.dateFrom)
  const dateTo = validateDateKey(params.dateTo)
  const conditions: (string | null)[] = [
    `${a}.date_key BETWEEN '${dateFrom}' AND '${dateTo}'`,
    `${a}.is_prev_year = ${params.isPrevYear ?? false}`,
    storeIdFilterWithAlias(params.storeIds, a),
    params.deptCode ? `${a}.dept_code = '${validateCode(params.deptCode)}'` : null,
    params.lineCode ? `${a}.line_code = '${validateCode(params.lineCode)}'` : null,
    params.klassCode ? `${a}.klass_code = '${validateCode(params.klassCode)}'` : null,
    params.dow && params.dow.length > 0 ? `${a}.dow IN (${params.dow.join(', ')})` : null,
  ]
  return buildWhereClause(conditions)
}

/** time_slots 用のフィルタ（dow は time_slots テーブルに無いため category_time_sales から） */
export function tsWhereClause(params: CtsFilterParams): string {
  const dateFrom = validateDateKey(params.dateFrom)
  const dateTo = validateDateKey(params.dateTo)
  const conditions: (string | null)[] = [
    `ts.date_key BETWEEN '${dateFrom}' AND '${dateTo}'`,
    `ts.is_prev_year = ${params.isPrevYear ?? false}`,
    storeIdFilterWithAlias(params.storeIds, 'ts'),
    params.deptCode ? `ts.dept_code = '${validateCode(params.deptCode)}'` : null,
    params.lineCode ? `ts.line_code = '${validateCode(params.lineCode)}'` : null,
    params.klassCode ? `ts.klass_code = '${validateCode(params.klassCode)}'` : null,
  ]
  return buildWhereClause(conditions)
}

// ── 除数計算用 ──

/**
 * 期間内の distinct 日数（countDistinctDays 相当）
 *
 * businessDaysOnly=true の場合、total_amount > 0 の日のみカウントする。
 * これにより非営業日や非取扱品目の 0 レコードが除数を膨らませるのを防ぐ。
 */
export async function queryDistinctDayCount(
  conn: AsyncDuckDBConnection,
  params: CtsFilterParams & { readonly businessDaysOnly?: boolean },
): Promise<number> {
  const where = ctsWhereClause(params, 'cts')
  const businessFilter = params.businessDaysOnly ? ' AND cts.total_amount > 0' : ''
  const sql = `
    SELECT COUNT(DISTINCT cts.date_key) AS cnt
    FROM category_time_sales cts
    ${where}${businessFilter}`
  return (await queryScalar<number>(conn, sql)) ?? 0
}

/**
 * 曜日別除数マップ（computeDowDivisorMap 相当）
 *
 * businessDaysOnly=true の場合、total_amount > 0 の日のみカウントする。
 */
export async function queryDowDivisorMap(
  conn: AsyncDuckDBConnection,
  params: CtsFilterParams & { readonly businessDaysOnly?: boolean },
): Promise<ReadonlyMap<number, number>> {
  const where = ctsWhereClause(params, 'cts')
  const businessFilter = params.businessDaysOnly ? ' AND cts.total_amount > 0' : ''
  const sql = `
    SELECT
      cts.dow,
      COUNT(DISTINCT cts.date_key) AS divisor
    FROM category_time_sales cts
    ${where}${businessFilter}
    GROUP BY cts.dow`
  const rows = await queryToObjects<{ dow: number; divisor: number }>(conn, sql)
  return new Map(rows.map((r) => [r.dow, r.divisor]))
}

// ── サブモジュール re-export ──

export {
  queryHourlyAggregation,
  queryStoreAggregation,
  queryHourDowMatrix,
  queryCategoryHourly,
  queryCategoryDowMatrix,
} from './ctsHourlyQueries'
export type {
  HourlyAggregationRow,
  StoreAggregationRow,
  HourDowMatrixRow,
  CategoryHourlyRow,
  CategoryDowMatrixRow,
} from './ctsHourlyQueries'

export {
  queryLevelAggregation,
  queryCategoryDailyTrend,
  queryCategoryTimeRecords,
} from './ctsHierarchyQueries'
export type { LevelAggregationRow, CategoryDailyTrendRow } from './ctsHierarchyQueries'
