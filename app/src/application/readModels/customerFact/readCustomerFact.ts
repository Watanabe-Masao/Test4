/**
 * readCustomerFact — 客数の唯一の分析用正本 pure builder
 *
 * store_day_summary.customers（flowers JOIN 済み）を構築・runtime 検証する。
 * infra query への依存はない（handler 側で取得済みのデータを渡す）。
 *
 * @see references/01-principles/customer-definition.md
 * @see references/01-principles/canonical-input-sets.md
 */
import type { BaseQueryInput } from '@/application/queries/QueryContract'
import type { QueryHandler } from '@/application/queries/QueryContract'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import {
  queryCustomerDaily,
  type CustomerDailyRow,
} from '@/infrastructure/duckdb/queries/storeDaySummary'
import {
  CustomerFactReadModel,
  type CustomerFactReadModel as CustomerFactReadModelType,
  type CustomerFactDailyRow as CustomerFactDailyRowType,
} from './CustomerFactTypes'

// ── 入力 + 出力型 ──

export interface CustomerFactInput extends BaseQueryInput {
  readonly isPrevYear?: boolean
  readonly dataVersion: number
}

export interface CustomerFactOutput {
  readonly model: CustomerFactReadModelType
}

// ── Pure Builder ──

/**
 * buildCustomerFactReadModel — 唯一の分析用正本 pure builder
 *
 * raw query 結果を受け取り、集約 + Zod parse して ReadModel を返す。
 */
export function buildCustomerFactReadModel(
  rows: readonly CustomerDailyRow[],
  dataVersion: number,
): CustomerFactReadModelType {
  let grandTotalCustomers = 0
  const daily: CustomerFactDailyRowType[] = []

  for (const r of rows) {
    const customers = r.customers ?? 0
    daily.push({ storeId: r.storeId, day: r.day, customers })
    grandTotalCustomers += customers
  }

  return CustomerFactReadModel.parse({
    daily,
    grandTotalCustomers,
    meta: {
      usedFallback: false,
      missingPolicy: 'zero',
      dataVersion,
    },
  })
}

// ── QueryHandler ──

export const customerFactHandler: QueryHandler<CustomerFactInput, CustomerFactOutput> = {
  name: 'CustomerFact',
  async execute(
    conn: AsyncDuckDBConnection,
    input: CustomerFactInput,
  ): Promise<CustomerFactOutput> {
    const rows = await queryCustomerDaily(conn, input)
    const model = buildCustomerFactReadModel(rows, input.dataVersion)
    return { model }
  },
}

// ── 導出 Helper ──

/** 店舗別客数集約 */
export function toStoreCustomerRows(model: CustomerFactReadModelType): ReadonlyMap<string, number> {
  const map = new Map<string, number>()
  for (const r of model.daily) {
    map.set(r.storeId, (map.get(r.storeId) ?? 0) + r.customers)
  }
  return map
}

/** 日別客数集約 */
export function toDailyCustomerRows(model: CustomerFactReadModelType): ReadonlyMap<number, number> {
  const map = new Map<number, number>()
  for (const r of model.daily) {
    map.set(r.day, (map.get(r.day) ?? 0) + r.customers)
  }
  return map
}

/** 店舗×日別客数（PI handler 入力用） */
export function toStoreDayCustomerRows(
  model: CustomerFactReadModelType,
): ReadonlyMap<string, number> {
  const map = new Map<string, number>()
  for (const r of model.daily) {
    const key = `${r.storeId}:${r.day}`
    map.set(key, (map.get(key) ?? 0) + r.customers)
  }
  return map
}
