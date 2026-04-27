/**
 * CTS 階層・日次トレンド系クエリ
 *
 * 階層レベル別集約・カテゴリ別日次トレンド・CategoryTimeSalesRecord 互換データ取得を提供する。
 * category_time_sales テーブルを主に使用するクエリ群。
 *
 * @responsibility R:unclassified
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import { z } from 'zod'
import { queryToObjects } from '../queryRunner'
import type { CategoryTimeSalesRecord, TimeSlotEntry } from '@/domain/models/record'
import type { CtsFilterParams } from './categoryTimeSales'
import { ctsWhereClause } from './categoryTimeSales'

// ── 階層レベル別集約 ──

export interface LevelAggregationRow {
  readonly code: string
  readonly name: string
  readonly amount: number
  readonly quantity: number
  readonly childCount: number
  /** 取扱日数: total_amount > 0 の distinct 日数 */
  readonly handledDayCount: number
  /** 全日数: 期間内の distinct 日数 */
  readonly totalDayCount: number
}

export const LevelAggregationRowSchema = z.object({
  code: z.string(),
  name: z.string(),
  amount: z.number(),
  quantity: z.number(),
  childCount: z.number(),
  handledDayCount: z.number(),
  totalDayCount: z.number(),
})

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
      ${childExpr} AS child_count,
      COUNT(DISTINCT CASE WHEN cts.total_amount > 0 THEN cts.date_key END) AS handled_day_count,
      COUNT(DISTINCT cts.date_key) AS total_day_count
    FROM category_time_sales cts
    ${where}
    GROUP BY ${codeCol}, ${nameCol}
    HAVING SUM(cts.total_amount) > 0
    ORDER BY amount DESC`
  return queryToObjects<LevelAggregationRow>(conn, sql, LevelAggregationRowSchema)
}

// ── カテゴリ別日次トレンド ──

export interface CategoryDailyTrendRow {
  readonly code: string
  readonly name: string
  readonly dateKey: string
  readonly amount: number
  readonly quantity: number
}

export const CategoryDailyTrendRowSchema = z.object({
  code: z.string(),
  name: z.string(),
  dateKey: z.string(),
  amount: z.number(),
  quantity: z.number(),
})

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
  return queryToObjects<CategoryDailyTrendRow>(conn, sql, CategoryDailyTrendRowSchema)
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

const CtsJoinRowSchema = z.object({
  year: z.number(),
  month: z.number(),
  day: z.number(),
  storeId: z.string(),
  deptCode: z.string(),
  deptName: z.string().nullable(),
  lineCode: z.string(),
  lineName: z.string().nullable(),
  klassCode: z.string(),
  klassName: z.string().nullable(),
  totalQuantity: z.number(),
  totalAmount: z.number(),
  hour: z.number().nullable(),
  hourQuantity: z.number().nullable(),
  hourAmount: z.number().nullable(),
})

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
  const rows = await queryToObjects<CtsJoinRow>(conn, sql, CtsJoinRowSchema)
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
