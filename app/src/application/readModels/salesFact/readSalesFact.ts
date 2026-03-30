/**
 * readSalesFact — 売上・販売点数の唯一の分析用正本 read
 *
 * category_time_sales（日別×階層）+ time_slots（時間帯）を統合し、
 * SalesFactReadModel として構築・runtime 検証する。
 *
 * この1関数から全ての分析ビューを JS 集計で導出可能:
 *   店舗別 / 日別 / 曜日別 / 時間帯別 / 階層別 / ドリルダウン
 *
 * @see references/01-principles/sales-definition.md
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { QueryHandler, BaseQueryInput } from '@/application/queries/QueryContract'
import { queryToObjects, buildTypedWhere } from '@/infrastructure/duckdb/queryRunner'
import type { WhereCondition } from '@/infrastructure/duckdb/queryRunner'
import {
  SalesFactReadModel,
  SalesFactDailyRow,
  SalesFactHourlyRow,
  type SalesFactReadModel as SalesFactReadModelType,
  type SalesFactDailyRow as SalesFactDailyRowType,
  type SalesFactHourlyRow as SalesFactHourlyRowType,
} from './SalesFactTypes'

// ── 内部クエリ ──

function buildWhere(
  dateFrom: string,
  dateTo: string,
  storeIds?: readonly string[],
  isPrevYear = false,
  alias = 'cts',
): string {
  const conditions: WhereCondition[] = [
    { type: 'dateRange', column: 'date_key', from: dateFrom, to: dateTo, alias },
    { type: 'boolean', column: 'is_prev_year', value: isPrevYear, alias },
    { type: 'storeIds', storeIds: storeIds ? [...storeIds] : undefined, alias },
  ]
  return buildTypedWhere(conditions)
}

async function queryDailyFact(
  conn: AsyncDuckDBConnection,
  dateFrom: string,
  dateTo: string,
  storeIds?: readonly string[],
  isPrevYear = false,
): Promise<readonly SalesFactDailyRowType[]> {
  const where = buildWhere(dateFrom, dateTo, storeIds, isPrevYear)
  const sql = `
    SELECT
      cts.store_id,
      cts.day,
      cts.dow,
      cts.dept_code, COALESCE(cts.dept_name, cts.dept_code) AS dept_name,
      cts.line_code, COALESCE(cts.line_name, cts.line_code) AS line_name,
      cts.klass_code, COALESCE(cts.klass_name, cts.klass_code) AS klass_name,
      COALESCE(SUM(cts.total_amount), 0) AS total_amount,
      COALESCE(SUM(cts.total_quantity), 0) AS total_quantity
    FROM category_time_sales cts
    ${where}
    GROUP BY cts.store_id, cts.day, cts.dow,
             cts.dept_code, cts.dept_name, cts.line_code, cts.line_name,
             cts.klass_code, cts.klass_name
    ORDER BY cts.store_id, cts.day, cts.dept_code, cts.line_code, cts.klass_code`
  return queryToObjects<SalesFactDailyRowType>(conn, sql, SalesFactDailyRow)
}

async function queryHourlyFact(
  conn: AsyncDuckDBConnection,
  dateFrom: string,
  dateTo: string,
  storeIds?: readonly string[],
  isPrevYear = false,
): Promise<readonly SalesFactHourlyRowType[]> {
  const where = buildWhere(dateFrom, dateTo, storeIds, isPrevYear, 'ts')
  const sql = `
    SELECT
      ts.store_id,
      ts.day,
      ts.dept_code, ts.line_code, ts.klass_code,
      ts.hour,
      COALESCE(SUM(ts.amount), 0) AS amount,
      COALESCE(SUM(ts.quantity), 0) AS quantity
    FROM time_slots ts
    ${where}
    GROUP BY ts.store_id, ts.day, ts.dept_code, ts.line_code, ts.klass_code, ts.hour
    ORDER BY ts.store_id, ts.day, ts.hour`
  return queryToObjects<SalesFactHourlyRowType>(conn, sql, SalesFactHourlyRow)
}

// ── 純関数 + QueryHandler ──

export interface SalesFactInput extends BaseQueryInput {
  readonly isPrevYear?: boolean
  readonly dataVersion: number
}

export interface SalesFactOutput {
  readonly model: SalesFactReadModelType
}

/**
 * readSalesFact — 唯一の分析用正本 read（純関数）
 */
