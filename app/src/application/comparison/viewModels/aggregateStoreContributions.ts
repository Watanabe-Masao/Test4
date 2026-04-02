/**
 * storeContributions 集約ビルダー
 *
 * StoreContribution[] から店舗別・日別の集約を行う共通ユーティリティ。
 * conditionSummary / conditionPanelYoY / conditionPanelCustomerGap で
 * 繰り返されていたフィルタ + reduce パターンを統一する。
 */
import type { StoreContribution } from '@/application/comparison/comparisonTypes'

// ── フィルタ条件 ──

interface ContributionFilter {
  readonly storeId?: string
  readonly maxDay?: number
}

function matchesFilter(c: StoreContribution, filter: ContributionFilter): boolean {
  if (filter.storeId != null && c.storeId !== filter.storeId) return false
  if (filter.maxDay != null && c.mappedDay > filter.maxDay) return false
  return true
}

// ── 集約結果 ──

export interface ContributionAggregate {
  readonly sales: number
  readonly customers: number
  readonly discount: number
  readonly ctsQuantity: number
  readonly count: number
}

const ZERO_AGGREGATE: ContributionAggregate = {
  sales: 0,
  customers: 0,
  discount: 0,
  ctsQuantity: 0,
  count: 0,
}

// ── 集約関数 ──

/**
 * storeContributions を条件でフィルタし、全フィールドを合算する。
 *
 * @param contributions 前年の店舗×日粒度データ
 * @param filter storeId / maxDay による絞り込み（両方省略で全件集約）
 */
export function aggregateContributions(
  contributions: readonly StoreContribution[],
  filter: ContributionFilter = {},
): ContributionAggregate {
  let sales = 0
  let customers = 0
  let discount = 0
  let ctsQuantity = 0
  let count = 0

  for (const c of contributions) {
    if (!matchesFilter(c, filter)) continue
    sales += c.sales
    customers += c.customers
    discount += c.discount
    ctsQuantity += c.ctsQuantity
    count++
  }

  return count > 0 ? { sales, customers, discount, ctsQuantity, count } : ZERO_AGGREGATE
}

/**
 * storeContributions を日別にインデックス化する。
 *
 * @param contributions 前年の店舗×日粒度データ
 * @param storeId 対象店舗（省略で全店舗を日別合算）
 * @returns mappedDay → 集約値のマップ
 */
export function indexContributionsByDay(
  contributions: readonly StoreContribution[],
  storeId?: string,
): ReadonlyMap<number, ContributionAggregate> {
  const map = new Map<
    number,
    { sales: number; customers: number; discount: number; ctsQuantity: number; count: number }
  >()

  for (const c of contributions) {
    if (storeId != null && c.storeId !== storeId) continue
    const existing = map.get(c.mappedDay)
    if (existing) {
      existing.sales += c.sales
      existing.customers += c.customers
      existing.discount += c.discount
      existing.ctsQuantity += c.ctsQuantity
      existing.count++
    } else {
      map.set(c.mappedDay, {
        sales: c.sales,
        customers: c.customers,
        discount: c.discount,
        ctsQuantity: c.ctsQuantity,
        count: 1,
      })
    }
  }

  return map
}

/**
 * storeContributions を店舗別に集約する。
 *
 * @param contributions 前年の店舗×日粒度データ
 * @param maxDay 経過日制限（省略で全日）
 * @returns storeId → 集約値のマップ
 */
export function indexContributionsByStore(
  contributions: readonly StoreContribution[],
  maxDay?: number,
): ReadonlyMap<string, ContributionAggregate> {
  const map = new Map<
    string,
    { sales: number; customers: number; discount: number; ctsQuantity: number; count: number }
  >()

  for (const c of contributions) {
    if (maxDay != null && c.mappedDay > maxDay) continue
    const existing = map.get(c.storeId)
    if (existing) {
      existing.sales += c.sales
      existing.customers += c.customers
      existing.discount += c.discount
      existing.ctsQuantity += c.ctsQuantity
      existing.count++
    } else {
      map.set(c.storeId, {
        sales: c.sales,
        customers: c.customers,
        discount: c.discount,
        ctsQuantity: c.ctsQuantity,
        count: 1,
      })
    }
  }

  return map
}
