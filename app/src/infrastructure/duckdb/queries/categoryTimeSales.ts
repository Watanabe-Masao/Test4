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
import { z } from 'zod'
import { queryToObjects, queryScalar, buildTypedWhere } from '../queryRunner'
import type { WhereCondition } from '../queryRunner'

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

/** CTS/TS 共通の WhereCondition を構築する */
function buildCtsConditions(params: CtsFilterParams, alias: string): WhereCondition[] {
  const conditions: WhereCondition[] = [
    { type: 'dateRange', column: 'date_key', from: params.dateFrom, to: params.dateTo, alias },
    { type: 'boolean', column: 'is_prev_year', value: params.isPrevYear ?? false, alias },
    { type: 'storeIds', storeIds: params.storeIds, alias },
  ]
  if (params.deptCode)
    conditions.push({ type: 'code', column: 'dept_code', value: params.deptCode, alias })
  if (params.lineCode)
    conditions.push({ type: 'code', column: 'line_code', value: params.lineCode, alias })
  if (params.klassCode)
    conditions.push({ type: 'code', column: 'klass_code', value: params.klassCode, alias })
  return conditions
}

/** date_key + is_prev_year + 階層フィルタの WHERE 条件を組み立てる */
export function ctsWhereClause(params: CtsFilterParams, tableAlias: string): string {
  const conditions = buildCtsConditions(params, tableAlias)
  if (params.dow && params.dow.length > 0) {
    conditions.push({ type: 'in', column: 'dow', values: params.dow, alias: tableAlias })
  }
  return buildTypedWhere(conditions)
}

/** time_slots 用のフィルタ（dow は time_slots テーブルに無いため category_time_sales から） */
export function tsWhereClause(params: CtsFilterParams): string {
  return buildTypedWhere(buildCtsConditions(params, 'ts'))
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
  const DowDivisorRowSchema = z.object({ dow: z.number(), divisor: z.number() })
  const rows = await queryToObjects<{ dow: number; divisor: number }>(
    conn,
    sql,
    DowDivisorRowSchema,
  )
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