export async function readSalesFact(
  conn: AsyncDuckDBConnection,
  input: SalesFactInput,
): Promise<SalesFactReadModelType> {
  const storeIds = input.storeIds ? [...input.storeIds] : undefined

  const [daily, hourly] = await Promise.all([
    queryDailyFact(conn, input.dateFrom, input.dateTo, storeIds, input.isPrevYear),
    queryHourlyFact(conn, input.dateFrom, input.dateTo, storeIds, input.isPrevYear),
  ])

  let grandTotalAmount = 0
  let grandTotalQuantity = 0
  for (const r of daily) {
    grandTotalAmount += r.totalAmount
    grandTotalQuantity += r.totalQuantity
  }

  return SalesFactReadModel.parse({
    daily,
    hourly,
    grandTotalAmount,
    grandTotalQuantity,
    meta: {
      missingPolicy: 'zero' as const,
      dataVersion: input.dataVersion,
    },
  })
}

/**
 * salesFactHandler — useQueryWithHandler 用の QueryHandler ラッパー
 */
export const salesFactHandler: QueryHandler<SalesFactInput, SalesFactOutput> = {
  name: 'SalesFact',
  async execute(conn: AsyncDuckDBConnection, input: SalesFactInput): Promise<SalesFactOutput> {
    const model = await readSalesFact(conn, input)
    return { model }
  },
}

// ── 導出ヘルパー ──

/** 店舗別の売上・販売点数合計 */
export function toStoreSalesRows(model: SalesFactReadModelType): readonly {
  storeId: string
  totalAmount: number
  totalQuantity: number
}[] {
  const map = new Map<string, { amount: number; quantity: number }>()
  for (const r of model.daily) {
    const existing = map.get(r.storeId)
    if (existing) {
      existing.amount += r.totalAmount
      existing.quantity += r.totalQuantity
    } else {
      map.set(r.storeId, { amount: r.totalAmount, quantity: r.totalQuantity })
    }
  }
  return Array.from(map.entries())
    .map(([storeId, { amount, quantity }]) => ({
      storeId,
      totalAmount: amount,
      totalQuantity: quantity,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
}

/** 日別の売上・販売点数合計 */
export function toDailySalesRows(model: SalesFactReadModelType): readonly {
  day: number
  totalAmount: number
  totalQuantity: number
}[] {
  const map = new Map<number, { amount: number; quantity: number }>()
  for (const r of model.daily) {
    const existing = map.get(r.day)
    if (existing) {
      existing.amount += r.totalAmount
      existing.quantity += r.totalQuantity
    } else {
      map.set(r.day, { amount: r.totalAmount, quantity: r.totalQuantity })
    }
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([day, { amount, quantity }]) => ({ day, totalAmount: amount, totalQuantity: quantity }))
}

/** 時間帯別の売上・販売点数合計 */
export function toHourlySalesRows(model: SalesFactReadModelType): readonly {
  hour: number
  totalAmount: number
  totalQuantity: number
}[] {
  const map = new Map<number, { amount: number; quantity: number }>()
  for (const r of model.hourly) {
    const existing = map.get(r.hour)
    if (existing) {
      existing.amount += r.amount
      existing.quantity += r.quantity
    } else {
      map.set(r.hour, { amount: r.amount, quantity: r.quantity })
    }
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([hour, { amount, quantity }]) => ({ hour, totalAmount: amount, totalQuantity: quantity }))
}

/** 階層別（部門レベル）の売上・販売点数合計 */
export function toDeptSalesRows(model: SalesFactReadModelType): readonly {
  deptCode: string
  deptName: string
  totalAmount: number
  totalQuantity: number
}[] {
  const map = new Map<string, { name: string; amount: number; quantity: number }>()
  for (const r of model.daily) {
    const existing = map.get(r.deptCode)
    if (existing) {
      existing.amount += r.totalAmount
      existing.quantity += r.totalQuantity
    } else {
      map.set(r.deptCode, { name: r.deptName, amount: r.totalAmount, quantity: r.totalQuantity })
    }
  }
  return Array.from(map.entries())
    .map(([deptCode, { name, amount, quantity }]) => ({
      deptCode,
      deptName: name,
      totalAmount: amount,
      totalQuantity: quantity,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
}
