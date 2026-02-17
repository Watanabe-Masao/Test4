import { safeDivide } from './utils'
import type { StoreResult } from '../models'

/**
 * 全店集計ユーティリティ
 *
 * 金額項目: 単純合計
 * 率項目: 売上高加重平均
 */

/**
 * 複数店舗の金額を合計する
 */
export function sumStoreValues(
  stores: readonly StoreResult[],
  getter: (s: StoreResult) => number,
): number {
  return stores.reduce((sum, s) => sum + getter(s), 0)
}

/**
 * nullable な金額を合計する（全てnullなら null）
 */
export function sumNullableValues(
  stores: readonly StoreResult[],
  getter: (s: StoreResult) => number | null,
): number | null {
  let hasValue = false
  let total = 0
  for (const s of stores) {
    const v = getter(s)
    if (v != null) {
      hasValue = true
      total += v
    }
  }
  return hasValue ? total : null
}

/**
 * 売上高加重平均を計算する
 *
 * 加重平均 = Σ(store.rate × store.sales) / Σ(store.sales)
 * 分母が0の場合は 0 を返す
 */
export function weightedAverageBySales(
  stores: readonly StoreResult[],
  rateGetter: (s: StoreResult) => number,
  salesGetter: (s: StoreResult) => number,
): number {
  let weightedSum = 0
  let totalWeight = 0

  for (const s of stores) {
    const sales = salesGetter(s)
    if (sales > 0) {
      weightedSum += rateGetter(s) * sales
      totalWeight += sales
    }
  }

  return safeDivide(weightedSum, totalWeight, 0)
}
