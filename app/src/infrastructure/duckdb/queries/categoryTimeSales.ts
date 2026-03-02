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
import type { CategoryTimeSalesRecord, TimeSlotEntry } from '@/domain/models'

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
function tsWhereClause(params: CtsFilterParams): string {
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

// ── カテゴリ別日次トレンド ──

export interface CategoryDailyTrendRow {
  readonly code: string
  readonly name: string
  readonly dateKey: string
  readonly amount: number
  readonly quantity: number
}

/**
 * カテゴリ別日次売上トレンド（月跨ぎ対応）
 *
 * 指定した階層レベル（department/line/klass）で日次売上を集約し、
 * 上位 N カテゴリに絞って返す。カテゴリ時系列チャート用。
 */
export async function queryCategoryDailyTrend(
  conn: AsyncDuckDBConnection,
  params: CtsFilterParams & {
    readonly level: 'department' | 'line' | 'klass'
    readonly topN?: number
  },
): Promise<readonly CategoryDailyTrendRow[]> {
  const where = ctsWhereClause(params, 'cts')
  const topN = params.topN ?? 10

  let codeCol: string
  let nameCol: string

  switch (params.level) {
    case 'department':
      codeCol = 'cts.dept_code'
      nameCol = 'cts.dept_name'
      break
    case 'line':
      codeCol = 'cts.line_code'
      nameCol = 'cts.line_name'
      break
    case 'klass':
      codeCol = 'cts.klass_code'
      nameCol = 'cts.klass_name'
      break
  }

  const sql = `
    WITH daily AS (
      SELECT
        ${codeCol} AS code,
        ${nameCol} AS name,
        cts.date_key,
        SUM(cts.total_amount) AS amount,
        SUM(cts.total_quantity) AS quantity
      FROM category_time_sales cts
      ${where}
      GROUP BY ${codeCol}, ${nameCol}, cts.date_key
    ),
    ranked AS (
      SELECT code FROM daily GROUP BY code ORDER BY SUM(amount) DESC LIMIT ${topN}
    )
    SELECT d.code, d.name, d.date_key, d.amount, d.quantity
    FROM daily d
    WHERE d.code IN (SELECT code FROM ranked)
    ORDER BY d.date_key, d.code`
  return queryToObjects<CategoryDailyTrendRow>(conn, sql)
}

// ── カテゴリ×時間帯集約 ──

export interface CategoryHourlyRow {
  readonly code: string
  readonly name: string
  readonly hour: number
  readonly amount: number
  readonly quantity: number
}

/**
 * カテゴリ別×時間帯集約
 *
 * 指定した階層レベルで時間帯別売上を集約する。
 * time_slots テーブルを使い、名前は category_time_sales から取得。
 */
export async function queryCategoryHourly(
  conn: AsyncDuckDBConnection,
  params: CtsFilterParams & { readonly level: 'department' | 'line' | 'klass' },
): Promise<readonly CategoryHourlyRow[]> {
  const where = tsWhereClause(params)

  let codeCol: string
  let nameCol: string

  switch (params.level) {
    case 'department':
      codeCol = 'ts.dept_code'
      nameCol = 'n.dept_name'
      break
    case 'line':
      codeCol = 'ts.line_code'
      nameCol = 'n.line_name'
      break
    case 'klass':
      codeCol = 'ts.klass_code'
      nameCol = 'n.klass_name'
      break
  }

  const sql = `
    WITH agg AS (
      SELECT
        ${codeCol} AS code,
        ts.hour,
        SUM(ts.amount) AS amount,
        SUM(ts.quantity) AS quantity
      FROM time_slots ts
      ${where}
      GROUP BY ${codeCol}, ts.hour
    ),
    names AS (
      SELECT DISTINCT ${codeCol.replace('ts.', '')} AS code_key,
        ${nameCol.replace('n.', '')} AS name_val
      FROM category_time_sales n
    )
    SELECT agg.code, names.name_val AS name, agg.hour, agg.amount, agg.quantity
    FROM agg
    LEFT JOIN names ON agg.code = names.code_key
    ORDER BY agg.amount DESC, agg.hour`
  return queryToObjects<CategoryHourlyRow>(conn, sql)
}

// ── 除数計算用 ──

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

// ── CategoryTimeSalesRecord 互換データ取得 ──

/** JOIN 結果の1行（queryToObjects が snake→camel 変換済み） */
interface CtsJoinRow {
  readonly year: number
  readonly month: number
  readonly day: number
  readonly storeId: string
  readonly deptCode: string
  readonly deptName: string | null
  readonly lineCode: string
  readonly lineName: string | null
  readonly klassCode: string
  readonly klassName: string | null
  readonly totalQuantity: number
  readonly totalAmount: number
  readonly hour: number | null
  readonly hourQuantity: number | null
  readonly hourAmount: number | null
}

/**
 * category_time_sales + time_slots を JOIN して CategoryTimeSalesRecord[] を返す。
 *
 * DayDetailModal / YoYWaterfallChart が使う子コンポーネント（HourlyChart,
 * CategoryDrilldown, DrilldownWaterfall, CategoryFactorBreakdown）は
 * CategoryTimeSalesRecord[] を受け取る。この関数はDuckDBから同等のデータを取得し、
 * JS側でグループ化して同じ型を返す。
 */
export async function queryCategoryTimeRecords(
  conn: AsyncDuckDBConnection,
  params: CtsFilterParams,
): Promise<readonly CategoryTimeSalesRecord[]> {
  const where = ctsWhereClause(params, 'cts')
  const sql = `
    SELECT
      cts.year, cts.month, cts.day, cts.store_id,
      cts.dept_code, cts.dept_name, cts.line_code, cts.line_name,
      cts.klass_code, cts.klass_name,
      cts.total_quantity, cts.total_amount,
      ts.hour, ts.quantity AS hour_quantity, ts.amount AS hour_amount
    FROM category_time_sales cts
    LEFT JOIN time_slots ts ON
      cts.store_id = ts.store_id AND
      cts.date_key = ts.date_key AND
      cts.dept_code = ts.dept_code AND
      cts.line_code = ts.line_code AND
      cts.klass_code = ts.klass_code AND
      cts.is_prev_year = ts.is_prev_year
    ${where}
    ORDER BY cts.store_id, cts.date_key,
             cts.dept_code, cts.line_code, cts.klass_code, ts.hour`
  const rows = await queryToObjects<CtsJoinRow>(conn, sql)
  return groupRowsToRecords(rows)
}

/** JOIN 結果をグループ化して CategoryTimeSalesRecord[] に変換 */
function groupRowsToRecords(rows: readonly CtsJoinRow[]): CategoryTimeSalesRecord[] {
  const records: CategoryTimeSalesRecord[] = []
  let prevKey = ''
  let timeSlots: TimeSlotEntry[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const key = `${row.storeId}|${row.year}|${row.month}|${row.day}|${row.deptCode}|${row.lineCode}|${row.klassCode}`

    if (key !== prevKey) {
      if (prevKey !== '' && i > 0) {
        pushRecord(records, rows[i - 1], timeSlots)
      }
      prevKey = key
      timeSlots = []
    }

    if (row.hour != null && row.hourQuantity != null && row.hourAmount != null) {
      timeSlots.push({ hour: row.hour, quantity: row.hourQuantity, amount: row.hourAmount })
    }
  }

  // 最後のグループ
  if (rows.length > 0) {
    pushRecord(records, rows[rows.length - 1], timeSlots)
  }

  return records
}

function pushRecord(
  out: CategoryTimeSalesRecord[],
  row: CtsJoinRow,
  timeSlots: readonly TimeSlotEntry[],
): void {
  out.push({
    year: row.year,
    month: row.month,
    day: row.day,
    storeId: row.storeId,
    department: { code: row.deptCode, name: row.deptName ?? row.deptCode },
    line: { code: row.lineCode, name: row.lineName ?? row.lineCode },
    klass: { code: row.klassCode, name: row.klassName ?? row.klassCode },
    timeSlots,
    totalQuantity: row.totalQuantity,
    totalAmount: row.totalAmount,
  })
}
