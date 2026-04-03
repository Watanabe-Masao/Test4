/**
 * readSalesFact — 売上・販売点数の唯一の分析用正本 pure builder
 *
 * category_time_sales（日別×階層）+ time_slots（時間帯）を統合し、
 * SalesFactReadModel として構築・runtime 検証する。
 *
 * infra query への依存はない（handler 側で取得済みのデータを渡す）。
 *
 * @see references/01-principles/sales-definition.md
 */
import type { BaseQueryInput } from '@/application/queries/QueryContract'
import {
  SalesFactReadModel,
  type SalesFactReadModel as SalesFactReadModelType,
  type SalesFactDailyRow as SalesFactDailyRowType,
  type SalesFactHourlyRow as SalesFactHourlyRowType,
} from './SalesFactTypes'

// ── 入力 + 出力型 ──

export interface SalesFactInput extends BaseQueryInput {
  readonly isPrevYear?: boolean
  readonly dataVersion: number
}

export interface SalesFactOutput {
  readonly model: SalesFactReadModelType
}

/**
 * buildSalesFactReadModel — 唯一の分析用正本 pure builder
 *
 * raw query 結果を受け取り、集約 + Zod parse して ReadModel を返す。
 */
export function buildSalesFactReadModel(
  daily: readonly SalesFactDailyRowType[],
  hourly: readonly SalesFactHourlyRowType[],
  dataVersion: number,
): SalesFactReadModelType {
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
      usedFallback: false,
      missingPolicy: 'zero' as const,
      dataVersion,
    },
  })
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
