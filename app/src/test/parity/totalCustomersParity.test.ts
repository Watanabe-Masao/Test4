/**
 * totalCustomers Parity Test — StoreResult.totalCustomers と CustomerFact.grandTotalCustomers の値一致検証
 *
 * StoreResult.totalCustomers は store_day_summary.customers の Σ を JS 側で集約した値。
 * CustomerFact.grandTotalCustomers は同じ store_day_summary.customers を DuckDB → pure builder
 * (buildCustomerFactReadModel) で集約した値。
 *
 * 同一入力（同じ日別 row セット）で同じ値を返すことをこのテストで保証する。
 * この保証があるからこそ、Presentation 層は StoreResult.totalCustomers の代わりに
 * CustomerFact.grandTotalCustomers を安全に参照できる。
 *
 * @see references/01-principles/canonical-value-ownership.md
 * @see references/01-principles/customer-definition.md
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import {
  buildCustomerFactReadModel,
  toStoreCustomerRows,
} from '@/application/readModels/customerFact'

// ── Fixtures ──

interface DailyRow {
  readonly storeId: string
  readonly day: number
  readonly customers: number
}

function makeRows(
  stores: readonly string[],
  days: number,
  customersFn: (storeId: string, day: number) => number,
): readonly DailyRow[] {
  const rows: DailyRow[] = []
  for (const storeId of stores) {
    for (let d = 1; d <= days; d++) {
      rows.push({ storeId, day: d, customers: customersFn(storeId, d) })
    }
  }
  return rows
}

/**
 * StoreResult.totalCustomers の計算を再現する。
 * JS 側の集約ロジックと同じ: Σ daily[].customers
 */
function simulateStoreResultTotalCustomers(rows: readonly DailyRow[]): number {
  return rows.reduce((sum, r) => sum + r.customers, 0)
}

/**
 * StoreResult の store 別 totalCustomers を再現する。
 * allStoreResults.get(storeId).totalCustomers と同等。
 */
function simulateStoreResultByStore(rows: readonly DailyRow[]): ReadonlyMap<string, number> {
  const map = new Map<string, number>()
  for (const r of rows) {
    map.set(r.storeId, (map.get(r.storeId) ?? 0) + r.customers)
  }
  return map
}

// ── Tests ──

describe('totalCustomers Parity — StoreResult vs CustomerFact', () => {
  const DATA_VERSION = 1

  describe('grandTotalCustomers 一致', () => {
    it('単一店舗・1日', () => {
      const rows = makeRows(['S1'], 1, () => 100)
      const storeResultTotal = simulateStoreResultTotalCustomers(rows)
      const customerFact = buildCustomerFactReadModel(rows, DATA_VERSION)

      expect(customerFact.grandTotalCustomers).toBe(storeResultTotal)
      expect(customerFact.grandTotalCustomers).toBe(100)
    })

    it('複数店舗・複数日', () => {
      const rows = makeRows(['S1', 'S2', 'S3'], 31, (storeId, day) => {
        const storeBase = storeId === 'S1' ? 50 : storeId === 'S2' ? 80 : 30
        return storeBase + day
      })
      const storeResultTotal = simulateStoreResultTotalCustomers(rows)
      const customerFact = buildCustomerFactReadModel(rows, DATA_VERSION)

      expect(customerFact.grandTotalCustomers).toBe(storeResultTotal)
    })

    it('客数 0 の日がある場合', () => {
      const rows = makeRows(['S1'], 10, (_s, day) => (day % 3 === 0 ? 0 : 42))
      const storeResultTotal = simulateStoreResultTotalCustomers(rows)
      const customerFact = buildCustomerFactReadModel(rows, DATA_VERSION)

      expect(customerFact.grandTotalCustomers).toBe(storeResultTotal)
    })

    it('空の行セット', () => {
      const rows: DailyRow[] = []
      const storeResultTotal = simulateStoreResultTotalCustomers(rows)
      const customerFact = buildCustomerFactReadModel(rows, DATA_VERSION)

      expect(customerFact.grandTotalCustomers).toBe(storeResultTotal)
      expect(customerFact.grandTotalCustomers).toBe(0)
    })
  })

  describe('store 別客数一致 (toStoreCustomerRows)', () => {
    it('複数店舗の店舗別集計が一致', () => {
      const rows = makeRows(['S1', 'S2'], 15, (storeId, day) =>
        storeId === 'S1' ? day * 10 : day * 5,
      )
      const storeResultByStore = simulateStoreResultByStore(rows)
      const customerFact = buildCustomerFactReadModel(rows, DATA_VERSION)
      const customerFactByStore = toStoreCustomerRows(customerFact)

      for (const [storeId, expected] of storeResultByStore) {
        expect(customerFactByStore.get(storeId)).toBe(expected)
      }
      expect(customerFactByStore.size).toBe(storeResultByStore.size)
    })

    it('store 別合計 = grandTotalCustomers', () => {
      const rows = makeRows(['S1', 'S2', 'S3'], 20, () => 10)
      const customerFact = buildCustomerFactReadModel(rows, DATA_VERSION)
      const customerFactByStore = toStoreCustomerRows(customerFact)

      const storeSum = [...customerFactByStore.values()].reduce((s, v) => s + v, 0)
      expect(storeSum).toBe(customerFact.grandTotalCustomers)
    })
  })
})
