/**
 * readDiscountFact — 値引き（売変）の唯一の分析用正本 read
 *
 * classified_sales から 71/72/73/74 を store × day × dept/line/klass 粒度で取得。
 * 時間帯データは持たない（仕様）。
 *
 * @see references/01-foundation/discount-definition.md
 *
 * @responsibility R:unclassified
 */
import type { BaseQueryInput } from '@/application/queries/QueryContract'
import {
  DiscountFactReadModel,
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

// ── pure builder ──

/**
 * buildDiscountFactReadModel — 値引き正本の pure builder。
 *
 * raw query 結果を受け取り、集約 + Zod parse して ReadModel を返す。
 */
/** @rm-id RM-004 */
export function buildDiscountFactReadModel(
  rows: readonly DiscountFactRowType[],
  dataVersion: number,
): DiscountFactReadModelType {
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

  const parsed = DiscountFactReadModel.safeParse({
    rows,
    grandTotal,
    grandTotal71,
    grandTotal72,
    grandTotal73,
    grandTotal74,
    meta: {
      usedFallback: false,
      missingPolicy: 'zero' as const,
      dataVersion,
    },
  })
  if (!parsed.success) {
    throw new Error(`[DiscountFact] Zod validation failed: ${parsed.error.message}`)
  }
  return parsed.data
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
