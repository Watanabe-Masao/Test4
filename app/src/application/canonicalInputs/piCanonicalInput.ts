/**
 * PI値の canonical input builder
 *
 * SalesFactReadModel と CustomerFactReadModel から PI 値計算に必要な
 * 入力を構築する。粒度合わせまでここで完了させる。
 *
 * @see references/01-foundation/canonical-input-sets.md
 * @see references/01-foundation/pi-value-definition.md
 *
 * @responsibility R:unclassified
 */
import { calculateQuantityPI, calculateAmountPI } from '@/domain/calculations/piValue'
import type { SalesFactReadModel } from '@/application/readModels/salesFact'
import type { CustomerFactReadModel } from '@/application/readModels/customerFact'
import { toStoreCustomerRows } from '@/application/readModels/customerFact'

// ── 型定義 ──

export interface PIResult {
  readonly piQty: number | null
  readonly piAmount: number | null
}

export interface StorePIResult {
  readonly storeId: string
  readonly totalQuantity: number
  readonly totalAmount: number
  readonly customers: number
  readonly piQty: number | null
  readonly piAmount: number | null
}

// ── Builder ──

/**
 * 全店合計の PI 値を計算する
 *
 * grandTotal レベルで粒度を合わせて domain 計算に渡す。
 */
export function buildGrandTotalPI(
  salesFact: SalesFactReadModel,
  customerFact: CustomerFactReadModel,
): PIResult {
  const customers = customerFact.grandTotalCustomers
  if (customers === 0) return { piQty: null, piAmount: null }
  return {
    piQty: calculateQuantityPI(salesFact.grandTotalQuantity, customers),
    piAmount: calculateAmountPI(salesFact.grandTotalAmount, customers),
  }
}

/**
 * 店舗別 PI 値を計算する
 *
 * store 粒度で salesFact と customerFact を結合し、PI 値を算出する。
 */
export function buildStorePIResults(
  salesFact: SalesFactReadModel,
  customerFact: CustomerFactReadModel,
): readonly StorePIResult[] {
  const customerMap = toStoreCustomerRows(customerFact)

  // salesFact を store 粒度に集約
  const storeAgg = new Map<string, { qty: number; amt: number }>()
  for (const r of salesFact.daily) {
    const existing = storeAgg.get(r.storeId)
    if (existing) {
      existing.qty += r.totalQuantity
      existing.amt += r.totalAmount
    } else {
      storeAgg.set(r.storeId, { qty: r.totalQuantity, amt: r.totalAmount })
    }
  }

  const results: StorePIResult[] = []
  for (const [storeId, agg] of storeAgg) {
    const customers = customerMap.get(storeId) ?? 0
    results.push({
      storeId,
      totalQuantity: agg.qty,
      totalAmount: agg.amt,
      customers,
      piQty: customers > 0 ? calculateQuantityPI(agg.qty, customers) : null,
      piAmount: customers > 0 ? calculateAmountPI(agg.amt, customers) : null,
    })
  }

  return results
}
