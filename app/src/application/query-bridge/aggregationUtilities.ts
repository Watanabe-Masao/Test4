/**
 * 集約ユーティリティ関数群（純粋関数）
 *
 * rawAggregation から抽出。時間帯集約、期間レート、ランキング、YoY、カテゴリシェアを担う。
 */
import { safeDivide } from '@/domain/calculations/utils'

/** 時間帯集約結果 */
export interface HourlyAggregate {
  readonly hour: number
  readonly totalAmount: number
  readonly totalQuantity: number
}

/** 期間集約レート結果 */
export interface PeriodRates {
  readonly totalSales: number
  readonly totalPurchaseCost: number
  readonly totalDiscountAbsolute: number
  readonly discountRate: number
  readonly totalFlowersCost: number
  readonly totalDirectProduceCost: number
  readonly totalCostInclusionCost: number
  readonly totalCustomers: number
}

// ─── 時間帯集約 ───────────────────────────────────────

/**
 * 時間帯別の売上・数量を集約する。
 */
export function hourlyAggregate(
  records: readonly {
    readonly timeSlots: readonly {
      readonly hour: number
      readonly amount: number
      readonly quantity: number
    }[]
  }[],
): HourlyAggregate[] {
  const map = new Map<number, { amount: number; quantity: number }>()

  for (const r of records) {
    for (const slot of r.timeSlots) {
      const entry = map.get(slot.hour)
      if (entry) {
        entry.amount += slot.amount
        entry.quantity += slot.quantity
      } else {
        map.set(slot.hour, { amount: slot.amount, quantity: slot.quantity })
      }
    }
  }

  const result: HourlyAggregate[] = []
  for (const [hour, entry] of map) {
    result.push({ hour, totalAmount: entry.amount, totalQuantity: entry.quantity })
  }
  return result.sort((a, b) => a.hour - b.hour)
}

// ─── 期間集約レート ───────────────────────────────────

/**
 * 期間内の各種合計値・レートを集約する。
 */
export function aggregatePeriodRates(
  records: readonly {
    readonly sales: number
    readonly purchaseCost: number
    readonly discountAbsolute: number
    readonly flowersCost: number
    readonly directProduceCost: number
    readonly costInclusionCost: number
    readonly customers: number
  }[],
): PeriodRates {
  let totalSales = 0
  let totalPurchaseCost = 0
  let totalDiscountAbsolute = 0
  let totalFlowersCost = 0
  let totalDirectProduceCost = 0
  let totalCostInclusionCost = 0
  let totalCustomers = 0

  for (const r of records) {
    totalSales += r.sales
    totalPurchaseCost += r.purchaseCost
    totalDiscountAbsolute += r.discountAbsolute
    totalFlowersCost += r.flowersCost
    totalDirectProduceCost += r.directProduceCost
    totalCostInclusionCost += r.costInclusionCost
    totalCustomers += r.customers
  }

  return {
    totalSales,
    totalPurchaseCost,
    totalDiscountAbsolute,
    discountRate: safeDivide(totalDiscountAbsolute, totalSales, 0),
    totalFlowersCost,
    totalDirectProduceCost,
    totalCostInclusionCost,
    totalCustomers,
  }
}

// ─── ランキング ───────────────────────────────────────

/**
 * 配列を指定フィールドでランキングする。
 *
 * 同値は同じ順位（1, 1, 3 方式）。
 */
export function rankBy<T>(
  items: readonly T[],
  getValue: (item: T) => number,
): (T & { rank: number })[] {
  const sorted = [...items].sort((a, b) => getValue(b) - getValue(a))
  let currentRank = 1

  return sorted.map((item, i) => {
    if (i > 0 && getValue(sorted[i]) < getValue(sorted[i - 1])) {
      currentRank = i + 1
    }
    return { ...item, rank: currentRank }
  })
}

// ─── YoY 比較 ─────────────────────────────────────────

/** YoY マージ結果 */
export interface YoyEntry<T> {
  readonly key: string
  readonly current: T | null
  readonly previous: T | null
}

/**
 * 当期と前期のデータを FULL OUTER JOIN 相当でマージする。
 */
export function yoyMerge<T>(
  current: readonly T[],
  previous: readonly T[],
  getKey: (item: T) => string,
): YoyEntry<T>[] {
  const currentMap = new Map<string, T>()
  for (const item of current) currentMap.set(getKey(item), item)

  const previousMap = new Map<string, T>()
  for (const item of previous) previousMap.set(getKey(item), item)

  const allKeys = new Set([...currentMap.keys(), ...previousMap.keys()])

  const result: YoyEntry<T>[] = []
  for (const key of allKeys) {
    result.push({
      key,
      current: currentMap.get(key) ?? null,
      previous: previousMap.get(key) ?? null,
    })
  }

  return result.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
}

// ─── カテゴリシェア ───────────────────────────────────

/** カテゴリシェア結果 */
export interface CategoryShare {
  readonly code: string
  readonly name: string
  readonly amount: number
  readonly share: number
}

/**
 * カテゴリ別売上シェアを計算する。
 */
export function categoryShare(
  records: readonly { readonly code: string; readonly name: string; readonly amount: number }[],
): CategoryShare[] {
  const total = records.reduce((s, r) => s + r.amount, 0)
  return records.map((r) => ({
    code: r.code,
    name: r.name,
    amount: r.amount,
    share: safeDivide(r.amount, total, 0),
  }))
}
