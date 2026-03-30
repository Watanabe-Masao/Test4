/**
 * readDiscountFact — 値引き（売変）の唯一の分析用正本 read
 *
 * classified_sales から 71/72/73/74 を store × day × dept/line/klass 粒度で取得。
 * 時間帯データは持たない（仕様）。
 *
 * @see references/01-principles/discount-definition.md
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { QueryHandler, BaseQueryInput } from '@/application/queries/QueryContract'
import { queryToObjects, buildTypedWhere } from '@/infrastructure/duckdb/queryRunner'
import type { WhereCondition } from '@/infrastructure/duckdb/queryRunner'
import {
  DiscountFactReadModel,
  DiscountFactRow,
  type DiscountFactReadModel as DiscountFactReadModelType,
  type DiscountFactRow as DiscountFactRowType,
} from './DiscountFactTypes'

// ── 入力 + 出力型 ──

export interface DiscountFactInput extends BaseQueryInput {
  readonly isPrevYear?: boolean
  readonly dataVersion: number
}

export interface DiscountFactOutput {
  readonly model: DiscountFactReadModelType
}

// ── 純関数 ──

export async function readDiscountFact(
  conn: AsyncDuckDBConnection,
  input: DiscountFactInput,
): Promise<DiscountFactReadModelType> {
  const conditions: WhereCondition[] = [
    { type: 'dateRange', column: 'date_key', from: input.dateFrom, to: input.dateTo, alias: 'cs' },
    { type: 'boolean', column: 'is_prev_year', value: input.isPrevYear ?? false, alias: 'cs' },
    {
      type: 'storeIds',
      storeIds: input.storeIds ? [...input.storeIds] : undefined,
      alias: 'cs',
    },
  ]
  const where = buildTypedWhere(conditions)

  const sql = `
    SELECT
      cs.store_id,
      cs.day,
      cs.dept_code, COALESCE(cs.dept_name, cs.dept_code) AS dept_name,
      cs.line_code, COALESCE(cs.line_name, cs.line_code) AS line_name,
      cs.klass_code, COALESCE(cs.klass_name, cs.klass_code) AS klass_name,
      COALESCE(SUM(cs.discount_71), 0) AS discount_71,
      COALESCE(SUM(cs.discount_72), 0) AS discount_72,
      COALESCE(SUM(cs.discount_73), 0) AS discount_73,
      COALESCE(SUM(cs.discount_74), 0) AS discount_74,
      COALESCE(SUM(cs.discount_71 + cs.discount_72 + cs.discount_73 + cs.discount_74), 0) AS discount_total
    FROM classified_sales cs
    ${where}
    GROUP BY cs.store_id, cs.day, cs.dept_code, cs.dept_name,
             cs.line_code, cs.line_name, cs.klass_code, cs.klass_name
    ORDER BY cs.store_id, cs.day, cs.dept_code, cs.line_code, cs.klass_code`

  const rows = await queryToObjects<DiscountFactRowType>(conn, sql, DiscountFactRow)

  let grandTotal = 0
  let grandTotal71 = 0
  let grandTotal72 = 0
  let grandTotal73 = 0
  let grandTotal74 = 0
  for (const r of rows) {
    grandTotal += r.discountTotal
    grandTotal71 += r.discount71
    grandTotal72 += r.discount72
    grandTotal73 += r.discount73
    grandTotal74 += r.discount74
  }

  return DiscountFactReadModel.parse({
    rows,
    grandTotal,
    grandTotal71,
    grandTotal72,
    grandTotal73,
    grandTotal74,
    meta: {
      missingPolicy: 'zero' as const,
      dataVersion: input.dataVersion,
    },
  })
}

// ── QueryHandler ──

export const discountFactHandler: QueryHandler<DiscountFactInput, DiscountFactOutput> = {
  name: 'DiscountFact',
  async execute(
    conn: AsyncDuckDBConnection,
    input: DiscountFactInput,
  ): Promise<DiscountFactOutput> {
    const model = await readDiscountFact(conn, input)
    return { model }
  },
}

// ── 導出ヘルパー ──

/** 店舗別の売変合計 */
export function toStoreDiscountRows(model: DiscountFactReadModelType): readonly {
  storeId: string
  discountTotal: number
  discount71: number
  discount72: number
  discount73: number
  discount74: number
}[] {
  const map = new Map<
    string,
    { total: number; d71: number; d72: number; d73: number; d74: number }
  >()
  for (const r of model.rows) {
    const existing = map.get(r.storeId)
    if (existing) {
      existing.total += r.discountTotal
      existing.d71 += r.discount71
      existing.d72 += r.discount72
      existing.d73 += r.discount73
      existing.d74 += r.discount74
    } else {
      map.set(r.storeId, {
        total: r.discountTotal,
        d71: r.discount71,
        d72: r.discount72,
        d73: r.discount73,
        d74: r.discount74,
      })
    }
  }
  return Array.from(map.entries())
    .map(([storeId, v]) => ({
      storeId,
      discountTotal: v.total,
      discount71: v.d71,
      discount72: v.d72,
      discount73: v.d73,
      discount74: v.d74,
    }))
    .sort((a, b) => b.discountTotal - a.discountTotal)
}

/** 日別の売変合計 */
export function toDailyDiscountRows(model: DiscountFactReadModelType): readonly {
  day: number
  discountTotal: number
}[] {
  const map = new Map<number, number>()
  for (const r of model.rows) {
    map.set(r.day, (map.get(r.day) ?? 0) + r.discountTotal)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([day, total]) => ({ day, discountTotal: total }))
}

/** 部門別の売変合計 */
export function toDeptDiscountRows(model: DiscountFactReadModelType): readonly {
  deptCode: string
  deptName: string
  discountTotal: number
  discount71: number
  discount72: number
  discount73: number
  discount74: number
}[] {
  const map = new Map<
    string,
    { name: string; total: number; d71: number; d72: number; d73: number; d74: number }
  >()
  for (const r of model.rows) {
    const existing = map.get(r.deptCode)
    if (existing) {
      existing.total += r.discountTotal
      existing.d71 += r.discount71
      existing.d72 += r.discount72
      existing.d73 += r.discount73
      existing.d74 += r.discount74
    } else {
      map.set(r.deptCode, {
        name: r.deptName,
        total: r.discountTotal,
        d71: r.discount71,
        d72: r.discount72,
        d73: r.discount73,
        d74: r.discount74,
      })
    }
  }
  return Array.from(map.entries())
    .map(([deptCode, v]) => ({
      deptCode,
      deptName: v.name,
      discountTotal: v.total,
      discount71: v.d71,
      discount72: v.d72,
      discount73: v.d73,
      discount74: v.d74,
    }))
    .sort((a, b) => b.discountTotal - a.discountTotal)
}
