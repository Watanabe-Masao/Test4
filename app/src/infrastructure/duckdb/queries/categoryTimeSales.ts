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
import { queryToObjects, queryScalar, buildWhereClause, storeIdFilter } from '../queryRunner'

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
function ctsWhereClause(params: CtsFilterParams, tableAlias: string): string {
  const a = tableAlias
  const conditions: (string | null)[] = [
    `${a}.date_key BETWEEN '${params.dateFrom}' AND '${params.dateTo}'`,
    `${a}.is_prev_year = ${params.isPrevYear ?? false}`,
    storeIdFilter(params.storeIds)
      ? storeIdFilter(params.storeIds)!.replace('store_id', `${a}.store_id`)
      : null,
    params.deptCode ? `${a}.dept_code = '${params.deptCode}'` : null,
    params.lineCode ? `${a}.line_code = '${params.lineCode}'` : null,
    params.klassCode ? `${a}.klass_code = '${params.klassCode}'` : null,
    params.dow && params.dow.length > 0
      ? `${a}.dow IN (${params.dow.join(', ')})`
      : null,
  ]
  return buildWhereClause(conditions)
}

/** time_slots 用のフィルタ（dow は time_slots テーブルに無いため category_time_sales から） */
function tsWhereClause(params: CtsFilterParams): string {
  const conditions: (string | null)[] = [
    `ts.date_key BETWEEN '${params.dateFrom}' AND '${params.dateTo}'`,
    `ts.is_prev_year = ${params.isPrevYear ?? false}`,
    storeIdFilter(params.storeIds)
      ? storeIdFilter(params.storeIds)!.replace('store_id', 'ts.store_id')
      : null,
    params.deptCode ? `ts.dept_code = '${params.deptCode}'` : null,
    params.lineCode ? `ts.line_code = '${params.lineCode}'` : null,
    params.klassCode ? `ts.klass_code = '${params.klassCode}'` : null,
  ]
  return buildWhereClause(conditions)
}

// ── 時間帯別集約 ──

export interface HourlyAggregationRow {
  readonly hour: number
  readonly totalAmount: number
  readonly totalQuantity: number
}

/**
 * 時間帯別集約（aggregateHourly 相当）
 */
export async function queryHourlyAggregation(
  conn: AsyncDuckDBConnection,
  params: CtsFilterParams,
): Promise<readonly HourlyAggregationRow[]> {
  const where = tsWhereClause(params)
  const sql = `
    SELECT
      ts.hour,
      SUM(ts.amount) AS total_amount,
      SUM(ts.quantity) AS total_quantity
    FROM time_slots ts
    ${where}
    GROUP BY ts.hour
    ORDER BY ts.hour`
  return queryToObjects<HourlyAggregationRow>(conn, sql)
}

// ── 階層レベル別集約 ──

export interface LevelAggregationRow {
  readonly code: string
  readonly name: string
  readonly amount: number
  readonly quantity: number
  readonly childCount: number
}

/**
 * 階層レベル別集約（aggregateByLevel 相当）
 */
export async function queryLevelAggregation(
  conn: AsyncDuckDBConnection,
  params: CtsFilterParams & { readonly level: 'department' | 'line' | 'klass' },
): Promise<readonly LevelAggregationRow[]> {
  const where = ctsWhereClause(params, 'cts')

  let codeCol: string
  let nameCol: string
  let childExpr: string

  switch (params.level) {
    case 'department':
      codeCol = 'cts.dept_code'
      nameCol = 'cts.dept_name'
      childExpr = 'COUNT(DISTINCT cts.line_code)'
      break
    case 'line':
      codeCol = 'cts.line_code'
      nameCol = 'cts.line_name'
      childExpr = 'COUNT(DISTINCT cts.klass_code)'
      break
    case 'klass':
      codeCol = 'cts.klass_code'
      nameCol = 'cts.klass_name'
      childExpr = '0'
      break
  }

  const sql = `
    SELECT
      ${codeCol} AS code,
      ${nameCol} AS name,
      SUM(cts.total_amount) AS amount,
      SUM(cts.total_quantity) AS quantity,
      ${childExpr} AS child_count
    FROM category_time_sales cts
    ${where}
    GROUP BY ${codeCol}, ${nameCol}
    ORDER BY amount DESC`
  return queryToObjects<LevelAggregationRow>(conn, sql)
}

// ── 店舗別時間帯集約 ──

export interface StoreAggregationRow {
  readonly storeId: string
  readonly hour: number
  readonly amount: number
}

/**
 * 店舗別×時間帯集約（aggregateByStore 相当）
 */
export async function queryStoreAggregation(
  conn: AsyncDuckDBConnection,
  params: CtsFilterParams,
): Promise<readonly StoreAggregationRow[]> {
  const where = tsWhereClause(params)
  const sql = `
    SELECT
      ts.store_id,
      ts.hour,
      SUM(ts.amount) AS amount
    FROM time_slots ts
    ${where}
    GROUP BY ts.store_id, ts.hour
    ORDER BY ts.store_id, ts.hour`
  return queryToObjects<StoreAggregationRow>(conn, sql)
}

// ── 時間帯×曜日マトリクス ──

export interface HourDowMatrixRow {
  readonly hour: number
  readonly dow: number
  readonly amount: number
  readonly dayCount: number
}

/**
 * 時間帯×曜日マトリクス（aggregateHourDow 相当）
 */
export async function queryHourDowMatrix(
  conn: AsyncDuckDBConnection,
  params: CtsFilterParams,
): Promise<readonly HourDowMatrixRow[]> {
  const where = tsWhereClause(params)
  // dow は category_time_sales テーブルにあるが time_slots にはないので、
  // make_date で算出する
  const sql = `
    SELECT
      ts.hour,
      EXTRACT(dow FROM make_date(ts.year, ts.month, ts.day))::INTEGER AS dow,
      SUM(ts.amount) AS amount,
      COUNT(DISTINCT ts.date_key) AS day_count
    FROM time_slots ts
    ${where}
    GROUP BY ts.hour, dow
    ORDER BY ts.hour, dow`
  return queryToObjects<HourDowMatrixRow>(conn, sql)
}

// ── 除数計算用 ──

/**
 * 期間内の distinct 日数（countDistinctDays 相当）
 */
export async function queryDistinctDayCount(
  conn: AsyncDuckDBConnection,
  params: CtsFilterParams,
): Promise<number> {
  const where = ctsWhereClause(params, 'cts')
  const sql = `
    SELECT COUNT(DISTINCT cts.date_key) AS cnt
    FROM category_time_sales cts
    ${where}`
  return (await queryScalar<number>(conn, sql)) ?? 0
}

/**
 * 曜日別除数マップ（computeDowDivisorMap 相当）
 */
export async function queryDowDivisorMap(
  conn: AsyncDuckDBConnection,
  params: CtsFilterParams,
): Promise<ReadonlyMap<number, number>> {
  const where = ctsWhereClause(params, 'cts')
  const sql = `
    SELECT
      cts.dow,
      COUNT(DISTINCT cts.date_key) AS divisor
    FROM category_time_sales cts
    ${where}
    GROUP BY cts.dow`
  const rows = await queryToObjects<{ dow: number; divisor: number }>(conn, sql)
  return new Map(rows.map((r) => [r.dow, r.divisor]))
}
